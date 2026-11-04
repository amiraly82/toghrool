<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/webpush.php';

// Helper to get JSON input
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true) ?? [];
$action = $_GET['action'] ?? $input['action'] ?? '';

// ----------------------------------------------------
// HELPER FUNCTIONS & SECURITY INFRASTRUCTURE
// ----------------------------------------------------

// Generate cryptographically secure random unique ID string
function generateId($prefix = '') {
    return $prefix . bin2hex(random_bytes(10));
}

// 8-character couple code from 32-char alphabet (excluding O/0, I/1)
function generateCoupleCode() {
    $alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    $len = strlen($alphabet);
    $code = '';
    for ($i = 0; $i < 8; $i++) {
        $code .= $alphabet[random_int(0, $len - 1)];
    }
    return $code;
}

// Extract client IP safely
function getClientIp() {
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    if (strpos($ip, ',') !== false) {
        $parts = explode(',', $ip);
        $ip = trim($parts[0]);
    }
    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '127.0.0.1';
}

// Rate Limiting helper: checks if currently blocked
function checkRateLimitGate($pdo, $key, $action, $maxAttempts = 5, $windowSeconds = 900) {
    $stmt = $pdo->prepare("SELECT * FROM rate_limits WHERE rate_key = ? AND action = ?");
    $stmt->execute([$key, $action]);
    $row = $stmt->fetch();
    if ($row) {
        $nowTs = time();
        if (!empty($row['blocked_until']) && strtotime($row['blocked_until']) > $nowTs) {
            http_response_code(429);
            echo json_encode([
                'status' => 'error',
                'message' => 'تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً پس از ۱۵ دقیقه دوباره امتحان کنید.'
            ]);
            exit();
        }
    }
}

// Rate Limiting helper: records failure and blocks after max attempts
function recordRateLimitFailure($pdo, $key, $action, $maxAttempts = 5, $windowSeconds = 900) {
    $now = date('Y-m-d H:i:s');
    $nowTs = time();
    $stmt = $pdo->prepare("SELECT * FROM rate_limits WHERE rate_key = ? AND action = ?");
    $stmt->execute([$key, $action]);
    $row = $stmt->fetch();

    if ($row) {
        $firstAttemptTs = strtotime($row['first_attempt']);
        if (($nowTs - $firstAttemptTs) > $windowSeconds) {
            // Window expired, reset to 1
            $u = $pdo->prepare("UPDATE rate_limits SET attempts = 1, first_attempt = ?, last_attempt = ?, blocked_until = NULL WHERE id = ?");
            $u->execute([$now, $now, $row['id']]);
        } else {
            $newAttempts = (int)$row['attempts'] + 1;
            $blockedUntil = null;
            if ($newAttempts >= $maxAttempts) {
                $blockedUntil = date('Y-m-d H:i:s', $nowTs + $windowSeconds);
            }
            $u = $pdo->prepare("UPDATE rate_limits SET attempts = ?, last_attempt = ?, blocked_until = ? WHERE id = ?");
            $u->execute([$newAttempts, $now, $blockedUntil, $row['id']]);
        }
    } else {
        $ins = $pdo->prepare("INSERT INTO rate_limits (rate_key, action, attempts, first_attempt, last_attempt) VALUES (?, ?, 1, ?, ?)");
        $ins->execute([$key, $action, $now, $now]);
    }
}

// Rate Limiting helper: resets counters on success
function resetRateLimit($pdo, $key, $action) {
    $stmt = $pdo->prepare("DELETE FROM rate_limits WHERE rate_key = ? AND action = ?");
    $stmt->execute([$key, $action]);
}

// Extract token from Authorization or X-Auth-Token headers
function getBearerToken() {
    // 1. Authorization: Bearer <token>
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!$authHeader && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    if ($authHeader && preg_match('/Bearer\s+([a-f0-9]{64})/i', $authHeader, $matches)) {
        return $matches[1];
    }

    // 2. X-Auth-Token fallback (essential on cPanel servers stripping Authorization)
    $xToken = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
    if (!$xToken && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $xToken = $headers['X-Auth-Token'] ?? $headers['x-auth-token'] ?? '';
    }
    if ($xToken && preg_match('/^[a-f0-9]{64}$/i', trim($xToken))) {
        return trim($xToken);
    }

    return null;
}

// Authenticate current user via sliding 30-day token
function currentUser($pdo) {
    static $cachedUser = null;
    static $evaluated = false;
    if ($evaluated) {
        return $cachedUser;
    }
    $evaluated = true;

    $rawToken = getBearerToken();
    if (!$rawToken) {
        return null;
    }

    $tokenHash = hash('sha256', $rawToken);
    $stmt = $pdo->prepare("SELECT * FROM auth_tokens WHERE token_hash = ? AND expiresAt > NOW()");
    $stmt->execute([$tokenHash]);
    $tokenRow = $stmt->fetch();

    if (!$tokenRow) {
        return null;
    }

    // Sliding expiration: extend for 30 more days on activity
    $uStmt = $pdo->prepare("UPDATE auth_tokens SET lastUsedAt = NOW(), expiresAt = DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE token_hash = ?");
    $uStmt->execute([$tokenHash]);

    $uStmt = $pdo->prepare("SELECT * FROM users WHERE uid = ?");
    $uStmt->execute([$tokenRow['uid']]);
    $user = $uStmt->fetch();

    if ($user) {
        unset($user['passwordHash']);
        $cachedUser = $user;
        return $cachedUser;
    }

    return null;
}

// Enforce valid user session
function requireAuth($pdo) {
    $user = currentUser($pdo);
    if (!$user) {
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'code' => 'UNAUTHORIZED',
            'message' => 'نشست شما معتبر نیست یا منقضی شده است. لطفاً وارد شوید.'
        ]);
        exit();
    }
    sanitizeUserForResponse($user);
    return $user;
}

// Sanitize user object for JSON client responses
function sanitizeUserForResponse(&$user) {
    if (!$user) return;
    unset($user['passwordHash']);
    $user['onboardingCompleted'] = !empty($user['onboardingCompleted']);
    if (!empty($user['onboardingHealthData']) && is_string($user['onboardingHealthData'])) {
        $decoded = json_decode($user['onboardingHealthData'], true);
        if ($decoded !== null) {
            $user['onboardingHealthData'] = $decoded;
        }
    }
    if (!empty($user['cheatSheet']) && is_string($user['cheatSheet'])) {
        $decodedCheat = json_decode($user['cheatSheet'], true);
        if ($decodedCheat !== null) {
            $user['cheatSheet'] = $decodedCheat;
        }
    }
    $user['spaceMode'] = !empty($user['spaceMode']);
}

// Automatically ensure users table has onboarding & gender columns
function ensureUserSchema($pdo) {
    static $checked = false;
    if ($checked) return;
    $checked = true;

    try {
        $colsStmt = $pdo->query("SHOW COLUMNS FROM `users`");
        $existingCols = $colsStmt ? $colsStmt->fetchAll(PDO::FETCH_COLUMN) : [];

        if (!in_array('gender', $existingCols, true)) {
            $pdo->exec("ALTER TABLE `users` ADD COLUMN `gender` varchar(16) DEFAULT 'female'");
        }
        if (!in_array('onboardingCompleted', $existingCols, true)) {
            $pdo->exec("ALTER TABLE `users` ADD COLUMN `onboardingCompleted` tinyint(1) NOT NULL DEFAULT 0");
        }
        if (!in_array('onboardingHealthData', $existingCols, true)) {
            $pdo->exec("ALTER TABLE `users` ADD COLUMN `onboardingHealthData` json DEFAULT NULL");
        }
    } catch (Exception $e) {
        error_log("User schema check notice: " . $e->getMessage());
    }
}

// Automatically ensure email OTP table exists
function ensureOtpSchema($pdo) {
    static $checked = false;
    if ($checked) return;
    $checked = true;

    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `email_otps` (
              `id` INT AUTO_INCREMENT PRIMARY KEY,
              `email` VARCHAR(255) NOT NULL,
              `otp_code` VARCHAR(16) NOT NULL,
              `type` VARCHAR(32) NOT NULL,
              `payload` LONGTEXT DEFAULT NULL,
              `attempts` INT NOT NULL DEFAULT 0,
              `expiresAt` DATETIME NOT NULL,
              `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              INDEX `idx_email_type` (`email`, `type`),
              INDEX `idx_expires` (`expiresAt`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    } catch (Exception $e) {
        error_log("OTP schema check notice: " . $e->getMessage());
    }
}

// Persian Responsive HTML Email Template matching Toghrool brand
function buildToghroolEmailTemplate($title, $heading, $bodyText, $otpCode) {
    $persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    $latinDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    $persianOtp = str_replace($latinDigits, $persianDigits, $otpCode);

    return '<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</title>
</head>
<body style="margin: 0; padding: 28px 14px; background-color: #FAF6EC; font-family: Tahoma, -apple-system, sans-serif; direction: rtl; text-align: right; color: #1B1B1A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; margin: 0 auto; background: #FFFDF8; border-radius: 28px; border: 1px solid #E8E2D4; overflow: hidden; box-shadow: 0 10px 30px rgba(27,27,26,0.05);">
    <tr>
      <td style="background: linear-gradient(135deg, #F6C3E5 0%, #EC407A 100%); padding: 30px 24px; text-align: center;">
        <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">طغرل | Toghrool</h1>
        <p style="margin: 6px 0 0; color: rgba(255,255,255,0.92); font-size: 13px;">همراه صمیمی لحظه‌ها و سلامت زوجین</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px 26px;">
        <h2 style="margin: 0 0 12px; font-size: 17px; color: #1B1B1A; font-weight: bold;">' . htmlspecialchars($heading, ENT_QUOTES, 'UTF-8') . '</h2>
        <p style="margin: 0 0 20px; font-size: 13px; line-height: 1.8; color: #78746B;">' . htmlspecialchars($bodyText, ENT_QUOTES, 'UTF-8') . '</p>
        
        <div style="background: #FAF6EC; border: 2px dashed #E8E2D4; border-radius: 20px; padding: 20px 14px; text-align: center; margin: 24px 0;">
          <span style="display: block; font-size: 12px; font-weight: bold; color: #78746B; margin-bottom: 8px;">کد تایید یک‌بار مصرف شما:</span>
          <span style="display: inline-block; font-size: 34px; font-weight: 900; letter-spacing: 12px; color: #1B1B1A; font-family: monospace, sans-serif; direction: ltr;">' . htmlspecialchars($otpCode, ENT_QUOTES, 'UTF-8') . '</span>
          <span style="display: block; font-size: 16px; font-weight: bold; color: #EC407A; margin-top: 6px;">(' . $persianOtp . ')</span>
        </div>

        <p style="margin: 0 0 10px; font-size: 12px; color: #9E9A8F; text-align: center;">این کد تا ۱۰ دقیقه دیگر معتبر است.</p>
        <p style="margin: 20px 0 0; font-size: 11px; color: #B5B0A4; border-top: 1px solid #F0EBE0; padding-top: 16px; line-height: 1.6; text-align: justify;">
          اگر شما این درخواست را در اپلیکیشن طغرل ثبت نکرده‌اید، این پیام را نادیده بگیرید. امنیت حساب و اطلاعات شما برای ما در اولویت است.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>';
}

// Deliver UTF-8 HTML Email via Mizbanfa Dedicated Mail Server (mail.mizbanfalocal.com:587)
function sendToghroolEmail($toEmail, $subject, $htmlContent) {
    $senderName = "طغرل | Toghrool";
    $fromEmail = "toghrool@amiralyeasy.ir";
    $smtpHost = "mail.mizbanfalocal.com";
    $smtpPort = 587;
    $smtpUser = "toghrool@amiralyeasy.ir";
    $smtpPass = '$6*4#AqC$Aq5Gb';

    $fp = @fsockopen($smtpHost, $smtpPort, $errno, $errstr, 8);
    if (!$fp) {
        error_log("Dedicated SMTP connection error ($errno): $errstr");
        return false;
    }

    $read = function() use ($fp) {
        $res = '';
        stream_set_timeout($fp, 6);
        while ($line = fgets($fp, 512)) {
            $res .= $line;
            if (isset($line[3]) && $line[3] === ' ') break;
        }
        return $res;
    };
    $write = function($cmd) use ($fp) {
        fwrite($fp, $cmd . "\r\n");
    };

    $read();
    $write('EHLO amiralyeasy.ir');
    $read();

    // Authenticate with dedicated Mizbanfa mail credentials
    $write('AUTH LOGIN');
    $read();
    $write(base64_encode($smtpUser));
    $read();
    $write(base64_encode($smtpPass));
    $authRes = $read();

    if (strpos($authRes, '235') === false) {
        error_log("Dedicated SMTP AUTH failed: " . trim($authRes));
        $write('QUIT');
        fclose($fp);
        return false;
    }

    $write("MAIL FROM:<{$fromEmail}>");
    $read();
    $write("RCPT TO:<{$toEmail}>");
    $rcptRes = $read();

    if (strpos($rcptRes, '250') === false) {
        $write('QUIT');
        fclose($fp);
        error_log("Dedicated SMTP RCPT rejected: " . trim($rcptRes));
        return false;
    }

    $write('DATA');
    $read();

    $encodedSubject = "=?UTF-8?B?" . base64_encode($subject) . "?=";
    $encodedSender = "=?UTF-8?B?" . base64_encode($senderName) . "?=";

    $headers = [
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=UTF-8",
        "From: {$encodedSender} <{$fromEmail}>",
        "Reply-To: {$fromEmail}",
        "To: <{$toEmail}>",
        "Date: " . date("r"),
        "Subject: {$encodedSubject}",
        "X-Mailer: Toghrool-Mail/2.0"
    ];

    $msg = implode("\r\n", $headers) . "\r\n\r\n" . $htmlContent . "\r\n.\r\n";
    fwrite($fp, $msg);
    $dataRes = $read();
    $write('QUIT');
    $read();
    fclose($fp);

    $success = (strpos($dataRes, '250') !== false);
    if (!$success) {
        error_log("Dedicated SMTP DATA failed: " . trim($dataRes));
    }
    return $success;
}

// Automatically ensure period tracker tables and columns exist (self-healing migration)
function ensurePeriodSchema($pdo) {
    static $checked = false;
    if ($checked) return;
    $checked = true;

    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `couple_period_settings` (
              `coupleId` varchar(128) NOT NULL,
              `trackerOwnerUid` varchar(64) DEFAULT NULL,
              `cycleLength` int(11) DEFAULT 28,
              `periodLength` int(11) DEFAULT 5,
              `lastPeriodStartDate` varchar(32) DEFAULT NULL,
              `goalMode` varchar(32) DEFAULT 'track',
              `birthDate` varchar(32) DEFAULT '2000-01-01',
              `viewMode` varchar(32) DEFAULT 'circular',
              `updatedBy` varchar(64) DEFAULT NULL,
              `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              PRIMARY KEY (`coupleId`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        $colsStmt = $pdo->query("SHOW COLUMNS FROM `couple_period_settings`");
        $existingCols = $colsStmt ? $colsStmt->fetchAll(PDO::FETCH_COLUMN) : [];

        if (!in_array('trackerOwnerUid', $existingCols, true)) {
            $pdo->exec("ALTER TABLE `couple_period_settings` ADD COLUMN `trackerOwnerUid` varchar(64) DEFAULT NULL");
        }
        if (!in_array('birthDate', $existingCols, true)) {
            $pdo->exec("ALTER TABLE `couple_period_settings` ADD COLUMN `birthDate` varchar(32) DEFAULT '2000-01-01'");
        }
        if (!in_array('goalMode', $existingCols, true)) {
            $pdo->exec("ALTER TABLE `couple_period_settings` ADD COLUMN `goalMode` varchar(32) DEFAULT 'track'");
        }
        if (!in_array('viewMode', $existingCols, true)) {
            $pdo->exec("ALTER TABLE `couple_period_settings` ADD COLUMN `viewMode` varchar(32) DEFAULT 'circular'");
        }
        if (!in_array('updatedBy', $existingCols, true)) {
            $pdo->exec("ALTER TABLE `couple_period_settings` ADD COLUMN `updatedBy` varchar(64) DEFAULT NULL");
        }

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `period_sharing` (
              `coupleId` varchar(128) NOT NULL,
              `ownerUid` varchar(64) NOT NULL,
              `sharePhase` tinyint(1) NOT NULL DEFAULT 1,
              `shareNextPeriod` tinyint(1) NOT NULL DEFAULT 1,
              `shareFertileWindow` tinyint(1) NOT NULL DEFAULT 0,
              `shareFlow` tinyint(1) NOT NULL DEFAULT 0,
              `shareMood` tinyint(1) NOT NULL DEFAULT 0,
              `shareSymptoms` tinyint(1) NOT NULL DEFAULT 0,
              `shareSex` tinyint(1) NOT NULL DEFAULT 0,
              `shareTests` tinyint(1) NOT NULL DEFAULT 0,
              `shareNotes` tinyint(1) NOT NULL DEFAULT 0,
              `allowPartnerLogging` tinyint(1) NOT NULL DEFAULT 0,
              `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              PRIMARY KEY (`coupleId`),
              KEY `idx_owner` (`ownerUid`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        $logColsStmt = $pdo->query("SHOW COLUMNS FROM `couple_period_logs`");
        $existingLogCols = $logColsStmt ? $logColsStmt->fetchAll(PDO::FETCH_COLUMN) : [];
        if (!empty($existingLogCols) && !in_array('sharePregnancyTestWithPartner', $existingLogCols, true)) {
            $pdo->exec("ALTER TABLE `couple_period_logs` ADD COLUMN `sharePregnancyTestWithPartner` tinyint(1) NOT NULL DEFAULT 0");
        }
    } catch (Exception $e) {
        error_log("Period schema check notice: " . $e->getMessage());
    }
}

function ensureMemoriesSchema($pdo) {
    static $checked = false;
    if ($checked) return;
    $checked = true;

    try {
        $colsStmt = $pdo->query("SHOW COLUMNS FROM `memories`");
        $existingCols = $colsStmt ? $colsStmt->fetchAll(PDO::FETCH_COLUMN) : [];
        if (!empty($existingCols) && !in_array('rawImageUrl', $existingCols, true)) {
            $pdo->exec("ALTER TABLE `memories` ADD COLUMN `rawImageUrl` LONGTEXT DEFAULT NULL");
        }
    } catch (Exception $e) {
        error_log("Memories schema check notice: " . $e->getMessage());
    }
}

function ensurePhase1Schema($pdo) {
    static $checked = false;
    if ($checked) return;
    $checked = true;

    try {
        $uColsStmt = $pdo->query("SHOW COLUMNS FROM `users`");
        $uCols = $uColsStmt ? $uColsStmt->fetchAll(PDO::FETCH_COLUMN) : [];
        if (!in_array('batteryLevel', $uCols, true)) {
            $pdo->exec("ALTER TABLE `users` ADD COLUMN `batteryLevel` INT DEFAULT 80");
        }
        if (!in_array('needStatus', $uCols, true)) {
            $pdo->exec("ALTER TABLE `users` ADD COLUMN `needStatus` VARCHAR(128) DEFAULT 'calm'");
        }
        if (!in_array('needUpdatedAt', $uCols, true)) {
            $pdo->exec("ALTER TABLE `users` ADD COLUMN `needUpdatedAt` INT DEFAULT NULL");
        }

        $wColsStmt = $pdo->query("SHOW COLUMNS FROM `wishlist`");
        $wCols = $wColsStmt ? $wColsStmt->fetchAll(PDO::FETCH_COLUMN) : [];
        if (!in_array('budget', $wCols, true)) {
            $pdo->exec("ALTER TABLE `wishlist` ADD COLUMN `budget` VARCHAR(32) DEFAULT 'medium'");
        }
    } catch (Exception $e) {
        error_log("Phase1 schema check notice: " . $e->getMessage());
    }
}

function ensurePhase2Schema($pdo) {
    static $checked = false;
    if ($checked) return;
    $checked = true;

    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `daily_answers` (
            `id` VARCHAR(64) PRIMARY KEY,
            `coupleId` VARCHAR(128) NOT NULL,
            `questionId` INT NOT NULL,
            `questionDate` VARCHAR(32) NOT NULL,
            `user1Uid` VARCHAR(64) NOT NULL,
            `user1Answer` TEXT DEFAULT NULL,
            `user1AnsweredAt` BIGINT DEFAULT NULL,
            `user2Uid` VARCHAR(64) DEFAULT NULL,
            `user2Answer` TEXT DEFAULT NULL,
            `user2AnsweredAt` BIGINT DEFAULT NULL,
            `isRevealed` TINYINT(1) DEFAULT 0,
            `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY `uniq_couple_qdate` (`coupleId`, `questionDate`),
            INDEX `idx_couple` (`coupleId`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $mColsStmt = $pdo->query("SHOW COLUMNS FROM `memories`");
        $mCols = $mColsStmt ? $mColsStmt->fetchAll(PDO::FETCH_COLUMN) : [];
        if (!in_array('isTimeCapsule', $mCols, true)) {
            $pdo->exec("ALTER TABLE `memories` ADD COLUMN `isTimeCapsule` TINYINT(1) DEFAULT 0");
        }
        if (!in_array('unlockDate', $mCols, true)) {
            $pdo->exec("ALTER TABLE `memories` ADD COLUMN `unlockDate` VARCHAR(32) DEFAULT NULL");
        }

        $uColsStmt = $pdo->query("SHOW COLUMNS FROM `users`");
        $uCols = $uColsStmt ? $uColsStmt->fetchAll(PDO::FETCH_COLUMN) : [];
        if (!in_array('cheatSheet', $uCols, true)) {
            $pdo->exec("ALTER TABLE `users` ADD COLUMN `cheatSheet` TEXT DEFAULT NULL");
        }
        if (!in_array('spaceMode', $uCols, true)) {
            $pdo->exec("ALTER TABLE `users` ADD COLUMN `spaceMode` TINYINT(1) DEFAULT 0");
        }
        if (!in_array('spaceModeUntil', $uCols, true)) {
            $pdo->exec("ALTER TABLE `users` ADD COLUMN `spaceModeUntil` BIGINT DEFAULT NULL");
        }
    } catch (Exception $e) {
        error_log("Phase2 schema check notice: " . $e->getMessage());
    }
}

function requirePeriodTarget($pdo) {
    global $input;
    ensurePeriodSchema($pdo);
    $user = requireAuth($pdo);
    $targetId = !empty($user['coupleId']) ? $user['coupleId'] : $user['uid'];

    $requestedCoupleId = trim($_GET['coupleId'] ?? $input['coupleId'] ?? '');
    if ($requestedCoupleId !== '' && !empty($user['coupleId']) && $requestedCoupleId !== $user['coupleId']) {
        http_response_code(403);
        echo json_encode([
            'status' => 'error',
            'code' => 'FORBIDDEN_COUPLE',
            'message' => 'شما دسترسی به اطلاعات زوج دیگر را ندارید.'
        ]);
        exit();
    }

    return [$user, $targetId];
}

// Enforce paired couple membership (supports solo mode fallback to uid)
function requireCoupleMember($pdo) {
    global $input;
    $user = requireAuth($pdo);
    $targetCoupleId = !empty($user['coupleId']) ? $user['coupleId'] : $user['uid'];

    // Verify client did not attempt to forge another couple's ID
    $requestedCoupleId = trim($_GET['coupleId'] ?? $input['coupleId'] ?? '');
    if ($requestedCoupleId !== '' && $requestedCoupleId !== $targetCoupleId && !empty($user['coupleId']) && $requestedCoupleId !== $user['coupleId']) {
        http_response_code(403);
        echo json_encode([
            'status' => 'error',
            'code' => 'FORBIDDEN_COUPLE',
            'message' => 'شما دسترسی به اطلاعات زوج دیگر را ندارید.'
        ]);
        exit();
    }

    $user['coupleId'] = $targetCoupleId;
    return $user;
}

// ----------------------------------------------------
// API ACTIONS ROUTING
// ----------------------------------------------------

switch ($action) {
    // ----------------------------------------------------
    // AUTHENTICATION & SESSIONS
    // ----------------------------------------------------
    case 'send_signup_otp':
        ensureOtpSchema($pdo);
        ensureUserSchema($pdo);

        $email = strtolower(trim($input['email'] ?? ''));
        $password = (string)($input['password'] ?? '');
        $displayName = trim($input['displayName'] ?? '');
        $gender = trim($input['gender'] ?? 'female');
        if (!in_array($gender, ['female', 'male'], true)) {
            $gender = 'female';
        }

        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'لطفاً یک آدرس ایمیل معتبر وارد کنید.']);
            exit();
        }

        if (!$displayName) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'لطفاً نام یا لقب خود را وارد کنید.']);
            exit();
        }

        if (strlen($password) < 6) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'رمز عبور باید حداقل ۶ کاراکتر باشد.']);
            exit();
        }

        // Check if email already registered
        $stmt = $pdo->prepare("SELECT uid FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['status' => 'error', 'message' => 'این ایمیل قبلاً ثبت‌نام کرده است. لطفاً وارد شوید.']);
            exit();
        }

        // Rate-limit: 5 OTP sends per 10 minutes per IP/email
        $clientIp = getClientIp();
        $rateKey = md5($clientIp . '|' . $email);
        checkRateLimitGate($pdo, $rateKey, 'otp_signup', 5, 600);

        // Generate 5-digit numeric OTP code
        $otpCode = (string)random_int(10000, 99999);
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $payload = json_encode([
            'displayName' => $displayName,
            'passwordHash' => $passwordHash,
            'gender' => $gender
        ], JSON_UNESCAPED_UNICODE);

        // Delete any previous pending signup OTPs for this email
        $delStmt = $pdo->prepare("DELETE FROM email_otps WHERE email = ? AND type = 'signup'");
        $delStmt->execute([$email]);

        // Insert new OTP with 10 minutes expiry
        $insStmt = $pdo->prepare("INSERT INTO email_otps (email, otp_code, type, payload, attempts, expiresAt) VALUES (?, ?, 'signup', ?, 0, DATE_ADD(NOW(), INTERVAL 10 MINUTE))");
        $insStmt->execute([$email, $otpCode, $payload]);

        // Send email with brand template
        $subject = "کد تایید ثبت‌نام طغرل: {$otpCode}";
        $html = buildToghroolEmailTemplate(
            "کد تایید ثبت‌نام",
            "{$displayName} عزیز، خوش آمدید!",
            "برای تایید هویت و تکمیل ثبت‌نام حساب خود در اپلیکیشن طغرل، کد تایید زیر را در برنامه وارد کنید:",
            $otpCode
        );

        $sent = sendToghroolEmail($email, $subject, $html);
        if (!$sent) {
            error_log("Failed to send signup OTP email to {$email}");
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => 'خطا در ارسال ایمیل تایید. لطفاً آدرس ایمیل را بررسی کرده و چند دقیقه دیگر تلاش کنید.'
            ]);
            exit();
        }

        recordRateLimitFailure($pdo, $rateKey, 'otp_signup', 5, 600);

        echo json_encode([
            'status' => 'success',
            'message' => "کد تایید ۵ رقمی به ایمیل {$email} ارسال شد.",
            'email' => $email
        ]);
        break;

    case 'verify_signup_otp':
        ensureOtpSchema($pdo);
        ensureUserSchema($pdo);

        $email = strtolower(trim($input['email'] ?? ''));
        $otpCode = trim((string)($input['otp_code'] ?? ''));

        if (!$email || !$otpCode) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'لطفاً ایمیل و کد تایید را وارد کنید.']);
            exit();
        }

        // Look for active OTP
        $stmt = $pdo->prepare("SELECT * FROM email_otps WHERE email = ? AND type = 'signup' AND expiresAt > NOW() ORDER BY id DESC LIMIT 1");
        $stmt->execute([$email]);
        $otpRow = $stmt->fetch();

        if (!$otpRow) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'کد تایید منقضی شده یا درخواستی یافت نشد. لطفاً کد جدید دریافت کنید.']);
            exit();
        }

        if ($otpRow['attempts'] >= 5) {
            $del = $pdo->prepare("DELETE FROM email_otps WHERE id = ?");
            $del->execute([$otpRow['id']]);
            http_response_code(429);
            echo json_encode(['status' => 'error', 'message' => 'تعداد دفعات اشتباه بیش از حد مجاز بود. لطفاً کد جدید دریافت کنید.']);
            exit();
        }

        if (trim($otpRow['otp_code']) !== $otpCode) {
            $up = $pdo->prepare("UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?");
            $up->execute([$otpRow['id']]);
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'کد تایید وارد شده نادرست است.']);
            exit();
        }

        // Valid code! Extract payload and create account
        $payload = json_decode($otpRow['payload'] ?? '{}', true) ?: [];
        $displayName = $payload['displayName'] ?? 'کاربر طغرل';
        $passwordHash = $payload['passwordHash'] ?? '';
        $gender = $payload['gender'] ?? 'female';
        $onboardingCompleted = ($gender === 'male') ? 1 : 0;

        // Check if email already exists
        $cStmt = $pdo->prepare("SELECT uid FROM users WHERE email = ?");
        $cStmt->execute([$email]);
        if ($cStmt->fetch()) {
            http_response_code(409);
            echo json_encode(['status' => 'error', 'message' => 'این ایمیل قبلاً ثبت‌نام کرده است.']);
            exit();
        }

        $uid = generateId('usr_');
        $coupleCode = generateCoupleCode();

        $iStmt = $pdo->prepare("INSERT INTO users (uid, email, displayName, coupleCode, passwordHash, gender, onboardingCompleted) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $iStmt->execute([$uid, $email, $displayName, $coupleCode, $passwordHash, $gender, $onboardingCompleted]);

        // Clean up used OTP
        $del = $pdo->prepare("DELETE FROM email_otps WHERE email = ? AND type = 'signup'");
        $del->execute([$email]);

        // Issue auth token
        $rawToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);
        $tStmt = $pdo->prepare("INSERT INTO auth_tokens (token_hash, uid, createdAt, expiresAt, lastUsedAt) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())");
        $tStmt->execute([$tokenHash, $uid]);

        $uStmt = $pdo->prepare("SELECT * FROM users WHERE uid = ?");
        $uStmt->execute([$uid]);
        $user = $uStmt->fetch();
        sanitizeUserForResponse($user);

        echo json_encode([
            'status' => 'success',
            'message' => 'حساب کاربری شما با موفقیت ایجاد شد.',
            'token' => $rawToken,
            'user' => $user
        ]);
        break;

    case 'send_forgot_otp':
        ensureOtpSchema($pdo);
        $email = strtolower(trim($input['email'] ?? ''));

        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'لطفاً یک آدرس ایمیل معتبر وارد کنید.']);
            exit();
        }

        // Check if user exists
        $stmt = $pdo->prepare("SELECT uid, displayName FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'کاربری با این ایمیل در سامانه طغرل یافت نشد.']);
            exit();
        }

        // Rate-limit: 5 forgot requests per 10 minutes
        $clientIp = getClientIp();
        $rateKey = md5($clientIp . '|' . $email);
        checkRateLimitGate($pdo, $rateKey, 'otp_forgot', 5, 600);

        $otpCode = (string)random_int(10000, 99999);

        $delStmt = $pdo->prepare("DELETE FROM email_otps WHERE email = ? AND type = 'forgot_password'");
        $delStmt->execute([$email]);

        $insStmt = $pdo->prepare("INSERT INTO email_otps (email, otp_code, type, payload, attempts, expiresAt) VALUES (?, ?, 'forgot_password', NULL, 0, DATE_ADD(NOW(), INTERVAL 10 MINUTE))");
        $insStmt->execute([$email, $otpCode]);

        $subject = "کد بازیابی رمز عبور طغرل: {$otpCode}";
        $html = buildToghroolEmailTemplate(
            "بازیابی رمز عبور",
            "{$user['displayName']} عزیز،",
            "درخواستی برای بازیابی و تغییر رمز عبور حساب شما در اپلیکیشن طغرل ثبت شده است. از کد تایید زیر برای تنظیم رمز عبور جدید استفاده کنید:",
            $otpCode
        );

        $sent = sendToghroolEmail($email, $subject, $html);
        if (!$sent) {
            error_log("Failed to send forgot password email to {$email}");
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => 'ارسال ایمیل بازیابی با خطا مواجه شد. لطفاً چند دقیقه دیگر مجدداً تلاش نمایید.'
            ]);
            exit();
        }

        recordRateLimitFailure($pdo, $rateKey, 'otp_forgot', 5, 600);

        echo json_encode([
            'status' => 'success',
            'message' => "کد بازیابی ۵ رقمی به ایمیل {$email} ارسال شد.",
            'email' => $email
        ]);
        break;

    case 'reset_password_with_otp':
        ensureOtpSchema($pdo);
        $email = strtolower(trim($input['email'] ?? ''));
        $otpCode = trim((string)($input['otp_code'] ?? ''));
        $newPassword = (string)($input['newPassword'] ?? '');

        if (!$email || !$otpCode || !$newPassword) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'لطفاً کد تایید و رمز عبور جدید را وارد کنید.']);
            exit();
        }

        if (strlen($newPassword) < 6) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.']);
            exit();
        }

        // Verify OTP
        $stmt = $pdo->prepare("SELECT * FROM email_otps WHERE email = ? AND type = 'forgot_password' AND expiresAt > NOW() ORDER BY id DESC LIMIT 1");
        $stmt->execute([$email]);
        $otpRow = $stmt->fetch();

        if (!$otpRow) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'کد بازیابی منقضی شده یا درخواستی یافت نشد. لطفاً کد جدید دریافت کنید.']);
            exit();
        }

        if ($otpRow['attempts'] >= 5) {
            $del = $pdo->prepare("DELETE FROM email_otps WHERE id = ?");
            $del->execute([$otpRow['id']]);
            http_response_code(429);
            echo json_encode(['status' => 'error', 'message' => 'تعداد دفعات اشتباه بیش از حد مجاز بود. لطفاً مجدداً کد دریافت کنید.']);
            exit();
        }

        if (trim($otpRow['otp_code']) !== $otpCode) {
            $up = $pdo->prepare("UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?");
            $up->execute([$otpRow['id']]);
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'کد بازیابی وارد شده نادرست است.']);
            exit();
        }

        // Valid! Update password
        $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
        $uStmt = $pdo->prepare("UPDATE users SET passwordHash = ? WHERE email = ?");
        $uStmt->execute([$newHash, $email]);

        // Delete OTP
        $del = $pdo->prepare("DELETE FROM email_otps WHERE email = ? AND type = 'forgot_password'");
        $del->execute([$email]);

        // Clear login rate limits for this email
        $clientIp = getClientIp();
        $rateKey = md5($clientIp . '|' . $email);
        resetRateLimit($pdo, $rateKey, 'login');

        // Issue new session token so user is automatically logged in
        $uStmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $uStmt->execute([$email]);
        $user = $uStmt->fetch();
        sanitizeUserForResponse($user);

        $rawToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);
        $tStmt = $pdo->prepare("INSERT INTO auth_tokens (token_hash, uid, createdAt, expiresAt, lastUsedAt) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())");
        $tStmt->execute([$tokenHash, $user['uid']]);

        echo json_encode([
            'status' => 'success',
            'message' => 'رمز عبور شما با موفقیت تغییر کرد.',
            'token' => $rawToken,
            'user' => $user
        ]);
        break;
    case 'register':
        ensureUserSchema($pdo);
        $email = strtolower(trim($input['email'] ?? ''));
        $password = (string)($input['password'] ?? '');
        $displayName = trim($input['displayName'] ?? '');
        $gender = trim($input['gender'] ?? 'female');
        if (!in_array($gender, ['female', 'male'], true)) {
            $gender = 'female';
        }
        $onboardingCompleted = ($gender === 'male') ? 1 : 0;

        if (!$email || !$password || !$displayName) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'لطفاً تمامی فیلدها را پر کنید.']);
            exit();
        }

        if (strlen($password) < 6) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'رمز عبور باید حداقل ۶ کاراکتر باشد.']);
            exit();
        }

        // Check if email already registered
        $stmt = $pdo->prepare("SELECT uid FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['status' => 'error', 'message' => 'این ایمیل قبلاً ثبت نام کرده است.']);
            exit();
        }

        $uid = generateId('usr_');
        $coupleCode = generateCoupleCode();
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $pdo->prepare("INSERT INTO users (uid, email, displayName, coupleCode, passwordHash, gender, onboardingCompleted) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$uid, $email, $displayName, $coupleCode, $passwordHash, $gender, $onboardingCompleted]);

        // Generate 32-byte (64 hex char) random raw token & store sha256
        $rawToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);
        $tStmt = $pdo->prepare("INSERT INTO auth_tokens (token_hash, uid, createdAt, expiresAt, lastUsedAt) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())");
        $tStmt->execute([$tokenHash, $uid]);

        $stmt = $pdo->prepare("SELECT * FROM users WHERE uid = ?");
        $stmt->execute([$uid]);
        $user = $stmt->fetch();
        sanitizeUserForResponse($user);

        echo json_encode([
            'status' => 'success',
            'token' => $rawToken,
            'user' => $user
        ]);
        break;

    case 'login':
        $email = strtolower(trim($input['email'] ?? ''));
        $password = (string)($input['password'] ?? '');

        if (!$email || !$password) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'لطفاً ایمیل و رمز عبور را وارد کنید.']);
            exit();
        }

        // Rate limit: 5 failed attempts per 15 minutes by IP + email
        $clientIp = getClientIp();
        $rateKey = md5($clientIp . '|' . $email);
        checkRateLimitGate($pdo, $rateKey, 'login', 5, 900);

        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        $passwordMatches = false;
        $needsRehash = false;

        if ($user && !empty($user['passwordHash'])) {
            $storedHash = (string)$user['passwordHash'];
            $isModernBcrypt = (strpos($storedHash, '$2y$') === 0 || strpos($storedHash, '$argon2') === 0);

            if ($isModernBcrypt) {
                // Hardened check: never accept hash itself as password
                if ($password !== $storedHash && password_verify($password, $storedHash)) {
                    $passwordMatches = true;
                }
            } else {
                // Legacy plaintext hash comparison
                if (hash_equals($storedHash, $password)) {
                    $passwordMatches = true;
                    $needsRehash = true;
                }
            }
        }

        if (!$user || !$passwordMatches) {
            recordRateLimitFailure($pdo, $rateKey, 'login', 5, 900);
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'ایمیل یا رمز عبور اشتباه است.']);
            exit();
        }

        // Successful authentication: clear rate limits
        resetRateLimit($pdo, $rateKey, 'login');

        // Immediately migrate legacy plaintext to modern password_hash
        if ($needsRehash) {
            $newHash = password_hash($password, PASSWORD_DEFAULT);
            $uStmt = $pdo->prepare("UPDATE users SET passwordHash = ? WHERE uid = ?");
            $uStmt->execute([$newHash, $user['uid']]);
        }

        // Issue new sliding session token
        $rawToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);
        $tStmt = $pdo->prepare("INSERT INTO auth_tokens (token_hash, uid, createdAt, expiresAt, lastUsedAt) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())");
        $tStmt->execute([$tokenHash, $user['uid']]);

        unset($user['passwordHash']);
        sanitizeUserForResponse($user);
        echo json_encode([
            'status' => 'success',
            'token' => $rawToken,
            'user' => $user
        ]);
        break;

    case 'logout':
        $rawToken = getBearerToken();
        if ($rawToken) {
            $tokenHash = hash('sha256', $rawToken);
            $stmt = $pdo->prepare("DELETE FROM auth_tokens WHERE token_hash = ?");
            $stmt->execute([$tokenHash]);
        }
        echo json_encode(['status' => 'success', 'message' => 'خروج با موفقیت انجام شد.']);
        break;

    case 'demoLogin':
        $enableDemo = getenv('ENABLE_DEMO_LOGIN') === 'true' || (defined('ENABLE_DEMO_LOGIN') && ENABLE_DEMO_LOGIN === true);
        if (!$enableDemo) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'ورود دمو غیرفعال است.']);
            exit();
        }

        $partnerNumber = (int)($input['partnerNumber'] ?? 1);
        $demoEmail1 = "demo_partner1@wishlist.com";
        $demoEmail2 = "demo_partner2@wishlist.com";
        $uid1 = "demo_user_p1";
        $uid2 = "demo_user_p2";
        $coupleId = "couple_demo_user_p1_demo_user_p2";

        try {
            $stmt = $pdo->prepare("SELECT uid FROM users WHERE uid = ?");
            $stmt->execute([$uid1]);
            if (!$stmt->fetch()) {
                $stmt = $pdo->prepare("INSERT INTO users (uid, email, displayName, coupleCode, partnerEmail, partnerUid, coupleId, passwordHash, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'male')");
                $stmt->execute([$uid1, $demoEmail1, "امیر", "AMIR01", $demoEmail2, $uid2, $coupleId, password_hash("demo_password123", PASSWORD_DEFAULT)]);
            }

            $stmt = $pdo->prepare("SELECT uid FROM users WHERE uid = ?");
            $stmt->execute([$uid2]);
            if (!$stmt->fetch()) {
                $stmt = $pdo->prepare("INSERT INTO users (uid, email, displayName, coupleCode, partnerEmail, partnerUid, coupleId, passwordHash, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'female')");
                $stmt->execute([$uid2, $demoEmail2, "سارا", "SARA02", $demoEmail1, $uid1, $coupleId, password_hash("demo_password123", PASSWORD_DEFAULT)]);
            }

            $targetUid = $partnerNumber === 1 ? $uid1 : $uid2;
            $rawToken = bin2hex(random_bytes(32));
            $tokenHash = hash('sha256', $rawToken);
            $pdo->prepare("INSERT INTO auth_tokens (token_hash, uid, createdAt, expiresAt, lastUsedAt) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())")
                ->execute([$tokenHash, $targetUid]);

            $stmt = $pdo->prepare("SELECT uid, email, displayName, coupleCode, partnerEmail, partnerUid, coupleId, photoURL, gender FROM users WHERE uid = ?");
            $stmt->execute([$targetUid]);
            $user = $stmt->fetch();

            echo json_encode(['status' => 'success', 'token' => $rawToken, 'user' => $user]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'خطا در ورود دمو.']);
        }
        break;

    // ----------------------------------------------------
    // USER PROFILE (TOKEN IDENTITY ONLY)
    // ----------------------------------------------------
    case 'getUser':
        ensurePhase1Schema($pdo);
        ensurePhase2Schema($pdo);
        $user = requireAuth($pdo);

        if (empty($user['coupleCode'])) {
            $user['coupleCode'] = generateCoupleCode();
            $upCodeStmt = $pdo->prepare("UPDATE users SET coupleCode = ? WHERE uid = ?");
            $upCodeStmt->execute([$user['coupleCode'], $user['uid']]);
        }

        // Partner data sanitized: NO partner email exposed!
        $partnerData = null;
        if (!empty($user['partnerUid'])) {
            $pStmt = $pdo->prepare("SELECT uid, displayName, photoURL, isOnline, lastActiveAt, gender, batteryLevel, needStatus, needUpdatedAt, cheatSheet, spaceMode, spaceModeUntil FROM users WHERE uid = ?");
            $pStmt->execute([$user['partnerUid']]);
            $partnerRow = $pStmt->fetch();
            if ($partnerRow) {
                $isRecent = (time() - ((int)($partnerRow['lastActiveAt'] ?? 0))) < 60;
                $decodedPartnerCheat = !empty($partnerRow['cheatSheet']) ? json_decode($partnerRow['cheatSheet'], true) : null;
                $partnerData = [
                    'uid' => $partnerRow['uid'],
                    'displayName' => $partnerRow['displayName'],
                    'photoURL' => $partnerRow['photoURL'],
                    'isOnline' => $isRecent ? 1 : 0,
                    'lastActiveAt' => $partnerRow['lastActiveAt'],
                    'gender' => $partnerRow['gender'] ?? 'female',
                    'batteryLevel' => (int)($partnerRow['batteryLevel'] ?? 80),
                    'needStatus' => $partnerRow['needStatus'] ?? 'calm',
                    'needUpdatedAt' => $partnerRow['needUpdatedAt'] ? (int)$partnerRow['needUpdatedAt'] : null,
                    'cheatSheet' => $decodedPartnerCheat,
                    'spaceMode' => !empty($partnerRow['spaceMode']),
                    'spaceModeUntil' => $partnerRow['spaceModeUntil'] ? (int)$partnerRow['spaceModeUntil'] : null
                ];
            }
        }

        $user['batteryLevel'] = (int)($user['batteryLevel'] ?? 80);
        $user['needStatus'] = $user['needStatus'] ?? 'calm';
        $user['needUpdatedAt'] = $user['needUpdatedAt'] ? (int)$user['needUpdatedAt'] : null;
        $user['cheatSheet'] = !empty($user['cheatSheet']) ? (is_array($user['cheatSheet']) ? $user['cheatSheet'] : json_decode($user['cheatSheet'], true)) : null;
        $user['spaceMode'] = !empty($user['spaceMode']);
        $user['spaceModeUntil'] = $user['spaceModeUntil'] ? (int)$user['spaceModeUntil'] : null;
        $user['partner'] = $partnerData;
        echo json_encode(['status' => 'success', 'user' => $user]);
        break;

    case 'updateProfile':
        $user = requireAuth($pdo);
        $uid = $user['uid']; // Derived strictly from verified token

        $displayName = trim($input['displayName'] ?? '');
        $photoURL = trim($input['photoURL'] ?? '');
        $gender = trim($input['gender'] ?? '');

        if (!$displayName) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'نام نمایشی الزامی است.']);
            exit();
        }

        if ($gender && in_array($gender, ['female', 'male'], true)) {
            $stmt = $pdo->prepare("UPDATE users SET displayName = ?, photoURL = ?, gender = ? WHERE uid = ?");
            $stmt->execute([$displayName, $photoURL, $gender, $uid]);
        } else {
            $stmt = $pdo->prepare("UPDATE users SET displayName = ?, photoURL = ? WHERE uid = ?");
            $stmt->execute([$displayName, $photoURL, $uid]);
        }

        // Update partner displays in couples table if paired
        if (!empty($user['coupleId'])) {
            $stmt = $pdo->prepare("UPDATE couples SET partner1Name = ? WHERE partner1Uid = ?");
            $stmt->execute([$displayName, $uid]);
            $stmt = $pdo->prepare("UPDATE couples SET partner2Name = ? WHERE partner2Uid = ?");
            $stmt->execute([$displayName, $uid]);
        }

        $stmt = $pdo->prepare("SELECT * FROM users WHERE uid = ?");
        $stmt->execute([$uid]);
        $updatedUser = $stmt->fetch();
        sanitizeUserForResponse($updatedUser);

        echo json_encode([
            'status' => 'success',
            'user' => $updatedUser,
            'message' => 'پروفایل با موفقیت به‌روزرسانی شد.'
        ]);
        break;

    case 'saveOnboarding':
        ensureUserSchema($pdo);
        ensurePeriodSchema($pdo);
        $user = requireAuth($pdo);
        $uid = $user['uid'];
        $targetId = !empty($user['coupleId']) ? $user['coupleId'] : $uid;

        $healthData = $input['onboardingHealthData'] ?? [];
        $cycleLength = (int)($input['cycleLength'] ?? ($healthData['cycleLength'] ?? 28));
        $periodLength = (int)($input['periodLength'] ?? ($healthData['periodLength'] ?? 7));
        $lastPeriodStartDate = trim($input['lastPeriodStartDate'] ?? ($healthData['lastPeriodStartDate'] ?? date('Y-m-d')));

        if ($cycleLength < 20 || $cycleLength > 60) $cycleLength = 28;
        if ($periodLength < 2 || $periodLength > 15) $periodLength = 7;

        // Calculate BMI if height and weight present
        $heightCm = (float)($healthData['heightCm'] ?? 170);
        $weightKg = (float)($healthData['weightKg'] ?? 70);
        if ($heightCm > 0 && $weightKg > 0) {
            $heightM = $heightCm / 100.0;
            $healthData['bmi'] = round($weightKg / ($heightM * $heightM), 1);
        }
        $healthData['completedAt'] = date('Y-m-d H:i:s');

        // 1. Update user record
        $jsonHealth = json_encode($healthData, JSON_UNESCAPED_UNICODE);
        $uStmt = $pdo->prepare("UPDATE users SET onboardingCompleted = 1, onboardingHealthData = ?, gender = 'female' WHERE uid = ?");
        $uStmt->execute([$jsonHealth, $uid]);

        // 2. Save Period Settings for user / couple
        $stmt = $pdo->prepare("
            INSERT INTO couple_period_settings 
            (coupleId, trackerOwnerUid, cycleLength, periodLength, lastPeriodStartDate, goalMode, birthDate, viewMode, updatedBy, updatedAt)
            VALUES (?, ?, ?, ?, ?, 'track', '2000-01-01', 'circular', ?, NOW())
            ON DUPLICATE KEY UPDATE
            trackerOwnerUid = COALESCE(trackerOwnerUid, VALUES(trackerOwnerUid)),
            cycleLength = VALUES(cycleLength),
            periodLength = VALUES(periodLength),
            lastPeriodStartDate = VALUES(lastPeriodStartDate),
            updatedBy = VALUES(updatedBy),
            updatedAt = NOW()
        ");
        $stmt->execute([$targetId, $uid, $cycleLength, $periodLength, $lastPeriodStartDate, $uid]);

        // 3. Seed initial period logs for periodLength consecutive days
        try {
            $startTs = strtotime($lastPeriodStartDate);
            if ($startTs) {
                for ($dayOffset = 0; $dayOffset < $periodLength; $dayOffset++) {
                    $logDate = date('Y-m-d', strtotime("+$dayOffset day", $startTs));
                    $logId = 'log_' . md5($targetId . '_' . $logDate);
                    $isStart = ($dayOffset === 0) ? 1 : 0;

                    $logStmt = $pdo->prepare("
                        INSERT INTO couple_period_logs
                        (id, coupleId, date, isPeriodDay, isPeriodStart, flow, waterGlasses, loggedByUid, loggedByName, createdAt)
                        VALUES (?, ?, ?, 1, ?, 'medium', 4, ?, ?, NOW())
                        ON DUPLICATE KEY UPDATE
                        isPeriodDay = 1,
                        isPeriodStart = VALUES(isPeriodStart),
                        flow = VALUES(flow)
                    ");
                    $logStmt->execute([$logId, $targetId, $logDate, $isStart, $uid, $user['displayName'] ?? 'پارتنر']);
                }
            }
        } catch (Exception $logEx) {
            error_log("Failed to seed onboarding period logs: " . $logEx->getMessage());
        }

        // Return updated user
        $stmt = $pdo->prepare("SELECT * FROM users WHERE uid = ?");
        $stmt->execute([$uid]);
        $updatedUser = $stmt->fetch();
        sanitizeUserForResponse($updatedUser);

        echo json_encode([
            'status' => 'success',
            'user' => $updatedUser,
            'message' => 'اطلاعات سلامت و چرخه با موفقیت ذخیره شد.'
        ]);
        break;

    case 'unpair':
        $user = requireAuth($pdo);
        $uid = $user['uid'];

        $partnerUid = $user['partnerUid'];
        $coupleId = $user['coupleId'];

        $pdo->prepare("UPDATE users SET partnerEmail = NULL, partnerUid = NULL, coupleId = NULL WHERE uid = ?")->execute([$uid]);
        if ($partnerUid) {
            $pdo->prepare("UPDATE users SET partnerEmail = NULL, partnerUid = NULL, coupleId = NULL WHERE uid = ?")->execute([$partnerUid]);
        }
        if ($coupleId) {
            $pdo->prepare("DELETE FROM couples WHERE id = ?")->execute([$coupleId]);
        }

        echo json_encode(['status' => 'success', 'message' => 'اتصال با موفقیت قطع شد.']);
        break;

    // ----------------------------------------------------
    // COUPLE PAIRING (HARDENED WITH BASE32 & RATE LIMIT)
    // ----------------------------------------------------
    case 'pairByCode':
        $user = requireAuth($pdo);
        $myUid = $user['uid'];
        $code = strtoupper(trim($input['code'] ?? ''));

        // Rate limit: 5 attempts per 15 minutes by user + IP
        $clientIp = getClientIp();
        $rateKey = md5($clientIp . '|' . $myUid);
        checkRateLimitGate($pdo, $rateKey, 'pairByCode', 5, 900);

        if (!$code) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'کد اتصال نامعتبر است.']);
            exit();
        }

        if ($user['coupleCode'] === $code) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'شما نمی‌توانید کد خودتان را وارد کنید!']);
            exit();
        }

        // Find partner by code
        $stmt = $pdo->prepare("SELECT * FROM users WHERE coupleCode = ?");
        $stmt->execute([$code]);
        $partner = $stmt->fetch();

        if (!$partner) {
            recordRateLimitFailure($pdo, $rateKey, 'pairByCode', 5, 900);
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'کد زوجین یافت نشد. لطفاً کد را بررسی کنید.']);
            exit();
        }

        resetRateLimit($pdo, $rateKey, 'pairByCode');

        $coupleId = 'couple_' . min($myUid, $partner['uid']) . '_' . max($myUid, $partner['uid']);

        // Update profiles
        $stmt = $pdo->prepare("UPDATE users SET partnerUid = ?, partnerEmail = ?, coupleId = ? WHERE uid = ?");
        $stmt->execute([$partner['uid'], $partner['email'], $coupleId, $myUid]);

        $stmt = $pdo->prepare("UPDATE users SET partnerUid = ?, partnerEmail = ?, coupleId = ? WHERE uid = ?");
        $stmt->execute([$myUid, $user['email'], $coupleId, $partner['uid']]);

        // Insert or update couples table
        $stmt = $pdo->prepare("REPLACE INTO couples (id, partner1Uid, partner1Email, partner1Name, partner2Uid, partner2Email, partner2Name) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $coupleId,
            $myUid,
            $user['email'],
            $user['displayName'],
            $partner['uid'],
            $partner['email'],
            $partner['displayName']
        ]);

        // Migrate solo period settings & logs to shared coupleId
        try {
            ensurePeriodSchema($pdo);
            $pdo->prepare("
                INSERT IGNORE INTO couple_period_settings 
                (coupleId, trackerOwnerUid, cycleLength, periodLength, lastPeriodStartDate, goalMode, birthDate, viewMode, updatedBy)
                SELECT ?, trackerOwnerUid, cycleLength, periodLength, lastPeriodStartDate, goalMode, birthDate, viewMode, updatedBy
                FROM couple_period_settings 
                WHERE coupleId IN (?, ?) 
                ORDER BY updatedAt DESC LIMIT 1
            ")->execute([$coupleId, $myUid, $partner['uid']]);

            $pdo->prepare("UPDATE IGNORE couple_period_logs SET coupleId = ? WHERE coupleId IN (?, ?)")
                ->execute([$coupleId, $myUid, $partner['uid']]);

            // Migrate solo wishlist, memories, comments, and pokes to shared coupleId
            $pdo->prepare("UPDATE IGNORE wishlist SET coupleId = ? WHERE coupleId IN (?, ?)")->execute([$coupleId, $myUid, $partner['uid']]);
            $pdo->prepare("UPDATE IGNORE memories SET coupleId = ? WHERE coupleId IN (?, ?)")->execute([$coupleId, $myUid, $partner['uid']]);
            $pdo->prepare("UPDATE IGNORE memory_comments SET coupleId = ? WHERE coupleId IN (?, ?)")->execute([$coupleId, $myUid, $partner['uid']]);
            $pdo->prepare("UPDATE IGNORE pokes SET coupleId = ? WHERE coupleId IN (?, ?)")->execute([$coupleId, $myUid, $partner['uid']]);
        } catch (Exception $migEx) {
            error_log("Couple period sync notice: " . $migEx->getMessage());
        }

        echo json_encode(['status' => 'success', 'coupleId' => $coupleId]);
        break;

    // ----------------------------------------------------
    // SECURE IMAGE UPLOAD (EXIF STRIPPED, GD RE-ENCODED, 5MB CAP & USER QUOTA)
    // ----------------------------------------------------
    case 'uploadImage':
        $user = requireAuth($pdo);
        $uid = $user['uid'];

        // Hourly User Quota: Max 30 uploads or 50MB per hour
        $qStmt = $pdo->prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(file_size), 0) as total_size FROM user_uploads WHERE uid = ? AND uploadedAt > DATE_SUB(NOW(), INTERVAL 1 HOUR)");
        $qStmt->execute([$uid]);
        $quota = $qStmt->fetch();
        if ((int)$quota['cnt'] >= 30 || (int)$quota['total_size'] >= (50 * 1024 * 1024)) {
            http_response_code(429);
            echo json_encode(['status' => 'error', 'message' => 'سقف تعداد یا حجم آپلود در این ساعت تکمیل شده است. لطفاً بعداً تلاش کنید.']);
            exit();
        }

        $folder = preg_replace('/[^a-zA-Z0-9_-]/', '', $input['folder'] ?? $_POST['folder'] ?? 'avatars');
        if (!in_array($folder, ['avatars', 'memories'], true)) {
            $folder = 'avatars';
        }

        $uploadBase = __DIR__ . '/uploads';
        $uploadDir = $uploadBase . '/' . $folder;
        if (!is_dir($uploadDir)) {
            @mkdir($uploadDir, 0755, true);
        }

        $imageRawData = null;

        // 1. Multipart upload
        if (isset($_FILES['image']) && is_uploaded_file($_FILES['image']['tmp_name'])) {
            $tmpPath = $_FILES['image']['tmp_name'];
            $imageRawData = file_get_contents($tmpPath);
        }
        // 2. Base64 payload
        else {
            $base64 = $input['image'] ?? $input['dataUrl'] ?? $_POST['image'] ?? '';
            if (!$base64) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'تصویری دریافت نشد.']);
                exit();
            }

            if (preg_match('/^data:image\/(\w+);base64,/', $base64)) {
                $base64 = substr($base64, strpos($base64, ',') + 1);
            }
            $imageRawData = base64_decode($base64, true);
        }

        if (!$imageRawData || strlen($imageRawData) < 12) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'داده‌های تصویر ارسالی نامعتبر است.']);
            exit();
        }

        // Strict 5 MB Maximum File Size Cap
        if (strlen($imageRawData) > (5 * 1024 * 1024)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'حجم تصویر نباید بیشتر از ۵ مگابایت باشد.']);
            exit();
        }

        // Deep Content Verification: MIME type check via finfo
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $realMime = $finfo->buffer($imageRawData);
        $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!in_array($realMime, $allowedMimes, true)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'فرمت فایل مجاز نیست. فقط تصاویر JPEG, PNG و WebP پذیرفته می‌شوند.']);
            exit();
        }

        // Verify valid image geometry via getimagesizefromstring
        $imgInfo = @getimagesizefromstring($imageRawData);
        if ($imgInfo === false || empty($imgInfo[0]) || empty($imgInfo[1])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'فایل ارسالی یک تصویر معتبر نیست.']);
            exit();
        }

        // Neutralize Polyglots & Strip EXIF/GPS: Re-encode image from raw raster using GD
        $srcImg = @imagecreatefromstring($imageRawData);
        if (!$srcImg) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'پردازش تصویر با خطا مواجه شد.']);
            exit();
        }

        $extension = 'jpg';
        if ($realMime === 'image/png') $extension = 'png';
        elseif ($realMime === 'image/webp') $extension = 'webp';

        $filename = $folder . '_' . bin2hex(random_bytes(10)) . '_' . time() . '.' . $extension;
        $destPath = $uploadDir . '/' . $filename;

        $saveSuccess = false;
        if ($extension === 'png') {
            imagealphablending($srcImg, false);
            imagesavealpha($srcImg, true);
            $saveSuccess = imagepng($srcImg, $destPath, 8);
        } elseif ($extension === 'webp' && function_exists('imagewebp')) {
            $saveSuccess = imagewebp($srcImg, $destPath, 85);
        } else {
            $saveSuccess = imagejpeg($srcImg, $destPath, 85);
        }
        imagedestroy($srcImg);

        if (!$saveSuccess || !file_exists($destPath)) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'خطا در ذخیره تصویر روی هاست.']);
            exit();
        }

        // Track upload against user quota
        $fileSize = filesize($destPath);
        $uTrack = $pdo->prepare("INSERT INTO user_uploads (uid, filename, file_size, uploadedAt) VALUES (?, ?, ?, NOW())");
        $uTrack->execute([$uid, $filename, $fileSize]);

        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "https://";
        $host = $_SERVER['HTTP_HOST'] ?? 'toghrool.ir';
        $fullUrl = $protocol . $host . '/uploads/' . $folder . '/' . $filename;

        echo json_encode([
            'status' => 'success',
            'url' => $fullUrl,
            'relativeUrl' => '/uploads/' . $folder . '/' . $filename,
            'filename' => $filename
        ]);
        break;

    // ----------------------------------------------------
    // PERIOD TRACKER (SENSITIVE HEALTH DATA - SCOPED STRICTLY TO OWNER & SHARING PERMISSIONS)
    // ----------------------------------------------------
    case 'getPeriodData':
        list($user, $targetId) = requirePeriodTarget($pdo);

        // 1. Settings & Owner Resolution
        $stmt = $pdo->prepare("SELECT * FROM couple_period_settings WHERE coupleId = ?");
        $stmt->execute([$targetId]);
        $settings = $stmt->fetch();

        if ($settings) {
            $settings['cycleLength'] = (int)($settings['cycleLength'] ?: 28);
            $settings['periodLength'] = (int)($settings['periodLength'] ?: 5);
            $settings['birthDate'] = !empty($settings['birthDate']) ? $settings['birthDate'] : '2000-01-01';
        }

        $ownerUid = $settings ? ($settings['trackerOwnerUid'] ?? null) : null;
        // If owner is not established yet, requester is treated as potential owner during initial setup
        $isOwner = $ownerUid ? ($user['uid'] === $ownerUid) : (($user['gender'] ?? 'female') !== 'male');

        // 2. Sharing Permissions
        $stmt = $pdo->prepare("SELECT * FROM period_sharing WHERE coupleId = ?");
        $stmt->execute([$targetId]);
        $rowSharing = $stmt->fetch();

        if ($rowSharing) {
            $sharing = [
                'sharePhase' => (bool)$rowSharing['sharePhase'],
                'shareNextPeriod' => (bool)$rowSharing['shareNextPeriod'],
                'shareFertileWindow' => (bool)$rowSharing['shareFertileWindow'],
                'shareFlow' => (bool)$rowSharing['shareFlow'],
                'shareMood' => (bool)$rowSharing['shareMood'],
                'shareSymptoms' => (bool)$rowSharing['shareSymptoms'],
                'shareSex' => (bool)$rowSharing['shareSex'],
                'shareTests' => (bool)$rowSharing['shareTests'],
                'shareNotes' => (bool)$rowSharing['shareNotes'],
                'allowPartnerLogging' => (bool)$rowSharing['allowPartnerLogging']
            ];
        } else {
            // Default sharing: Only sharePhase and shareNextPeriod are ON. Sex, notes, tests NEVER default to partner.
            $sharing = [
                'sharePhase' => true,
                'shareNextPeriod' => true,
                'shareFertileWindow' => false,
                'shareFlow' => false,
                'shareMood' => false,
                'shareSymptoms' => false,
                'shareSex' => false,
                'shareTests' => false,
                'shareNotes' => false,
                'allowPartnerLogging' => false
            ];
        }

        // 3. Daily Logs with Strict Server-Side Filtering
        $stmt = $pdo->prepare("SELECT * FROM couple_period_logs WHERE coupleId = ? ORDER BY date DESC");
        $stmt->execute([$targetId]);
        $rawLogs = $stmt->fetchAll();

        $logs = [];
        foreach ($rawLogs as $row) {
            if ($isOwner) {
                // Owner receives all sensitive health data
                $logs[] = [
                    'id' => $row['id'],
                    'date' => $row['date'],
                    'isPeriodDay' => (bool)$row['isPeriodDay'],
                    'isPeriodStart' => (bool)$row['isPeriodStart'],
                    'flow' => $row['flow'] ?: 'none',
                    'moods' => $row['moods'] ? json_decode($row['moods'], true) : [],
                    'symptoms' => $row['symptoms'] ? json_decode($row['symptoms'], true) : [],
                    'discharge' => $row['discharge'] ?: 'none',
                    'sex' => $row['sex'] ?: 'none',
                    'ovulationTestResult' => $row['ovulationTestResult'] ?: 'none',
                    'pregnancyTestResult' => $row['pregnancyTestResult'] ?: 'none',
                    'sharePregnancyTestWithPartner' => (bool)($row['sharePregnancyTestWithPartner'] ?? 0),
                    'waterGlasses' => (int)($row['waterGlasses'] ?? 4),
                    'notes' => $row['notes'] ?: '',
                    'loggedByUid' => $row['loggedByUid'] ?: '',
                    'loggedByName' => $row['loggedByName'] ?: '',
                    'createdAt' => $row['createdAt'] ?? date('c')
                ];
            } else {
                // Partner (Observer): ONLY permitted fields are included. Unpermitted fields are COMPLETELY OMITTED.
                $item = [
                    'id' => $row['id'],
                    'date' => $row['date']
                ];

                if ($sharing['sharePhase']) {
                    $item['isPeriodDay'] = (bool)$row['isPeriodDay'];
                    $item['isPeriodStart'] = (bool)$row['isPeriodStart'];
                }

                if ($sharing['shareFlow'] && !empty($row['flow']) && $row['flow'] !== 'none') {
                    $item['flow'] = $row['flow'];
                }

                if ($sharing['shareMood'] && !empty($row['moods'])) {
                    $moodsArr = json_decode($row['moods'], true);
                    if (!empty($moodsArr)) {
                        $item['moods'] = $moodsArr;
                    }
                }

                if ($sharing['shareSymptoms'] && !empty($row['symptoms'])) {
                    $symptomsArr = json_decode($row['symptoms'], true);
                    if (!empty($symptomsArr)) {
                        $item['symptoms'] = $symptomsArr;
                    }
                }

                if ($sharing['shareFertileWindow'] && !empty($row['discharge']) && $row['discharge'] !== 'none') {
                    $item['discharge'] = $row['discharge'];
                }

                // Sex log is NEVER sent unless shareSex is true
                if ($sharing['shareSex'] && !empty($row['sex']) && $row['sex'] !== 'none') {
                    $item['sex'] = $row['sex'];
                }

                // Tests: Ovulation kit if shareTests; Pregnancy test ONLY if both shareTests AND log-level sharePregnancyTestWithPartner is true
                if ($sharing['shareTests']) {
                    if (!empty($row['ovulationTestResult']) && $row['ovulationTestResult'] !== 'none') {
                        $item['ovulationTestResult'] = $row['ovulationTestResult'];
                    }
                    if (!empty($row['sharePregnancyTestWithPartner']) && !empty($row['pregnancyTestResult']) && $row['pregnancyTestResult'] !== 'none') {
                        $item['pregnancyTestResult'] = $row['pregnancyTestResult'];
                    }
                }

                // Notes are NEVER sent unless shareNotes is true
                if ($sharing['shareNotes'] && !empty($row['notes'])) {
                    $item['notes'] = $row['notes'];
                }

                $logs[] = $item;
            }
        }

        // Response payload
        if ($settings) {
            $settings['isOwner'] = $isOwner;
            $settings['trackerOwnerUid'] = $ownerUid;
            $settings['allowPartnerLogging'] = $sharing['allowPartnerLogging'];
        }

        echo json_encode([
            'status' => 'success',
            'isOwner' => $isOwner,
            'trackerOwnerUid' => $ownerUid,
            'settings' => $settings ?: null,
            'sharing' => $sharing,
            'logs' => $logs
        ]);
        break;

    case 'savePeriodSettings':
        list($user, $targetId) = requirePeriodTarget($pdo);
        $settings = $input['settings'] ?? [];

        // Check ownership
        $stmt = $pdo->prepare("SELECT trackerOwnerUid FROM couple_period_settings WHERE coupleId = ?");
        $stmt->execute([$targetId]);
        $existing = $stmt->fetch();
        $existingOwner = $existing['trackerOwnerUid'] ?? null;

        if ($existingOwner && $user['uid'] !== $existingOwner && ($user['gender'] ?? 'female') === 'male') {
            http_response_code(403);
            echo json_encode([
                'status' => 'error',
                'code' => 'FORBIDDEN_NOT_OWNER',
                'message' => 'تنها صاحب ترکر مجاز به تغییر تنظیمات پریود است.'
            ]);
            exit();
        }

        // Set owner if not established or if female owner is saving
        $trackerOwnerUid = (($user['gender'] ?? 'female') !== 'male') ? $user['uid'] : ($existingOwner ?: ($settings['trackerOwnerUid'] ?? $user['uid']));

        $cycleLength = (int)($settings['cycleLength'] ?? 28);
        $periodLength = (int)($settings['periodLength'] ?? 5);
        $lastPeriodStartDate = $settings['lastPeriodStartDate'] ?? date('Y-m-d');
        $goalMode = $settings['goalMode'] ?? 'track';
        $birthDate = !empty($settings['birthDate']) ? $settings['birthDate'] : '2000-01-01';
        $viewMode = $settings['viewMode'] ?? 'circular';
        $updatedBy = $user['uid'];

        $stmt = $pdo->prepare("
            INSERT INTO couple_period_settings 
                (coupleId, trackerOwnerUid, cycleLength, periodLength, lastPeriodStartDate, goalMode, birthDate, viewMode, updatedBy, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
                trackerOwnerUid = VALUES(trackerOwnerUid),
                cycleLength = VALUES(cycleLength),
                periodLength = VALUES(periodLength),
                lastPeriodStartDate = VALUES(lastPeriodStartDate),
                goalMode = VALUES(goalMode),
                birthDate = VALUES(birthDate),
                viewMode = VALUES(viewMode),
                updatedBy = VALUES(updatedBy),
                updatedAt = NOW()
        ");
        $stmt->execute([$targetId, $trackerOwnerUid, $cycleLength, $periodLength, $lastPeriodStartDate, $goalMode, $birthDate, $viewMode, $updatedBy]);

        echo json_encode([
            'status' => 'success',
            'settings' => [
                'trackerOwnerUid' => $trackerOwnerUid,
                'isOwner' => ($user['uid'] === $trackerOwnerUid),
                'cycleLength' => $cycleLength,
                'periodLength' => $periodLength,
                'lastPeriodStartDate' => $lastPeriodStartDate,
                'goalMode' => $goalMode,
                'birthDate' => $birthDate,
                'viewMode' => $viewMode
            ]
        ]);
        break;

    case 'savePeriodSharing':
        list($user, $targetId) = requirePeriodTarget($pdo);

        // Verify owner
        $stmt = $pdo->prepare("SELECT trackerOwnerUid FROM couple_period_settings WHERE coupleId = ?");
        $stmt->execute([$targetId]);
        $settings = $stmt->fetch();
        $ownerUid = $settings['trackerOwnerUid'] ?? null;

        if (!$ownerUid) {
            $ownerUid = $user['uid'];
            $pdo->prepare("UPDATE couple_period_settings SET trackerOwnerUid = ? WHERE coupleId = ?")->execute([$ownerUid, $targetId]);
        }

        if ($user['uid'] !== $ownerUid && ($user['gender'] ?? 'female') === 'male') {
            http_response_code(403);
            echo json_encode([
                'status' => 'error',
                'code' => 'FORBIDDEN_NOT_OWNER',
                'message' => 'تنها صاحب ترکر مجاز به تغییر تنظیمات اشتراک‌گذاری است.'
            ]);
            exit();
        }

        $sharing = $input['sharing'] ?? [];
        $sharePhase = !empty($sharing['sharePhase']) ? 1 : 0;
        $shareNextPeriod = !empty($sharing['shareNextPeriod']) ? 1 : 0;
        $shareFertileWindow = !empty($sharing['shareFertileWindow']) ? 1 : 0;
        $shareFlow = !empty($sharing['shareFlow']) ? 1 : 0;
        $shareMood = !empty($sharing['shareMood']) ? 1 : 0;
        $shareSymptoms = !empty($sharing['shareSymptoms']) ? 1 : 0;
        $shareSex = !empty($sharing['shareSex']) ? 1 : 0;
        $shareTests = !empty($sharing['shareTests']) ? 1 : 0;
        $shareNotes = !empty($sharing['shareNotes']) ? 1 : 0;
        $allowPartnerLogging = !empty($sharing['allowPartnerLogging']) ? 1 : 0;

        $stmt = $pdo->prepare("
            INSERT INTO period_sharing 
                (coupleId, ownerUid, sharePhase, shareNextPeriod, shareFertileWindow, shareFlow, shareMood, shareSymptoms, shareSex, shareTests, shareNotes, allowPartnerLogging, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
                ownerUid = VALUES(ownerUid),
                sharePhase = VALUES(sharePhase),
                shareNextPeriod = VALUES(shareNextPeriod),
                shareFertileWindow = VALUES(shareFertileWindow),
                shareFlow = VALUES(shareFlow),
                shareMood = VALUES(shareMood),
                shareSymptoms = VALUES(shareSymptoms),
                shareSex = VALUES(shareSex),
                shareTests = VALUES(shareTests),
                shareNotes = VALUES(shareNotes),
                allowPartnerLogging = VALUES(allowPartnerLogging),
                updatedAt = NOW()
        ");
        $stmt->execute([
            $targetId, $ownerUid, $sharePhase, $shareNextPeriod, $shareFertileWindow, $shareFlow, $shareMood, $shareSymptoms, $shareSex, $shareTests, $shareNotes, $allowPartnerLogging
        ]);

        echo json_encode([
            'status' => 'success',
            'sharing' => [
                'sharePhase' => (bool)$sharePhase,
                'shareNextPeriod' => (bool)$shareNextPeriod,
                'shareFertileWindow' => (bool)$shareFertileWindow,
                'shareFlow' => (bool)$shareFlow,
                'shareMood' => (bool)$shareMood,
                'shareSymptoms' => (bool)$shareSymptoms,
                'shareSex' => (bool)$shareSex,
                'shareTests' => (bool)$shareTests,
                'shareNotes' => (bool)$shareNotes,
                'allowPartnerLogging' => (bool)$allowPartnerLogging
            ]
        ]);
        break;

    case 'savePeriodLog':
        list($user, $targetId) = requirePeriodTarget($pdo);
        $log = $input['log'] ?? [];

        if (empty($log['date'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'تاریخ ثبت الزامی است.']);
            exit();
        }

        // Ownership & Partner logging authorization check
        $stmt = $pdo->prepare("SELECT trackerOwnerUid FROM couple_period_settings WHERE coupleId = ?");
        $stmt->execute([$targetId]);
        $settings = $stmt->fetch();
        $ownerUid = $settings['trackerOwnerUid'] ?? null;
        $isOwner = $ownerUid ? ($user['uid'] === $ownerUid) : (($user['gender'] ?? 'female') !== 'male');

        if (!$isOwner) {
            // Check allowPartnerLogging in period_sharing
            $stmt = $pdo->prepare("SELECT allowPartnerLogging FROM period_sharing WHERE coupleId = ?");
            $stmt->execute([$targetId]);
            $sharingRow = $stmt->fetch();
            $allowPartnerLogging = !empty($sharingRow['allowPartnerLogging']);

            if (!$allowPartnerLogging) {
                http_response_code(403);
                echo json_encode([
                    'status' => 'error',
                    'code' => 'FORBIDDEN_PARTNER_LOGGING_DISABLED',
                    'message' => 'امکان ثبت لاگ توسط صاحب ترکر غیرفعال شده است.'
                ]);
                exit();
            }
        }

        $id = generateId('log_');
        $date = $log['date'];
        $isPeriodDay = !empty($log['isPeriodDay']) ? 1 : 0;
        $isPeriodStart = !empty($log['isPeriodStart']) ? 1 : 0;
        $loggedByUid = $user['uid'];
        $loggedByName = $user['displayName'];

        if ($isOwner) {
            // Owner can log all fields
            $flow = $log['flow'] ?? 'none';
            $moods = !empty($log['moods']) ? json_encode($log['moods']) : '[]';
            $symptoms = !empty($log['symptoms']) ? json_encode($log['symptoms']) : '[]';
            $discharge = $log['discharge'] ?? 'none';
            $sex = $log['sex'] ?? 'none';
            $ovulationTestResult = $log['ovulationTestResult'] ?? 'none';
            $pregnancyTestResult = $log['pregnancyTestResult'] ?? 'none';
            $sharePregnancyTestWithPartner = !empty($log['sharePregnancyTestWithPartner']) ? 1 : 0;
            $waterGlasses = (int)($log['waterGlasses'] ?? 4);
            $notes = $log['notes'] ?? '';
        } else {
            // Partner can ONLY log simple period start/day; sensitive fields are strictly suppressed
            $flow = 'none';
            $moods = '[]';
            $symptoms = '[]';
            $discharge = 'none';
            $sex = 'none';
            $ovulationTestResult = 'none';
            $pregnancyTestResult = 'none';
            $sharePregnancyTestWithPartner = 0;
            $waterGlasses = 4;
            $notes = '';
        }

        $stmt = $pdo->prepare("
            INSERT INTO couple_period_logs 
                (id, coupleId, date, isPeriodDay, isPeriodStart, flow, moods, symptoms, discharge, sex, ovulationTestResult, pregnancyTestResult, sharePregnancyTestWithPartner, waterGlasses, notes, loggedByUid, loggedByName, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
                isPeriodDay = VALUES(isPeriodDay),
                isPeriodStart = VALUES(isPeriodStart),
                flow = VALUES(flow),
                moods = VALUES(moods),
                symptoms = VALUES(symptoms),
                discharge = VALUES(discharge),
                sex = VALUES(sex),
                ovulationTestResult = VALUES(ovulationTestResult),
                pregnancyTestResult = VALUES(pregnancyTestResult),
                sharePregnancyTestWithPartner = VALUES(sharePregnancyTestWithPartner),
                waterGlasses = VALUES(waterGlasses),
                notes = VALUES(notes),
                loggedByUid = VALUES(loggedByUid),
                loggedByName = VALUES(loggedByName)
        ");
        $stmt->execute([
            $id, $targetId, $date, $isPeriodDay, $isPeriodStart, $flow, $moods, $symptoms, $discharge, $sex, $ovulationTestResult, $pregnancyTestResult, $sharePregnancyTestWithPartner, $waterGlasses, $notes, $loggedByUid, $loggedByName
        ]);

        if ($isPeriodStart) {
            $stmt = $pdo->prepare("UPDATE couple_period_settings SET lastPeriodStartDate = ?, updatedAt = NOW() WHERE coupleId = ?");
            $stmt->execute([$date, $targetId]);
        }

        echo json_encode(['status' => 'success', 'id' => $id]);
        break;

    case 'deletePeriodLog':
        list($user, $targetId) = requirePeriodTarget($pdo);

        // Only owner can delete period logs
        $stmt = $pdo->prepare("SELECT trackerOwnerUid FROM couple_period_settings WHERE coupleId = ?");
        $stmt->execute([$targetId]);
        $settings = $stmt->fetch();
        $ownerUid = $settings['trackerOwnerUid'] ?? null;

        if ($ownerUid && $user['uid'] !== $ownerUid && ($user['gender'] ?? 'female') === 'male') {
            http_response_code(403);
            echo json_encode([
                'status' => 'error',
                'code' => 'FORBIDDEN_NOT_OWNER',
                'message' => 'تنها صاحب ترکر مجاز به حذف لاگ است.'
            ]);
            exit();
        }

        $id = trim($input['id'] ?? $_GET['id'] ?? '');
        $date = trim($input['date'] ?? $_GET['date'] ?? '');

        if (!$id && !$date) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'شناسه یا تاریخ مشخص نشده است.']);
            exit();
        }

        if ($id) {
            $stmt = $pdo->prepare("DELETE FROM couple_period_logs WHERE id = ? AND coupleId = ?");
            $stmt->execute([$id, $targetId]);
        } else {
            $stmt = $pdo->prepare("DELETE FROM couple_period_logs WHERE date = ? AND coupleId = ?");
            $stmt->execute([$date, $targetId]);
        }

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'لاگ پریود یافت نشد یا دسترسی ندارید.']);
            exit();
        }

        echo json_encode(['status' => 'success']);
        break;

    case 'exportMyPeriodData':
        list($user, $targetId) = requirePeriodTarget($pdo);

        // Only owner can export
        $stmt = $pdo->prepare("SELECT trackerOwnerUid FROM couple_period_settings WHERE coupleId = ?");
        $stmt->execute([$targetId]);
        $settings = $stmt->fetch();
        $ownerUid = $settings['trackerOwnerUid'] ?? null;

        if ($ownerUid && $user['uid'] !== $ownerUid && ($user['gender'] ?? 'female') === 'male') {
            http_response_code(403);
            echo json_encode([
                'status' => 'error',
                'code' => 'FORBIDDEN_NOT_OWNER',
                'message' => 'تنها صاحب ترکر مجاز به دریافت خروجی از داده‌ها است.'
            ]);
            exit();
        }

        $stmt = $pdo->prepare("SELECT * FROM couple_period_settings WHERE coupleId = ?");
        $stmt->execute([$targetId]);
        $fullSettings = $stmt->fetch();

        $stmt = $pdo->prepare("SELECT * FROM period_sharing WHERE coupleId = ?");
        $stmt->execute([$targetId]);
        $fullSharing = $stmt->fetch();

        $stmt = $pdo->prepare("SELECT * FROM couple_period_logs WHERE coupleId = ? ORDER BY date DESC");
        $stmt->execute([$targetId]);
        $fullLogs = $stmt->fetchAll();

        echo json_encode([
            'status' => 'success',
            'data' => [
                'exportedAt' => date('c'),
                'ownerUid' => $user['uid'],
                'settings' => $fullSettings,
                'sharing' => $fullSharing,
                'logs' => $fullLogs
            ]
        ]);
        break;

    case 'deleteMyPeriodData':
        list($user, $targetId) = requirePeriodTarget($pdo);

        // Only owner can delete all health data
        $stmt = $pdo->prepare("SELECT trackerOwnerUid FROM couple_period_settings WHERE coupleId = ?");
        $stmt->execute([$targetId]);
        $settings = $stmt->fetch();
        $ownerUid = $settings['trackerOwnerUid'] ?? null;

        if ($ownerUid && $user['uid'] !== $ownerUid && ($user['gender'] ?? 'female') === 'male') {
            http_response_code(403);
            echo json_encode([
                'status' => 'error',
                'code' => 'FORBIDDEN_NOT_OWNER',
                'message' => 'تنها صاحب ترکر مجاز به حذف کامل اطلاعات است.'
            ]);
            exit();
        }

        $pdo->prepare("DELETE FROM couple_period_logs WHERE coupleId = ?")->execute([$targetId]);
        $pdo->prepare("DELETE FROM couple_period_settings WHERE coupleId = ?")->execute([$targetId]);
        $pdo->prepare("DELETE FROM period_sharing WHERE coupleId = ?")->execute([$targetId]);

        echo json_encode([
            'status' => 'success',
            'message' => 'تمام داده‌های ترکر با موفقیت حذف شدند.'
        ]);
        break;

    // ----------------------------------------------------
    // MEMORIES (SCOPED TO AUTHENTICATED COUPLE)
    // ----------------------------------------------------
    case 'getMemories':
        ensureMemoriesSchema($pdo);
        $user = requireCoupleMember($pdo);
        $coupleId = $user['coupleId'];

        $stmt = $pdo->prepare("SELECT * FROM memories WHERE coupleId = ? ORDER BY date DESC, createdAt DESC");
        $stmt->execute([$coupleId]);
        $memories = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $cStmt = $pdo->prepare("SELECT * FROM memory_comments WHERE coupleId = ? ORDER BY createdAt ASC");
        $cStmt->execute([$coupleId]);
        $allComments = $cStmt->fetchAll(PDO::FETCH_ASSOC);

        $commentsByMem = [];
        foreach ($allComments as $c) {
            $mId = $c['memoryId'];
            if (!isset($commentsByMem[$mId])) {
                $commentsByMem[$mId] = [];
            }
            $commentsByMem[$mId][] = $c;
        }

        foreach ($memories as &$m) {
            $mId = $m['id'];
            $m['comments'] = $commentsByMem[$mId] ?? [];
            $m['isTimeCapsule'] = (bool)($m['isTimeCapsule'] ?? 0);
            $m['unlockDate'] = $m['unlockDate'] ?? null;
            if (!empty($m['reactions'])) {
                $decoded = json_decode($m['reactions'], true);
                $m['reactions'] = is_array($decoded) ? $decoded : [];
            } else {
                $m['reactions'] = [];
            }
        }
        unset($m);

        echo json_encode(['status' => 'success', 'memories' => $memories]);
        break;

    case 'addMemory':
        ensureMemoriesSchema($pdo);
        ensurePhase2Schema($pdo);
        $user = requireCoupleMember($pdo);
        $coupleId = $user['coupleId'];
        $mem = $input['memory'] ?? [];

        if (empty($mem['title'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'عنوان خاطره الزامی است.']);
            exit();
        }

        // Server-generated ID
        $id = generateId('mem_');
        $reactionsJson = !empty($mem['reactions']) ? (is_string($mem['reactions']) ? $mem['reactions'] : json_encode($mem['reactions'], JSON_UNESCAPED_UNICODE)) : json_encode([]);

        $rawImageUrl = !empty($mem['rawImageUrl']) ? $mem['rawImageUrl'] : ($mem['imageUrl'] ?? '');
        $isTimeCapsule = !empty($mem['isTimeCapsule']) ? 1 : 0;
        $unlockDate = !empty($mem['unlockDate']) ? trim($mem['unlockDate']) : null;

        $stmt = $pdo->prepare("INSERT INTO memories (id, coupleId, title, date, imageUrl, rawImageUrl, content, isTimeCapsule, unlockDate, createdBy, createdByName, reactions, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
        $stmt->execute([
            $id,
            $coupleId,
            $mem['title'] ?? '',
            $mem['date'] ?? date('Y-m-d'),
            $mem['imageUrl'] ?? '',
            $rawImageUrl,
            $mem['content'] ?? '',
            $isTimeCapsule,
            $unlockDate,
            $user['uid'],
            $user['displayName'],
            $reactionsJson
        ]);

        echo json_encode(['status' => 'success', 'id' => $id]);
        break;

    case 'deleteMemory':
        $user = requireCoupleMember($pdo);
        $coupleId = $user['coupleId'];
        $id = trim($_GET['id'] ?? $input['id'] ?? '');

        if (!$id) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'شناسه خاطره مشخص نیست.']);
            exit();
        }

        $stmt = $pdo->prepare("DELETE FROM memory_comments WHERE memoryId = ? AND coupleId = ?");
        $stmt->execute([$id, $coupleId]);

        $stmt = $pdo->prepare("DELETE FROM memories WHERE id = ? AND coupleId = ?");
        $stmt->execute([$id, $coupleId]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'خاطره یافت نشد یا دسترسی ندارید.']);
            exit();
        }

        echo json_encode(['status' => 'success']);
        break;

    case 'toggleMemoryReaction':
        $user = requireCoupleMember($pdo);
        $coupleId = $user['coupleId'];
        $memoryId = trim($input['memoryId'] ?? '');
        $emoji = trim($input['emoji'] ?? '');

        if (!$memoryId || !$emoji) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'اطلاعات واکنش ناقص است.']);
            exit();
        }

        $stmt = $pdo->prepare("SELECT reactions FROM memories WHERE id = ? AND coupleId = ?");
        $stmt->execute([$memoryId, $coupleId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'خاطره پیدا نشد یا متعلق به زوج شما نیست.']);
            exit();
        }

        $reactions = [];
        if (!empty($row['reactions'])) {
            $decoded = json_decode($row['reactions'], true);
            if (is_array($decoded)) {
                $reactions = $decoded;
            }
        }

        $existingIdx = -1;
        foreach ($reactions as $idx => $r) {
            if ($r['uid'] === $user['uid'] && $r['emoji'] === $emoji) {
                $existingIdx = $idx;
                break;
            }
        }

        if ($existingIdx >= 0) {
            array_splice($reactions, $existingIdx, 1);
        } else {
            $reactions[] = [
                'emoji' => $emoji,
                'uid' => $user['uid'],
                'userName' => $user['displayName']
            ];
        }

        $newReactionsJson = json_encode($reactions, JSON_UNESCAPED_UNICODE);
        $uStmt = $pdo->prepare("UPDATE memories SET reactions = ? WHERE id = ? AND coupleId = ?");
        $uStmt->execute([$newReactionsJson, $memoryId, $coupleId]);

        echo json_encode(['status' => 'success', 'reactions' => $reactions]);
        break;

    case 'addMemoryComment':
        $user = requireCoupleMember($pdo);
        $coupleId = $user['coupleId'];
        $memoryId = trim($input['memoryId'] ?? '');
        $text = trim($input['text'] ?? '');

        if (!$memoryId || !$text) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'متن نظر الزامی است.']);
            exit();
        }

        // Verify memory belongs to this couple
        $mStmt = $pdo->prepare("SELECT id FROM memories WHERE id = ? AND coupleId = ?");
        $mStmt->execute([$memoryId, $coupleId]);
        if (!$mStmt->fetch()) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'خاطره پیدا نشد.']);
            exit();
        }

        $commentId = generateId('mcomm_');
        $stmt = $pdo->prepare("INSERT INTO memory_comments (id, memoryId, coupleId, uid, userName, userPhoto, text, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");
        $stmt->execute([
            $commentId,
            $memoryId,
            $coupleId,
            $user['uid'],
            $user['displayName'],
            $user['photoURL'] ?? null,
            $text
        ]);

        $cStmt = $pdo->prepare("SELECT * FROM memory_comments WHERE id = ?");
        $cStmt->execute([$commentId]);
        $comment = $cStmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode(['status' => 'success', 'comment' => $comment]);
        break;

    case 'deleteMemoryComment':
        $user = requireCoupleMember($pdo);
        $coupleId = $user['coupleId'];
        $commentId = trim($input['commentId'] ?? $_GET['commentId'] ?? '');

        if (!$commentId) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'شناسه نظر مشخص نیست.']);
            exit();
        }

        // Scoped to couple and creator
        $stmt = $pdo->prepare("DELETE FROM memory_comments WHERE id = ? AND coupleId = ? AND uid = ?");
        $stmt->execute([$commentId, $coupleId, $user['uid']]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'نظر یافت نشد یا دسترسی حذف ندارید.']);
            exit();
        }

        echo json_encode(['status' => 'success']);
        break;

    // ----------------------------------------------------
    // HEARTBEAT & REAL-TIME PRESENCE
    // ----------------------------------------------------
    case 'heartbeat':
        ensurePhase1Schema($pdo);
        ensurePhase2Schema($pdo);
        $user = requireAuth($pdo);
        $uid = $user['uid'];

        $stmt = $pdo->prepare("UPDATE users SET isOnline = 1, lastActiveAt = ? WHERE uid = ?");
        $stmt->execute([time(), $uid]);

        $partnerData = null;
        if (!empty($user['partnerUid'])) {
            $stmt = $pdo->prepare("SELECT uid, displayName, photoURL, isOnline, lastActiveAt, gender, batteryLevel, needStatus, needUpdatedAt, cheatSheet, spaceMode, spaceModeUntil FROM users WHERE uid = ?");
            $stmt->execute([$user['partnerUid']]);
            $partner = $stmt->fetch();
            if ($partner) {
                $isRecent = (time() - ((int)($partner['lastActiveAt'] ?? 0))) < 60;
                $decodedPartnerCheat = !empty($partner['cheatSheet']) ? json_decode($partner['cheatSheet'], true) : null;
                $partnerData = [
                    'uid' => $partner['uid'],
                    'displayName' => $partner['displayName'],
                    'photoURL' => $partner['photoURL'],
                    'isOnline' => $isRecent ? 1 : 0,
                    'lastActiveAt' => $partner['lastActiveAt'],
                    'gender' => $partner['gender'] ?? 'female',
                    'batteryLevel' => (int)($partner['batteryLevel'] ?? 80),
                    'needStatus' => $partner['needStatus'] ?? 'calm',
                    'needUpdatedAt' => $partner['needUpdatedAt'] ? (int)$partner['needUpdatedAt'] : null,
                    'cheatSheet' => $decodedPartnerCheat,
                    'spaceMode' => !empty($partner['spaceMode']),
                    'spaceModeUntil' => $partner['spaceModeUntil'] ? (int)$partner['spaceModeUntil'] : null
                ];
            }
        }

        // Return user's own synced emotional status
        $myStmt = $pdo->prepare("SELECT batteryLevel, needStatus, needUpdatedAt, cheatSheet, spaceMode, spaceModeUntil FROM users WHERE uid = ?");
        $myStmt->execute([$uid]);
        $myRow = $myStmt->fetch();
        $myCheat = !empty($myRow['cheatSheet']) ? json_decode($myRow['cheatSheet'], true) : null;

        echo json_encode([
            'status' => 'success', 
            'partner' => $partnerData,
            'user' => [
                'batteryLevel' => (int)($myRow['batteryLevel'] ?? 80),
                'needStatus' => $myRow['needStatus'] ?? 'calm',
                'needUpdatedAt' => $myRow['needUpdatedAt'] ? (int)$myRow['needUpdatedAt'] : null,
                'cheatSheet' => $myCheat,
                'spaceMode' => !empty($myRow['spaceMode']),
                'spaceModeUntil' => $myRow['spaceModeUntil'] ? (int)$myRow['spaceModeUntil'] : null
            ]
        ]);
        break;

    // ----------------------------------------------------
    // EMOTIONAL STATUS (PHASE 1)
    // ----------------------------------------------------
    case 'updateEmotionalStatus':
        ensurePhase1Schema($pdo);
        $user = requireAuth($pdo);
        $battery = isset($input['batteryLevel']) ? max(0, min(100, (int)$input['batteryLevel'])) : 80;
        $needStatus = trim($input['needStatus'] ?? 'calm');
        $now = time();

        $stmt = $pdo->prepare("UPDATE users SET batteryLevel = ?, needStatus = ?, needUpdatedAt = ? WHERE uid = ?");
        $stmt->execute([$battery, $needStatus, $now, $user['uid']]);

        echo json_encode([
            'status' => 'success',
            'batteryLevel' => $battery,
            'needStatus' => $needStatus,
            'needUpdatedAt' => $now
        ]);
        break;

    // ----------------------------------------------------
    // LOVE PING (LONG-DISTANCE PING - PHASE 1)
    // ----------------------------------------------------
    case 'sendLovePing':
        $user = requireCoupleMember($pdo);
        $coupleId = $user['coupleId'];
        $recipientUid = $user['partnerUid'] ?? '';
        $id = generateId('poke_');
        $message = trim($input['message'] ?? 'الان به یادتم بود دلم برات پر کشید! 💖✨');

        $stmt = $pdo->prepare("INSERT INTO pokes (id, coupleId, senderUid, senderName, recipientUid, message, itemId, itemTitle, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, 'love_ping', 'الان به یادتم', 0, NOW())");
        $stmt->execute([
            $id,
            $coupleId,
            $user['uid'],
            $user['displayName'],
            $recipientUid,
            $message
        ]);

        // Background Web Push Notification to partner's mobile device
        if (empty($recipientUid) && !empty($coupleId)) {
            $pStmt = $pdo->prepare("SELECT uid FROM users WHERE coupleId = ? AND uid != ? LIMIT 1");
            $pStmt->execute([$coupleId, $user['uid']]);
            $recipientUid = $pStmt->fetchColumn() ?: '';
        }

        if (!empty($recipientUid)) {
            sendPushToUser($pdo, $recipientUid, [
                'title' => 'الان به یادتم 💖',
                'body' => $user['displayName'] . ': ' . $message,
                'isLovePing' => true,
                'tag' => 'toghrool_love_ping_' . time(),
                'url' => '/'
            ]);
        }

        echo json_encode(['status' => 'success', 'id' => $id]);
        break;

    // ----------------------------------------------------
    // WHITE FLAG SIGNAL (PEACE & RECONCILIATION - PHASE 2)
    // ----------------------------------------------------
    case 'sendWhiteFlag':
        ensurePhase2Schema($pdo);
        $user = requireCoupleMember($pdo);
        $coupleId = $user['coupleId'];
        $recipientUid = $user['partnerUid'] ?? '';
        if (empty($recipientUid) && !empty($coupleId)) {
            $pStmt = $pdo->prepare("SELECT uid FROM users WHERE coupleId = ? AND uid != ? LIMIT 1");
            $pStmt->execute([$coupleId, $user['uid']]);
            $recipientUid = $pStmt->fetchColumn() ?: '';
        }

        $id = generateId('poke_');
        $message = trim($input['message'] ?? 'بیا قهر رو تموم کنیم، دلم برات تنگ شده 🕊️🤍');

        $stmt = $pdo->prepare("INSERT INTO pokes (id, coupleId, senderUid, senderName, recipientUid, message, itemId, itemTitle, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, 'white_flag', 'پرچم سفید 🏳️', 0, NOW())");
        $stmt->execute([
            $id,
            $coupleId,
            $user['uid'],
            $user['displayName'],
            $recipientUid,
            $message
        ]);

        if (!empty($recipientUid)) {
            sendPushToUser($pdo, $recipientUid, [
                'title' => '🕊️ پرچم سفید از طرف ' . $user['displayName'],
                'body' => $message,
                'isLovePing' => true,
                'tag' => 'white_flag_' . time(),
                'url' => '/'
            ]);
        }

        echo json_encode(['status' => 'success', 'id' => $id]);
        break;

    case 'acceptWhiteFlag':
        ensurePhase2Schema($pdo);
        $user = requireCoupleMember($pdo);
        $coupleId = $user['coupleId'];
        $recipientUid = $user['partnerUid'] ?? '';
        if (empty($recipientUid) && !empty($coupleId)) {
            $pStmt = $pdo->prepare("SELECT uid FROM users WHERE coupleId = ? AND uid != ? LIMIT 1");
            $pStmt->execute([$coupleId, $user['uid']]);
            $recipientUid = $pStmt->fetchColumn() ?: '';
        }

        $pokeId = trim($input['pokeId'] ?? '');
        if ($pokeId) {
            $upStmt = $pdo->prepare("UPDATE pokes SET isRead = 1 WHERE id = ? AND recipientUid = ?");
            $upStmt->execute([$pokeId, $user['uid']]);
        }

        $id = generateId('poke_');
        $replyMessage = trim($input['message'] ?? 'منم دلم برات تنگ شده بود، آتش‌بس پذیرفته شد! بیا بغلم 🫂💖');

        $stmt = $pdo->prepare("INSERT INTO pokes (id, coupleId, senderUid, senderName, recipientUid, message, itemId, itemTitle, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, 'white_flag_accepted', 'آشتی و بغل 🫂💖', 0, NOW())");
        $stmt->execute([
            $id,
            $coupleId,
            $user['uid'],
            $user['displayName'],
            $recipientUid,
            $replyMessage
        ]);

        if (!empty($recipientUid)) {
            sendPushToUser($pdo, $recipientUid, [
                'title' => '💖 آشتی پذیرفته شد!',
                'body' => $user['displayName'] . ': ' . $replyMessage,
                'isLovePing' => true,
                'tag' => 'white_flag_accepted_' . time(),
                'url' => '/'
            ]);
        }

        echo json_encode(['status' => 'success', 'id' => $id]);
        break;

    // ----------------------------------------------------
    // PARTNER CHEAT-SHEET (PHASE 2)
    // ----------------------------------------------------
    case 'updateCheatSheet':
        ensurePhase2Schema($pdo);
        $user = requireAuth($pdo);
        $cheatSheet = $input['cheatSheet'] ?? [];
        $cheatJson = json_encode($cheatSheet, JSON_UNESCAPED_UNICODE);

        $stmt = $pdo->prepare("UPDATE users SET cheatSheet = ? WHERE uid = ?");
        $stmt->execute([$cheatJson, $user['uid']]);

        echo json_encode([
            'status' => 'success',
            'cheatSheet' => $cheatSheet,
            'message' => 'تقلب‌نامه شناخت با موفقیت ذخیره شد.'
        ]);
        break;

    // ----------------------------------------------------
    // SPACE MODE (PHASE 2)
    // ----------------------------------------------------
    case 'toggleSpaceMode':
        ensurePhase2Schema($pdo);
        $user = requireAuth($pdo);
        $enable = !empty($input['enable']);
        $durationHours = isset($input['hours']) ? max(1, min(72, (int)$input['hours'])) : 4;
        $until = $enable ? (time() + ($durationHours * 3600)) : null;

        $stmt = $pdo->prepare("UPDATE users SET spaceMode = ?, spaceModeUntil = ? WHERE uid = ?");
        $stmt->execute([$enable ? 1 : 0, $until, $user['uid']]);

        if ($enable && !empty($user['partnerUid'])) {
            sendPushToUser($pdo, $user['partnerUid'], [
                'title' => 'حالت خلوت و آرامش 🌿',
                'body' => $user['displayName'] . ' برای ریکاوری انرژی به کمی خلوت نیاز دارد.',
                'isLovePing' => false,
                'tag' => 'space_mode_' . time(),
                'url' => '/'
            ]);
        }

        echo json_encode([
            'status' => 'success',
            'spaceMode' => $enable,
            'spaceModeUntil' => $until
        ]);
        break;

    // ----------------------------------------------------
    // WISHLIST ITEMS (SCOPED STRICTLY TO COUPLE)
    // ----------------------------------------------------
    case 'getWishlist':
        ensurePhase1Schema($pdo);
        $user = requireCoupleMember($pdo);
        $coupleId = $user['coupleId'];

        $stmt = $pdo->prepare("SELECT * FROM wishlist WHERE coupleId = ? ORDER BY createdAt DESC");
        $stmt->execute([$coupleId]);
        $items = $stmt->fetchAll();

        foreach ($items as &$item) {
            $item['isCompleted'] = (bool)$item['isCompleted'];
            $item['progress'] = (int)$item['progress'];
            $item['budget'] = $item['budget'] ?? 'medium';
            if ($item['linkPreview']) {
                $item['linkPreview'] = json_decode($item['linkPreview'], true);
            }
        }

        echo json_encode(['status' => 'success', 'items' => $items]);
        break;

    case 'addWishlistItem':
        ensurePhase1Schema($pdo);
        $user = requireCoupleMember($pdo);
        $coupleId = $user['coupleId'];
        $item = $input['item'] ?? [];

        if (empty($item['title'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'عنوان لیست آرزو ضروری است.']);
            exit();
        }

        $id = generateId('wish_');
        $linkPreviewJson = !empty($item['linkPreview']) ? json_encode($item['linkPreview']) : null;
        $budget = in_array($item['budget'] ?? '', ['economy', 'medium', 'luxury'], true) ? $item['budget'] : 'medium';

        $stmt = $pdo->prepare("INSERT INTO wishlist (id, coupleId, title, category, budget, description, link, linkPreview, date, progress, isCompleted, createdBy, createdByName, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
        $stmt->execute([
            $id,
            $coupleId,
            $item['title'],
            $item['category'] ?? 'place',
            $budget,
            $item['description'] ?? '',
            $item['link'] ?? '',
            $linkPreviewJson,
            $item['date'] ?? null,
            (int)($item['progress'] ?? 0),
            !empty($item['isCompleted']) ? 1 : 0,
            $user['uid'],
            $user['displayName']
        ]);

        echo json_encode(['status' => 'success', 'id' => $id]);
        break;

    case 'updateWishlistItem':
        ensurePhase1Schema($pdo);
        $user = requireCoupleMember($pdo);
        $coupleId = $user['coupleId'];
        $id = $input['id'] ?? '';
        $updates = $input['updates'] ?? [];

        if (!$id) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'شناسه آرزو مشخص نشده است.']);
            exit();
        }

        $fields = [];
        $params = [];

        foreach (['title', 'category', 'budget', 'description', 'link', 'date', 'completedAt'] as $f) {
            if (isset($updates[$f])) {
                $fields[] = "`$f` = ?";
                $params[] = $updates[$f];
            }
        }

        if (isset($updates['progress'])) {
            $fields[] = "`progress` = ?";
            $params[] = (int)$updates['progress'];
        }

        if (isset($updates['isCompleted'])) {
            $fields[] = "`isCompleted` = ?";
            $params[] = $updates['isCompleted'] ? 1 : 0;
        }

        if (isset($updates['linkPreview'])) {
            $fields[] = "`linkPreview` = ?";
            $params[] = json_encode($updates['linkPreview']);
        }

        if (!empty($fields)) {
            $params[] = $id;
            $params[] = $coupleId;
            $sql = "UPDATE wishlist SET " . implode(', ', $fields) . " WHERE id = ? AND coupleId = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        }

        echo json_encode(['status' => 'success']);
        break;

    case 'deleteWishlistItem':
        $user = requireCoupleMember($pdo);
        $coupleId = $user['coupleId'];
        $id = trim($_GET['id'] ?? $input['id'] ?? '');

        if (!$id) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'شناسه آیتم مشخص نیست.']);
            exit();
        }

        $stmt = $pdo->prepare("DELETE FROM wishlist WHERE id = ? AND coupleId = ?");
        $stmt->execute([$id, $coupleId]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'آیتم یافت نشد یا متعلق به زوج شما نیست.']);
            exit();
        }

        echo json_encode(['status' => 'success']);
        break;

    // ----------------------------------------------------
    // POKES / NOTIFICATIONS (SCOPED STRICTLY TO COUPLE)
    // ----------------------------------------------------
    case 'getPokes':
        $user = requireCoupleMember($pdo);
        $coupleId = $user['coupleId'];

        $stmt = $pdo->prepare("SELECT * FROM pokes WHERE coupleId = ? AND (recipientUid = ? OR recipientUid = '') ORDER BY createdAt DESC LIMIT 50");
        $stmt->execute([$coupleId, $user['uid']]);
        $pokes = $stmt->fetchAll();

        foreach ($pokes as &$p) {
            $p['read'] = (bool)$p['isRead'];
        }

        echo json_encode(['status' => 'success', 'pokes' => $pokes]);
        break;

    case 'sendPoke':
        $user = requireCoupleMember($pdo);
        $coupleId = $user['coupleId'];
        $poke = $input['poke'] ?? [];

        $id = generateId('poke_');
        $recipientUid = $user['partnerUid'] ?? '';

        $stmt = $pdo->prepare("INSERT INTO pokes (id, coupleId, senderUid, senderName, recipientUid, message, itemId, itemTitle, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())");
        $stmt->execute([
            $id,
            $coupleId,
            $user['uid'],
            $user['displayName'],
            $recipientUid,
            $poke['message'] ?? '',
            $poke['itemId'] ?? '',
            $poke['itemTitle'] ?? ''
        ]);

        // Background Web Push Notification to partner's mobile device
        if (empty($recipientUid) && !empty($coupleId)) {
            $pStmt = $pdo->prepare("SELECT uid FROM users WHERE coupleId = ? AND uid != ? LIMIT 1");
            $pStmt->execute([$coupleId, $user['uid']]);
            $recipientUid = $pStmt->fetchColumn() ?: '';
        }

        if (!empty($recipientUid)) {
            $pokeTitle = !empty($poke['itemTitle']) ? ('یادآوری: ' . $poke['itemTitle']) : ('یادآوری از طرف ' . $user['displayName']);
            $pokeBody = !empty($poke['message']) ? $poke['message'] : ($user['displayName'] . ' یک یادآوری برای شما فرستاد.');
            sendPushToUser($pdo, $recipientUid, [
                'title' => $pokeTitle,
                'body' => $pokeBody,
                'isLovePing' => false,
                'tag' => 'toghrool_poke_' . time(),
                'url' => '/'
            ]);
        }

        echo json_encode(['status' => 'success', 'id' => $id]);
        break;

    case 'markPokeRead':
        $user = requireCoupleMember($pdo);
        $coupleId = $user['coupleId'];
        $id = trim($input['id'] ?? $_GET['id'] ?? '');

        if (!$id) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'شناسه مشخص نیست.']);
            exit();
        }

        $stmt = $pdo->prepare("UPDATE pokes SET isRead = 1 WHERE id = ? AND coupleId = ? AND recipientUid = ?");
        $stmt->execute([$id, $coupleId, $user['uid']]);

        echo json_encode(['status' => 'success']);
        break;

    // ----------------------------------------------------
    // PRIVATE EXPENSES & BUDGETS (USER-SCOPED ONLY)
    // ----------------------------------------------------
    case 'getExpenses':
        $user = requireAuth($pdo);
        $stmt = $pdo->prepare("SELECT * FROM private_expenses WHERE userId = ? ORDER BY date DESC, createdAt DESC");
        $stmt->execute([$user['uid']]);
        $expenses = $stmt->fetchAll();
        foreach ($expenses as &$exp) {
            $exp['amount'] = (float)$exp['amount'];
        }
        echo json_encode(['status' => 'success', 'expenses' => $expenses]);
        break;

    case 'addExpense':
        $user = requireAuth($pdo);
        $exp = $input['expense'] ?? [];
        if (empty($exp['amount']) || empty($exp['category'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'مبلغ و دسته‌بندی هزینه الزامی است.']);
            exit();
        }
        $id = generateId('exp_');
        $stmt = $pdo->prepare("INSERT INTO private_expenses (id, userId, amount, category, description, date, type, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");
        $stmt->execute([
            $id,
            $user['uid'],
            (float)($exp['amount'] ?? 0),
            $exp['category'] ?? '',
            $exp['description'] ?? '',
            $exp['date'] ?? date('Y-m-d'),
            $exp['type'] ?? 'expense'
        ]);
        echo json_encode(['status' => 'success', 'id' => $id]);
        break;

    case 'deleteExpense':
        $user = requireAuth($pdo);
        $id = trim($input['id'] ?? $_GET['id'] ?? '');
        if (!$id) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'شناسه هزینه الزامی است.']);
            exit();
        }
        $stmt = $pdo->prepare("DELETE FROM private_expenses WHERE id = ? AND userId = ?");
        $stmt->execute([$id, $user['uid']]);
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'تراکنش یافت نشد یا دسترسی ندارید.']);
            exit();
        }
        echo json_encode(['status' => 'success']);
        break;

    case 'getBudget':
        $user = requireAuth($pdo);
        $stmt = $pdo->prepare("SELECT * FROM private_budgets WHERE userId = ?");
        $stmt->execute([$user['uid']]);
        $row = $stmt->fetch();
        $budget = [
            'userId' => $user['uid'],
            'budgets' => [],
            'monthlyIncomeGoal' => 0
        ];
        if ($row) {
            $budget['budgets'] = !empty($row['budgets']) ? json_decode($row['budgets'], true) : [];
            $budget['monthlyIncomeGoal'] = (float)($row['monthlyIncomeGoal'] ?? 0);
        }
        echo json_encode(['status' => 'success', 'budget' => $budget]);
        break;

    case 'saveBudget':
        $user = requireAuth($pdo);
        $budgets = !empty($input['budgets']) ? (is_string($input['budgets']) ? $input['budgets'] : json_encode($input['budgets'], JSON_UNESCAPED_UNICODE)) : '{}';
        $goal = (float)($input['monthlyIncomeGoal'] ?? 0);
        $stmt = $pdo->prepare("INSERT INTO private_budgets (userId, budgets, monthlyIncomeGoal, updatedAt) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE budgets = VALUES(budgets), monthlyIncomeGoal = VALUES(monthlyIncomeGoal), updatedAt = NOW()");
        $stmt->execute([$user['uid'], $budgets, $goal]);
        echo json_encode(['status' => 'success']);
        break;

    // ----------------------------------------------------
    // PHASE 2: DAILY INTIMACY QUESTION & BLIND REVEAL
    // ----------------------------------------------------
    case 'getDailyQuestion':
        ensurePhase2Schema($pdo);
        $user = requireCoupleMember($pdo);
        $coupleId = $user['coupleId'];
        $myUid = $user['uid'];
        
        $date = trim($_GET['date'] ?? $input['date'] ?? '');
        if (!$date) {
            $tz = new DateTimeZone('Asia/Tehran');
            $now = new DateTime('now', $tz);
            $date = $now->format('Y-m-d');
        }

        $stmt = $pdo->prepare("SELECT * FROM daily_answers WHERE coupleId = ? AND questionDate = ? LIMIT 1");
        $stmt->execute([$coupleId, $date]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        $myAnswer = null;
        $myAnsweredAt = null;
        $partnerAnswer = null;
        $partnerAnsweredAt = null;
        $hasPartnerAnswered = false;
        $isRevealed = false;

        if ($row) {
            $isRevealed = (bool)$row['isRevealed'];
            if ($row['user1Uid'] === $myUid) {
                $myAnswer = $row['user1Answer'];
                $myAnsweredAt = $row['user1AnsweredAt'] ? (int)$row['user1AnsweredAt'] : null;
                $hasPartnerAnswered = !empty($row['user2Answer']);
                $partnerAnsweredAt = $row['user2AnsweredAt'] ? (int)$row['user2AnsweredAt'] : null;
                if ($isRevealed) {
                    $partnerAnswer = $row['user2Answer'];
                }
            } else if ($row['user2Uid'] === $myUid) {
                $myAnswer = $row['user2Answer'];
                $myAnsweredAt = $row['user2AnsweredAt'] ? (int)$row['user2AnsweredAt'] : null;
                $hasPartnerAnswered = !empty($row['user1Answer']);
                $partnerAnsweredAt = $row['user1AnsweredAt'] ? (int)$row['user1AnsweredAt'] : null;
                if ($isRevealed) {
                    $partnerAnswer = $row['user1Answer'];
                }
            } else {
                $hasPartnerAnswered = !empty($row['user1Answer']);
                $partnerAnsweredAt = $row['user1AnsweredAt'] ? (int)$row['user1AnsweredAt'] : null;
            }
        }

        echo json_encode([
            'status' => 'success',
            'date' => $date,
            'myAnswer' => $myAnswer,
            'myAnsweredAt' => $myAnsweredAt,
            'hasPartnerAnswered' => $hasPartnerAnswered,
            'partnerAnswer' => $partnerAnswer,
            'partnerAnsweredAt' => $partnerAnsweredAt,
            'isRevealed' => $isRevealed
        ]);
        break;

    case 'answerDailyQuestion':
        ensurePhase2Schema($pdo);
        $user = requireCoupleMember($pdo);
        $coupleId = $user['coupleId'];
        $myUid = $user['uid'];
        $partnerUid = $user['partnerUid'] ?? '';
        $questionId = (int)($input['questionId'] ?? 1);
        $answer = trim($input['answer'] ?? '');
        $now = time();

        $date = trim($input['date'] ?? '');
        if (!$date) {
            $tz = new DateTimeZone('Asia/Tehran');
            $dt = new DateTime('now', $tz);
            $date = $dt->format('Y-m-d');
        }

        if (empty($answer)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'متن پاسخ نمی‌تواند خالی باشد.']);
            exit();
        }

        $stmt = $pdo->prepare("SELECT * FROM daily_answers WHERE coupleId = ? AND questionDate = ? LIMIT 1");
        $stmt->execute([$coupleId, $date]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        $isRevealed = false;
        $partnerAnswer = null;

        if (!$row) {
            // First partner answering
            $id = generateId('dans_');
            $ins = $pdo->prepare("INSERT INTO daily_answers (id, coupleId, questionId, questionDate, user1Uid, user1Answer, user1AnsweredAt, isRevealed, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())");
            $ins->execute([$id, $coupleId, $questionId, $date, $myUid, $answer, $now]);

            if ($partnerUid) {
                $pokeId = generateId('poke_');
                $pStmt = $pdo->prepare("INSERT INTO pokes (id, coupleId, senderUid, senderName, recipientUid, message, itemId, itemTitle, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, 'daily_q', 'سوال روزانه صمیمیت', 0, NOW())");
                $pStmt->execute([
                    $pokeId,
                    $coupleId,
                    $myUid,
                    $user['displayName'],
                    $partnerUid,
                    "پارتنر شما به سوال صمیمیت امروز پاسخ داد! نوبت شماست که پاسخ بدید تا قفل جواب‌ها باز بشه 🎁✨"
                ]);
            }
        } else {
            if ($row['user1Uid'] === $myUid) {
                $upd = $pdo->prepare("UPDATE daily_answers SET user1Answer = ?, user1AnsweredAt = ? WHERE id = ?");
                $upd->execute([$answer, $now, $row['id']]);
                $isRevealed = (bool)$row['isRevealed'];
                if ($isRevealed) {
                    $partnerAnswer = $row['user2Answer'];
                }
            } else {
                $upd = $pdo->prepare("UPDATE daily_answers SET user2Uid = ?, user2Answer = ?, user2AnsweredAt = ?, isRevealed = 1 WHERE id = ?");
                $upd->execute([$myUid, $answer, $now, $row['id']]);
                $isRevealed = true;
                $partnerAnswer = $row['user1Answer'];

                if ($partnerUid) {
                    $pokeId = generateId('poke_');
                    $pStmt = $pdo->prepare("INSERT INTO pokes (id, coupleId, senderUid, senderName, recipientUid, message, itemId, itemTitle, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, 'daily_q_reveal', 'پاسخ‌های صمیمیت بازگشایی شد', 0, NOW())");
                    $pStmt->execute([
                        $pokeId,
                        $coupleId,
                        $myUid,
                        $user['displayName'],
                        $partnerUid,
                        "قفل پاسخ‌های سوال صمیمیت امروز بازگشایی شد! پاسخ پارتنرت رو بخون 🥰🎉"
                    ]);
                }
            }
        }

        echo json_encode([
            'status' => 'success',
            'myAnswer' => $answer,
            'myAnsweredAt' => $now,
            'partnerAnswer' => $partnerAnswer,
            'isRevealed' => $isRevealed
        ]);
        break;

    case 'getDailyQuestionsHistory':
        ensurePhase2Schema($pdo);
        $user = requireCoupleMember($pdo);
        $coupleId = $user['coupleId'];

        $stmt = $pdo->prepare("SELECT * FROM daily_answers WHERE coupleId = ? AND isRevealed = 1 ORDER BY questionDate DESC LIMIT 60");
        $stmt->execute([$coupleId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['status' => 'success', 'history' => $rows]);
        break;

    // ----------------------------------------------------
    // WEB PUSH NOTIFICATIONS (RFC 8291 / RFC 8292)
    // ----------------------------------------------------
    case 'getVapidPublicKey':
        $user = requireAuth($pdo);
        echo json_encode([
            'status' => 'success',
            'publicKey' => TOGHROOL_VAPID_PUBLIC_KEY
        ]);
        break;

    case 'savePushSubscription':
        $user = requireAuth($pdo);
        $subscription = $input['subscription'] ?? [];
        $endpoint = trim($subscription['endpoint'] ?? '');
        $keys = $subscription['keys'] ?? [];
        $p256dh = trim($keys['p256dh'] ?? '');
        $auth = trim($keys['auth'] ?? '');

        if (!$endpoint || !$p256dh || !$auth) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => 'اطلاعات اشتراک پوش نامعتبر است.'
            ]);
            exit();
        }

        $coupleId = !empty($user['coupleId']) ? $user['coupleId'] : null;
        saveUserPushSubscription($pdo, $user['uid'], $coupleId, $endpoint, $p256dh, $auth);

        echo json_encode([
            'status' => 'success',
            'message' => 'اشتراک اعلان با موفقیت ثبت شد.'
        ]);
        break;

    case 'testPushNotification':
        $user = requireAuth($pdo);
        $res = sendPushToUser($pdo, $user['uid'], [
            'title' => 'تست اعلان طغرل 🔔',
            'body' => 'اعلان پس‌زمینه با موفقیت در این دستگاه فعال شد!',
            'isLovePing' => true,
            'tag' => 'toghrool_test_' . time(),
            'url' => '/'
        ]);
        echo json_encode([
            'status' => 'success',
            'results' => $res
        ]);
        break;

    // ----------------------------------------------------
    // DEFAULT HEALTH STATUS
    // ----------------------------------------------------
    default:
        echo json_encode([
            'status' => 'online',
            'app' => 'Toghrool Couple App API',
            'version' => '2.1-hardened',
            'security' => 'Bearer token authentication enabled',
            'php' => PHP_VERSION,
            'openssl' => extension_loaded('openssl'),
            'curl' => extension_loaded('curl'),
            'ec_derive' => function_exists('openssl_pkey_derive')
        ]);
        break;
}
