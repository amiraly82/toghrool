<?php
require_once __DIR__ . '/config.php';

// Helper to get JSON input
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $_GET['action'] ?? $input['action'] ?? '';

// Generate random unique ID string
function generateId($prefix = '') {
    return $prefix . bin2hex(random_bytes(10));
}

function generateCoupleCode() {
    return strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
}

// Self-healing database schema: ensure tables & columns exist
function ensureDatabaseSchema($pdo) {
    static $ensured = false;
    if ($ensured) return;

    try {
        try {
            $pdo->exec("ALTER TABLE users ADD COLUMN gender VARCHAR(16) DEFAULT NULL");
        } catch (Exception $e) {}

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `users` (
              `gender` varchar(16) DEFAULT NULL,
              `uid` varchar(64) NOT NULL,
              `email` varchar(255) NOT NULL,
              `displayName` varchar(255) NOT NULL,
              `coupleCode` varchar(32) NOT NULL,
              `partnerEmail` varchar(255) DEFAULT NULL,
              `partnerUid` varchar(64) DEFAULT NULL,
              `coupleId` varchar(128) DEFAULT NULL,
              `passwordHash` varchar(255) NOT NULL,
              `photoURL` longtext DEFAULT NULL,
              `isOnline` tinyint(1) DEFAULT 0,
              `lastActiveAt` bigint(20) DEFAULT NULL,
              PRIMARY KEY (`uid`),
              UNIQUE KEY `email` (`email`),
              UNIQUE KEY `coupleCode` (`coupleCode`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `couples` (
              `id` varchar(128) NOT NULL,
              `partner1Uid` varchar(64) NOT NULL,
              `partner1Email` varchar(255) NOT NULL,
              `partner1Name` varchar(255) NOT NULL,
              `partner2Uid` varchar(64) DEFAULT NULL,
              `partner2Email` varchar(255) DEFAULT NULL,
              `partner2Name` varchar(255) DEFAULT NULL,
              `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `wishlist` (
              `id` varchar(64) NOT NULL,
              `coupleId` varchar(128) NOT NULL,
              `title` varchar(255) NOT NULL,
              `category` varchar(64) NOT NULL DEFAULT 'place',
              `description` text DEFAULT NULL,
              `link` text DEFAULT NULL,
              `linkPreview` json DEFAULT NULL,
              `date` varchar(32) DEFAULT NULL,
              `progress` int(11) DEFAULT 0,
              `isCompleted` tinyint(1) DEFAULT 0,
              `completedAt` varchar(64) DEFAULT NULL,
              `createdBy` varchar(64) NOT NULL,
              `createdByName` varchar(255) NOT NULL,
              `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (`id`),
              KEY `coupleId` (`coupleId`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `pokes` (
              `id` varchar(64) NOT NULL,
              `coupleId` varchar(128) NOT NULL,
              `senderUid` varchar(64) NOT NULL,
              `senderName` varchar(255) NOT NULL,
              `recipientUid` varchar(64) NOT NULL,
              `message` text DEFAULT NULL,
              `itemId` varchar(64) NOT NULL,
              `itemTitle` varchar(255) NOT NULL,
              `isRead` tinyint(1) DEFAULT 0,
              `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (`id`),
              KEY `coupleId` (`coupleId`),
              KEY `recipientUid` (`recipientUid`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `memories` (
              `id` varchar(64) NOT NULL,
              `coupleId` varchar(128) NOT NULL,
              `title` varchar(255) NOT NULL,
              `date` varchar(64) NOT NULL,
              `imageUrl` longtext DEFAULT NULL,
              `content` text NOT NULL,
              `createdBy` varchar(64) NOT NULL,
              `createdByName` varchar(255) NOT NULL,
              `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (`id`),
              KEY `coupleId` (`coupleId`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `couple_period_settings` (
              `coupleId` varchar(128) NOT NULL,
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

            CREATE TABLE IF NOT EXISTS `couple_period_logs` (
              `id` varchar(64) NOT NULL,
              `coupleId` varchar(128) NOT NULL,
              `date` varchar(32) NOT NULL,
              `isPeriodDay` tinyint(1) DEFAULT 0,
              `isPeriodStart` tinyint(1) DEFAULT 0,
              `flow` varchar(32) DEFAULT 'none',
              `moods` json DEFAULT NULL,
              `symptoms` json DEFAULT NULL,
              `discharge` varchar(32) DEFAULT 'none',
              `sex` varchar(32) DEFAULT 'none',
              `ovulationTestResult` varchar(32) DEFAULT 'none',
              `pregnancyTestResult` varchar(32) DEFAULT 'none',
              `waterGlasses` int(11) DEFAULT 4,
              `notes` text DEFAULT NULL,
              `loggedByUid` varchar(64) DEFAULT NULL,
              `loggedByName` varchar(255) DEFAULT NULL,
              `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (`id`),
              UNIQUE KEY `unique_couple_date` (`coupleId`, `date`),
              KEY `idx_couple` (`coupleId`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        try {
            $pdo->exec("ALTER TABLE users MODIFY photoURL LONGTEXT NULL");
            $pdo->exec("ALTER TABLE memories MODIFY imageUrl LONGTEXT NULL");
            $pdo->exec("ALTER TABLE memories ADD COLUMN reactions LONGTEXT DEFAULT NULL");
        } catch (Exception $ign) {}

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `memory_comments` (
              `id` varchar(64) NOT NULL,
              `memoryId` varchar(64) NOT NULL,
              `coupleId` varchar(128) NOT NULL,
              `uid` varchar(64) NOT NULL,
              `userName` varchar(255) NOT NULL,
              `userPhoto` varchar(255) DEFAULT NULL,
              `text` text NOT NULL,
              `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (`id`),
              KEY `idx_memory` (`memoryId`),
              KEY `idx_couple` (`coupleId`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        $ensured = true;
    } catch (Exception $e) {
        // Schema check logged
    }
}

ensureDatabaseSchema($pdo);

switch ($action) {
    // ----------------------------------------------------
    // AUTHENTICATION & USER MANAGEMENT
    // ----------------------------------------------------
    case 'register':
        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';
        $displayName = trim($input['displayName'] ?? '');
        $gender = trim($input['gender'] ?? 'female');
        if (!in_array($gender, ['female', 'male'])) {
            $gender = 'female';
        }

        if (!$email || !$password || !$displayName) {
            echo json_encode(['status' => 'error', 'message' => 'لطفاً تمامی فیلدها را پر کنید.']);
            exit();
        }

        // Check if email exists
        $stmt = $pdo->prepare("SELECT uid FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            echo json_encode(['status' => 'error', 'message' => 'این ایمیل قبلاً ثبت نام کرده است.']);
            exit();
        }

        $uid = generateId('usr_');
        $coupleCode = generateCoupleCode();
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $pdo->prepare("INSERT INTO users (uid, email, displayName, coupleCode, passwordHash, gender) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$uid, $email, $displayName, $coupleCode, $passwordHash, $gender]);

        $stmt = $pdo->prepare("SELECT uid, email, displayName, coupleCode, partnerEmail, partnerUid, coupleId, photoURL, gender FROM users WHERE uid = ?");
        $stmt->execute([$uid]);
        $user = $stmt->fetch();

        echo json_encode(['status' => 'success', 'user' => $user]);
        break;

    case 'login':
        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';

        if (!$email || !$password) {
            echo json_encode(['status' => 'error', 'message' => 'لطفاً ایمیل و رمز عبور را وارد کنید.']);
            exit();
        }

        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        $passwordMatches = false;
        if ($user) {
            if ($password === $user['passwordHash']) {
                $passwordMatches = true;
            } else if (password_verify($password, $user['passwordHash'])) {
                $passwordMatches = true;
            }
        }

        if (!$user || !$passwordMatches) {
            echo json_encode(['status' => 'error', 'message' => 'ایمیل یا رمز عبور اشتباه است.']);
            exit();
        }

        unset($user['passwordHash']);
        echo json_encode(['status' => 'success', 'user' => $user]);
        break;

    case 'demoLogin':
        $partnerNumber = (int)($input['partnerNumber'] ?? 1);
        $demoEmail1 = "demo_partner1@wishlist.com";
        $demoEmail2 = "demo_partner2@wishlist.com";
        $uid1 = "demo_user_p1";
        $uid2 = "demo_user_p2";
        $coupleId = "couple_demo_user_p1_demo_user_p2";

        try {
            // 1. Ensure Partner 1 (Amir)
            $stmt = $pdo->prepare("SELECT uid FROM users WHERE uid = ?");
            $stmt->execute([$uid1]);
            if (!$stmt->fetch()) {
                $stmt = $pdo->prepare("INSERT INTO users (uid, email, displayName, coupleCode, partnerEmail, partnerUid, coupleId, passwordHash, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'male')");
                $stmt->execute([$uid1, $demoEmail1, "امیر", "AMIR01", $demoEmail2, $uid2, $coupleId, "demo_password123"]);
            } else {
                $stmt = $pdo->prepare("UPDATE users SET partnerEmail = ?, partnerUid = ?, coupleId = ?, gender = 'male' WHERE uid = ?");
                $stmt->execute([$demoEmail2, $uid2, $coupleId, $uid1]);
            }

            // 2. Ensure Partner 2 (Sara)
            $stmt = $pdo->prepare("SELECT uid FROM users WHERE uid = ?");
            $stmt->execute([$uid2]);
            if (!$stmt->fetch()) {
                $stmt = $pdo->prepare("INSERT INTO users (uid, email, displayName, coupleCode, partnerEmail, partnerUid, coupleId, passwordHash, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'female')");
                $stmt->execute([$uid2, $demoEmail2, "سارا", "SARA02", $demoEmail1, $uid1, $coupleId, "demo_password123"]);
            } else {
                $stmt = $pdo->prepare("UPDATE users SET partnerEmail = ?, partnerUid = ?, coupleId = ?, gender = 'female' WHERE uid = ?");
                $stmt->execute([$demoEmail1, $uid1, $coupleId, $uid2]);
            }

            // 3. Ensure Couple Space
            $stmt = $pdo->prepare("SELECT id FROM couples WHERE id = ?");
            $stmt->execute([$coupleId]);
            if (!$stmt->fetch()) {
                $stmt = $pdo->prepare("INSERT INTO couples (id, partner1Uid, partner1Email, partner1Name, partner2Uid, partner2Email, partner2Name) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$coupleId, $uid1, $demoEmail1, "امیر", $uid2, $demoEmail2, "سارا"]);
            }

            $targetUid = $partnerNumber === 1 ? $uid1 : $uid2;
            $stmt = $pdo->prepare("SELECT uid, email, displayName, coupleCode, partnerEmail, partnerUid, coupleId, photoURL, gender FROM users WHERE uid = ?");
            $stmt->execute([$targetUid]);
            $user = $stmt->fetch();

            echo json_encode(['status' => 'success', 'user' => $user]);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        break;

    case 'getUser':
        $uid = $_GET['uid'] ?? $input['uid'] ?? '';
        if (!$uid) {
            echo json_encode(['status' => 'error', 'message' => 'کاربر یافت نشد.']);
            exit();
        }

        $stmt = $pdo->prepare("SELECT uid, email, displayName, coupleCode, partnerEmail, partnerUid, coupleId, photoURL, gender FROM users WHERE uid = ?");
        $stmt->execute([$uid]);
        $user = $stmt->fetch();

        if ($user) {
            echo json_encode(['status' => 'success', 'user' => $user]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'کاربر پیدا نشد.']);
        }
        break;

    case 'updateProfile':
        $uid = trim($input['uid'] ?? '');
        $displayName = trim($input['displayName'] ?? '');
        $photoURL = trim($input['photoURL'] ?? '');

        if (!$uid) {
            echo json_encode(['status' => 'error', 'message' => 'شناسه کاربری نامعتبر است.']);
            exit();
        }

        if (!$displayName) {
            echo json_encode(['status' => 'error', 'message' => 'نام نمایشی الزامی است.']);
            exit();
        }

        $gender = trim($input['gender'] ?? '');
        try {
            if ($gender && in_array($gender, ['female', 'male'])) {
                $stmt = $pdo->prepare("UPDATE users SET displayName = ?, photoURL = ?, gender = ? WHERE uid = ?");
                $stmt->execute([$displayName, $photoURL, $gender, $uid]);
            } else {
                $stmt = $pdo->prepare("UPDATE users SET displayName = ?, photoURL = ? WHERE uid = ?");
                $stmt->execute([$displayName, $photoURL, $uid]);
            }

            // If user is part of a couple, update name in couples table as well
            $stmt = $pdo->prepare("UPDATE couples SET partner1Name = ? WHERE partner1Uid = ?");
            $stmt->execute([$displayName, $uid]);
            $stmt = $pdo->prepare("UPDATE couples SET partner2Name = ? WHERE partner2Uid = ?");
            $stmt->execute([$displayName, $uid]);

            $stmt = $pdo->prepare("SELECT uid, email, displayName, coupleCode, partnerEmail, partnerUid, coupleId, photoURL, gender FROM users WHERE uid = ?");
            $stmt->execute([$uid]);
            $user = $stmt->fetch();

            echo json_encode(['status' => 'success', 'user' => $user, 'message' => 'پروفایل با موفقیت به‌روزرسانی شد.']);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'خطای پایگاه داده: ' . $e->getMessage()]);
        }
        break;

    case 'unpair':
        $uid = trim($input['uid'] ?? '');
        if (!$uid) {
            echo json_encode(['status' => 'error', 'message' => 'شناسه کاربری نامعتبر است.']);
            exit();
        }

        try {
            $stmt = $pdo->prepare("SELECT partnerUid, coupleId FROM users WHERE uid = ?");
            $stmt->execute([$uid]);
            $curr = $stmt->fetch();
            if ($curr) {
                $partnerUid = $curr['partnerUid'];
                $coupleId = $curr['coupleId'];

                $pdo->prepare("UPDATE users SET partnerEmail = NULL, partnerUid = NULL, coupleId = NULL WHERE uid = ?")->execute([$uid]);
                if ($partnerUid) {
                    $pdo->prepare("UPDATE users SET partnerEmail = NULL, partnerUid = NULL, coupleId = NULL WHERE uid = ?")->execute([$partnerUid]);
                }
                if ($coupleId) {
                    $pdo->prepare("DELETE FROM couples WHERE id = ?")->execute([$coupleId]);
                }
            }
            echo json_encode(['status' => 'success', 'message' => 'اتصال با موفقیت قطع شد.']);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'خطا در قطع ارتباط: ' . $e->getMessage()]);
        }
        break;

    // ----------------------------------------------------
    // COUPLE PAIRING
    // ----------------------------------------------------
    case 'pairByCode':
        $myUid = $input['myUid'] ?? '';
        $code = strtoupper(trim($input['code'] ?? ''));

        if (!$myUid || !$code) {
            echo json_encode(['status' => 'error', 'message' => 'کد اتصال نامعتبر است.']);
            exit();
        }

        // Fetch my user info
        $stmt = $pdo->prepare("SELECT * FROM users WHERE uid = ?");
        $stmt->execute([$myUid]);
        $myUser = $stmt->fetch();

        if (!$myUser) {
            echo json_encode(['status' => 'error', 'message' => 'کاربر یافت نشد.']);
            exit();
        }

        if ($myUser['coupleCode'] === $code) {
            echo json_encode(['status' => 'error', 'message' => 'شما نمی‌توانید کد خودتان را وارد کنید!']);
            exit();
        }

        // Find partner by code
        $stmt = $pdo->prepare("SELECT * FROM users WHERE coupleCode = ?");
        $stmt->execute([$code]);
        $partner = $stmt->fetch();

        if (!$partner) {
            echo json_encode(['status' => 'error', 'message' => 'کد زوجین یافت نشد. لطفاً کد را بررسی کنید.']);
            exit();
        }

        $coupleId = 'couple_' . min($myUid, $partner['uid']) . '_' . max($myUid, $partner['uid']);

        // Update my user profile
        $stmt = $pdo->prepare("UPDATE users SET partnerUid = ?, partnerEmail = ?, coupleId = ? WHERE uid = ?");
        $stmt->execute([$partner['uid'], $partner['email'], $coupleId, $myUid]);

        // Update partner user profile
        $stmt = $pdo->prepare("UPDATE users SET partnerUid = ?, partnerEmail = ?, coupleId = ? WHERE uid = ?");
        $stmt->execute([$myUid, $myUser['email'], $coupleId, $partner['uid']]);

        // Insert or update couples table
        $stmt = $pdo->prepare("REPLACE INTO couples (id, partner1Uid, partner1Email, partner1Name, partner2Uid, partner2Email, partner2Name) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $coupleId,
            $myUid,
            $myUser['email'],
            $myUser['displayName'],
            $partner['uid'],
            $partner['email'],
            $partner['displayName']
        ]);

        echo json_encode(['status' => 'success', 'coupleId' => $coupleId]);
        break;

    // ----------------------------------------------------
    // HOST IMAGE UPLOAD (AVATARS & MEMORIES ON HOST ONLY)
    // ----------------------------------------------------
    case 'uploadImage':
        $folder = preg_replace('/[^a-zA-Z0-9_-]/', '', $input['folder'] ?? $_POST['folder'] ?? 'avatars');
        if (!in_array($folder, ['avatars', 'memories'])) {
            $folder = 'avatars';
        }

        $uploadBase = __DIR__ . '/uploads';
        $uploadDir = $uploadBase . '/' . $folder;

        if (!is_dir($uploadDir)) {
            @mkdir($uploadDir, 0755, true);
        }

        $imageRawData = null;
        $extension = 'jpg';

        // 1. Check multipart file upload
        if (isset($_FILES['image']) && is_uploaded_file($_FILES['image']['tmp_name'])) {
            $tmpPath = $_FILES['image']['tmp_name'];
            $imageRawData = file_get_contents($tmpPath);
            $mime = function_exists('mime_content_type') ? mime_content_type($tmpPath) : '';
            if (strpos($mime, 'png') !== false) $extension = 'png';
            elseif (strpos($mime, 'webp') !== false) $extension = 'webp';
            elseif (strpos($mime, 'gif') !== false) $extension = 'gif';
            else $extension = 'jpg';
        } 
        // 2. Check Base64 payload
        else {
            $base64 = $input['image'] ?? $input['dataUrl'] ?? $_POST['image'] ?? '';
            if (!$base64) {
                echo json_encode(['status' => 'error', 'message' => 'تصویری دریافت نشد.']);
                exit();
            }

            if (preg_match('/^data:image\/(\w+);base64,/', $base64, $match)) {
                $type = strtolower($match[1]);
                if ($type === 'png') $extension = 'png';
                elseif ($type === 'webp') $extension = 'webp';
                elseif ($type === 'gif') $extension = 'gif';
                else $extension = 'jpg';
                $base64 = substr($base64, strpos($base64, ',') + 1);
            }

            $imageRawData = base64_decode($base64);
        }

        if (!$imageRawData || strlen($imageRawData) < 10) {
            echo json_encode(['status' => 'error', 'message' => 'داده‌های تصویر ارسالی نامعتبر است.']);
            exit();
        }

        // Max 12 MB
        if (strlen($imageRawData) > 12 * 1024 * 1024) {
            echo json_encode(['status' => 'error', 'message' => 'حجم تصویر نباید بیشتر از ۱۲ مگابایت باشد.']);
            exit();
        }

        $filename = $folder . '_' . bin2hex(random_bytes(6)) . '_' . time() . '.' . $extension;
        $destPath = $uploadDir . '/' . $filename;

        if (file_put_contents($destPath, $imageRawData) === false) {
            echo json_encode(['status' => 'error', 'message' => 'خطا در ذخیره تصویر روی هاست.']);
            exit();
        }

        // Build permanent absolute URL
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
    // PERIOD TRACKER (100% HOST & PARTNER SYNC)
    // ----------------------------------------------------
    case 'getPeriodData':
        $coupleId = trim($_GET['coupleId'] ?? $input['coupleId'] ?? '');
        $uid = trim($_GET['uid'] ?? $input['uid'] ?? '');
        $targetId = $coupleId ?: $uid;

        if (!$targetId) {
            echo json_encode(['status' => 'error', 'message' => 'شناسه زوج نامعتبر است.']);
            exit();
        }

        // Fetch settings
        $stmt = $pdo->prepare("SELECT * FROM couple_period_settings WHERE coupleId = ?");
        $stmt->execute([$targetId]);
        $settings = $stmt->fetch();

        // Check by uid if couple settings not found
        if (!$settings && $uid && $uid !== $targetId) {
            $stmt = $pdo->prepare("SELECT * FROM couple_period_settings WHERE coupleId = ?");
            $stmt->execute([$uid]);
            $settings = $stmt->fetch();
        }

        if (!$settings) {
            $settings = [
                'cycleLength' => 28,
                'periodLength' => 5,
                'lastPeriodStartDate' => date('Y-m-d'),
                'goalMode' => 'track',
                'birthDate' => '2000-01-01',
                'viewMode' => 'circular'
            ];
        } else {
            $settings['cycleLength'] = (int)($settings['cycleLength'] ?: 28);
            $settings['periodLength'] = (int)($settings['periodLength'] ?: 5);
        }

        // Fetch daily logs
        $stmt = $pdo->prepare("SELECT * FROM couple_period_logs WHERE coupleId = ? ORDER BY date DESC");
        $stmt->execute([$targetId]);
        $rawLogs = $stmt->fetchAll();

        if (empty($rawLogs) && $uid && $uid !== $targetId) {
            $stmt = $pdo->prepare("SELECT * FROM couple_period_logs WHERE coupleId = ? ORDER BY date DESC");
            $stmt->execute([$uid]);
            $rawLogs = $stmt->fetchAll();
        }

        $logs = [];
        foreach ($rawLogs as $row) {
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
                'waterGlasses' => (int)($row['waterGlasses'] ?? 4),
                'notes' => $row['notes'] ?: '',
                'loggedByUid' => $row['loggedByUid'] ?: '',
                'loggedByName' => $row['loggedByName'] ?: '',
                'createdAt' => $row['createdAt'] ?? date('c')
            ];
        }

        echo json_encode([
            'status' => 'success',
            'settings' => $settings,
            'logs' => $logs
        ]);
        break;

    case 'savePeriodSettings':
        $coupleId = trim($input['coupleId'] ?? '');
        $uid = trim($input['uid'] ?? '');
        $targetId = $coupleId ?: $uid;
        $settings = $input['settings'] ?? [];

        if (!$targetId) {
            echo json_encode(['status' => 'error', 'message' => 'شناسه زوج نامعتبر است.']);
            exit();
        }

        $cycleLength = (int)($settings['cycleLength'] ?? 28);
        $periodLength = (int)($settings['periodLength'] ?? 5);
        $lastPeriodStartDate = $settings['lastPeriodStartDate'] ?? date('Y-m-d');
        $goalMode = $settings['goalMode'] ?? 'track';
        $birthDate = $settings['birthDate'] ?? '2000-01-01';
        $viewMode = $settings['viewMode'] ?? 'circular';
        $updatedBy = $settings['updatedBy'] ?? $uid;

        $stmt = $pdo->prepare("
            INSERT INTO couple_period_settings 
                (coupleId, cycleLength, periodLength, lastPeriodStartDate, goalMode, birthDate, viewMode, updatedBy, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
                cycleLength = VALUES(cycleLength),
                periodLength = VALUES(periodLength),
                lastPeriodStartDate = VALUES(lastPeriodStartDate),
                goalMode = VALUES(goalMode),
                birthDate = VALUES(birthDate),
                viewMode = VALUES(viewMode),
                updatedBy = VALUES(updatedBy),
                updatedAt = NOW()
        ");
        $stmt->execute([$targetId, $cycleLength, $periodLength, $lastPeriodStartDate, $goalMode, $birthDate, $viewMode, $updatedBy]);

        echo json_encode([
            'status' => 'success',
            'settings' => [
                'cycleLength' => $cycleLength,
                'periodLength' => $periodLength,
                'lastPeriodStartDate' => $lastPeriodStartDate,
                'goalMode' => $goalMode,
                'birthDate' => $birthDate,
                'viewMode' => $viewMode
            ]
        ]);
        break;

    case 'savePeriodLog':
        $coupleId = trim($input['coupleId'] ?? '');
        $uid = trim($input['uid'] ?? '');
        $targetId = $coupleId ?: $uid;
        $log = $input['log'] ?? [];

        if (!$targetId || empty($log['date'])) {
            echo json_encode(['status' => 'error', 'message' => 'تاریخ ثبت الزامی است.']);
            exit();
        }

        $id = !empty($log['id']) ? $log['id'] : generateId('log_');
        $date = $log['date'];
        $isPeriodDay = !empty($log['isPeriodDay']) ? 1 : 0;
        $isPeriodStart = !empty($log['isPeriodStart']) ? 1 : 0;
        $flow = $log['flow'] ?? 'none';
        $moods = !empty($log['moods']) ? json_encode($log['moods']) : '[]';
        $symptoms = !empty($log['symptoms']) ? json_encode($log['symptoms']) : '[]';
        $discharge = $log['discharge'] ?? 'none';
        $sex = $log['sex'] ?? 'none';
        $ovulationTestResult = $log['ovulationTestResult'] ?? 'none';
        $pregnancyTestResult = $log['pregnancyTestResult'] ?? 'none';
        $waterGlasses = (int)($log['waterGlasses'] ?? 4);
        $notes = $log['notes'] ?? '';
        $loggedByUid = $log['loggedByUid'] ?? $uid;
        $loggedByName = $log['loggedByName'] ?? '';

        $stmt = $pdo->prepare("
            INSERT INTO couple_period_logs 
                (id, coupleId, date, isPeriodDay, isPeriodStart, flow, moods, symptoms, discharge, sex, ovulationTestResult, pregnancyTestResult, waterGlasses, notes, loggedByUid, loggedByName, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
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
                waterGlasses = VALUES(waterGlasses),
                notes = VALUES(notes),
                loggedByUid = VALUES(loggedByUid),
                loggedByName = VALUES(loggedByName)
        ");
        $stmt->execute([
            $id, $targetId, $date, $isPeriodDay, $isPeriodStart, $flow, $moods, $symptoms, $discharge, $sex, $ovulationTestResult, $pregnancyTestResult, $waterGlasses, $notes, $loggedByUid, $loggedByName
        ]);

        if ($isPeriodStart) {
            $stmt = $pdo->prepare("UPDATE couple_period_settings SET lastPeriodStartDate = ?, updatedAt = NOW() WHERE coupleId = ?");
            $stmt->execute([$date, $targetId]);
        }

        echo json_encode(['status' => 'success', 'id' => $id]);
        break;

    case 'deletePeriodLog':
        $coupleId = trim($input['coupleId'] ?? $_GET['coupleId'] ?? '');
        $uid = trim($input['uid'] ?? $_GET['uid'] ?? '');
        $targetId = $coupleId ?: $uid;
        $id = trim($input['id'] ?? $_GET['id'] ?? '');
        $date = trim($input['date'] ?? $_GET['date'] ?? '');

        if (!$targetId || (!$id && !$date)) {
            echo json_encode(['status' => 'error', 'message' => 'شناسه یا تاریخ مشخص نشده است.']);
            exit();
        }

        if ($id) {
            $stmt = $pdo->prepare("DELETE FROM couple_period_logs WHERE id = ?");
            $stmt->execute([$id]);
        } else if ($date) {
            $stmt = $pdo->prepare("DELETE FROM couple_period_logs WHERE coupleId = ? AND date = ?");
            $stmt->execute([$targetId, $date]);
        }

        echo json_encode(['status' => 'success']);
        break;

    // ----------------------------------------------------
    // MEMORIES (100% PERSISTENT IN MYSQL & RELOAD-SAFE)
    // ----------------------------------------------------
    case 'getMemories':
        $coupleId = $_GET['coupleId'] ?? $input['coupleId'] ?? '';
        if (!$coupleId) {
            echo json_encode(['status' => 'success', 'memories' => []]);
            exit();
        }

        $stmt = $pdo->prepare("SELECT * FROM memories WHERE coupleId = ? ORDER BY date DESC, createdAt DESC");
        $stmt->execute([$coupleId]);
        $memories = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch all comments for this couple's memories
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
        $mem = $input['memory'] ?? [];
        if (empty($mem['coupleId']) || empty($mem['title'])) {
            echo json_encode(['status' => 'error', 'message' => 'اطلاعات خاطره ناقص است.']);
            exit();
        }

        $id = !empty($mem['id']) ? $mem['id'] : generateId('mem_');
        $reactionsJson = !empty($mem['reactions']) ? (is_string($mem['reactions']) ? $mem['reactions'] : json_encode($mem['reactions'], JSON_UNESCAPED_UNICODE)) : json_encode([]);

        $stmt = $pdo->prepare("INSERT INTO memories (id, coupleId, title, date, imageUrl, content, createdBy, createdByName, reactions, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
        $stmt->execute([
            $id,
            $mem['coupleId'],
            $mem['title'] ?? '',
            $mem['date'] ?? date('Y-m-d'),
            $mem['imageUrl'] ?? '',
            $mem['content'] ?? '',
            $mem['createdBy'] ?? '',
            $mem['createdByName'] ?? '',
            $reactionsJson
        ]);

        echo json_encode(['status' => 'success', 'id' => $id]);
        break;

    case 'deleteMemory':
        $id = $_GET['id'] ?? $input['id'] ?? '';
        if ($id) {
            $stmt = $pdo->prepare("DELETE FROM memory_comments WHERE memoryId = ?");
            $stmt->execute([$id]);
            $stmt = $pdo->prepare("DELETE FROM memories WHERE id = ?");
            $stmt->execute([$id]);
        }
        echo json_encode(['status' => 'success']);
        break;

    case 'toggleMemoryReaction':
        $memoryId = trim($input['memoryId'] ?? '');
        $emoji = trim($input['emoji'] ?? '');
        $uid = trim($input['uid'] ?? '');
        $userName = trim($input['userName'] ?? 'پارتنر');

        if (!$memoryId || !$emoji || !$uid) {
            echo json_encode(['status' => 'error', 'message' => 'اطلاعات واکنش ناقص است.']);
            exit();
        }

        $stmt = $pdo->prepare("SELECT reactions FROM memories WHERE id = ?");
        $stmt->execute([$memoryId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            echo json_encode(['status' => 'error', 'message' => 'خاطره پیدا نشد.']);
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
            if ($r['uid'] === $uid && $r['emoji'] === $emoji) {
                $existingIdx = $idx;
                break;
            }
        }

        if ($existingIdx >= 0) {
            array_splice($reactions, $existingIdx, 1);
        } else {
            $reactions[] = [
                'emoji' => $emoji,
                'uid' => $uid,
                'userName' => $userName
            ];
        }

        $newReactionsJson = json_encode($reactions, JSON_UNESCAPED_UNICODE);
        $uStmt = $pdo->prepare("UPDATE memories SET reactions = ? WHERE id = ?");
        $uStmt->execute([$newReactionsJson, $memoryId]);

        echo json_encode(['status' => 'success', 'reactions' => $reactions]);
        break;

    case 'addMemoryComment':
        $memoryId = trim($input['memoryId'] ?? '');
        $coupleId = trim($input['coupleId'] ?? '');
        $uid = trim($input['uid'] ?? '');
        $userName = trim($input['userName'] ?? '');
        $userPhoto = trim($input['userPhoto'] ?? '');
        $text = trim($input['text'] ?? '');

        if (!$memoryId || !$coupleId || !$text || !$uid) {
            echo json_encode(['status' => 'error', 'message' => 'متن نظر و مشخصات الزامی است.']);
            exit();
        }

        $commentId = generateId('mcomm_');
        $stmt = $pdo->prepare("INSERT INTO memory_comments (id, memoryId, coupleId, uid, userName, userPhoto, text, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");
        $stmt->execute([$commentId, $memoryId, $coupleId, $uid, $userName, $userPhoto, $text]);

        $cStmt = $pdo->prepare("SELECT * FROM memory_comments WHERE id = ?");
        $cStmt->execute([$commentId]);
        $comment = $cStmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode(['status' => 'success', 'comment' => $comment]);
        break;

    case 'deleteMemoryComment':
        $commentId = trim($input['commentId'] ?? $_GET['commentId'] ?? '');
        $uid = trim($input['uid'] ?? '');

        if (!$commentId) {
            echo json_encode(['status' => 'error', 'message' => 'شناسه نظر مشخص نیست.']);
            exit();
        }

        if ($uid) {
            $stmt = $pdo->prepare("DELETE FROM memory_comments WHERE id = ? AND uid = ?");
            $stmt->execute([$commentId, $uid]);
        } else {
            $stmt = $pdo->prepare("DELETE FROM memory_comments WHERE id = ?");
            $stmt->execute([$commentId]);
        }

        echo json_encode(['status' => 'success']);
        break;

    // ----------------------------------------------------
    // HEARTBEAT & REAL-TIME PRESENCE
    // ----------------------------------------------------
    case 'heartbeat':
        $uid = trim($input['uid'] ?? $_GET['uid'] ?? '');
        $partnerUid = trim($input['partnerUid'] ?? $_GET['partnerUid'] ?? '');

        if ($uid) {
            $stmt = $pdo->prepare("UPDATE users SET isOnline = 1, lastActiveAt = ? WHERE uid = ?");
            $stmt->execute([time(), $uid]);
        }

        $partnerData = null;
        if ($partnerUid) {
            $stmt = $pdo->prepare("SELECT uid, displayName, photoURL, isOnline, lastActiveAt FROM users WHERE uid = ?");
            $stmt->execute([$partnerUid]);
            $partner = $stmt->fetch();
            if ($partner) {
                $isRecent = (time() - ($partner['lastActiveAt'] ?? 0)) < 60;
                $partnerData = [
                    'uid' => $partner['uid'],
                    'displayName' => $partner['displayName'],
                    'photoURL' => $partner['photoURL'],
                    'isOnline' => $isRecent ? 1 : 0,
                    'lastActiveAt' => $partner['lastActiveAt']
                ];
            }
        }

        echo json_encode(['status' => 'success', 'partner' => $partnerData]);
        break;

    // ----------------------------------------------------
    // WISHLIST ITEMS
    // ----------------------------------------------------
    case 'getWishlist':
        $coupleId = $_GET['coupleId'] ?? $input['coupleId'] ?? '';
        if (!$coupleId) {
            echo json_encode(['status' => 'success', 'items' => []]);
            exit();
        }

        $stmt = $pdo->prepare("SELECT * FROM wishlist WHERE coupleId = ? ORDER BY createdAt DESC");
        $stmt->execute([$coupleId]);
        $items = $stmt->fetchAll();

        foreach ($items as &$item) {
            $item['isCompleted'] = (bool)$item['isCompleted'];
            $item['progress'] = (int)$item['progress'];
            if ($item['linkPreview']) {
                $item['linkPreview'] = json_decode($item['linkPreview'], true);
            }
        }

        echo json_encode(['status' => 'success', 'items' => $items]);
        break;

    case 'addWishlistItem':
        $item = $input['item'] ?? [];
        if (empty($item['coupleId']) || empty($item['title'])) {
            echo json_encode(['status' => 'error', 'message' => 'عنوان لیست آرزو ضروری است.']);
            exit();
        }

        $id = !empty($item['id']) ? $item['id'] : generateId('wish_');
        $linkPreviewJson = !empty($item['linkPreview']) ? json_encode($item['linkPreview']) : null;

        $stmt = $pdo->prepare("INSERT INTO wishlist (id, coupleId, title, category, description, link, linkPreview, date, progress, isCompleted, createdBy, createdByName, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
        $stmt->execute([
            $id,
            $item['coupleId'],
            $item['title'],
            $item['category'] ?? 'place',
            $item['description'] ?? '',
            $item['link'] ?? '',
            $linkPreviewJson,
            $item['date'] ?? null,
            (int)($item['progress'] ?? 0),
            !empty($item['isCompleted']) ? 1 : 0,
            $item['createdBy'] ?? '',
            $item['createdByName'] ?? ''
        ]);

        echo json_encode(['status' => 'success', 'id' => $id]);
        break;

    case 'updateWishlistItem':
        $id = $input['id'] ?? '';
        $updates = $input['updates'] ?? [];

        if (!$id) {
            echo json_encode(['status' => 'error', 'message' => 'شناسه آرزو مشخص نشده است.']);
            exit();
        }

        $fields = [];
        $params = [];

        foreach (['title', 'category', 'description', 'link', 'date', 'completedAt', 'createdByName'] as $f) {
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
            $sql = "UPDATE wishlist SET " . implode(', ', $fields) . " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        }

        echo json_encode(['status' => 'success']);
        break;

    case 'deleteWishlistItem':
        $id = $_GET['id'] ?? $input['id'] ?? '';
        if ($id) {
            $stmt = $pdo->prepare("DELETE FROM wishlist WHERE id = ?");
            $stmt->execute([$id]);
        }
        echo json_encode(['status' => 'success']);
        break;

    // ----------------------------------------------------
    // POKES / NOTIFICATIONS
    // ----------------------------------------------------
    case 'getPokes':
        $coupleId = $_GET['coupleId'] ?? $input['coupleId'] ?? '';
        $recipientUid = $_GET['recipientUid'] ?? $input['recipientUid'] ?? '';
        if (!$coupleId) {
            echo json_encode(['status' => 'success', 'pokes' => []]);
            exit();
        }

        if ($recipientUid) {
            $stmt = $pdo->prepare("SELECT * FROM pokes WHERE coupleId = ? AND (recipientUid = ? OR recipientUid = '') ORDER BY createdAt DESC LIMIT 50");
            $stmt->execute([$coupleId, $recipientUid]);
        } else {
            $stmt = $pdo->prepare("SELECT * FROM pokes WHERE coupleId = ? ORDER BY createdAt DESC LIMIT 50");
            $stmt->execute([$coupleId]);
        }
        $pokes = $stmt->fetchAll();

        foreach ($pokes as &$p) {
            $p['read'] = (bool)$p['isRead'];
        }

        echo json_encode(['status' => 'success', 'pokes' => $pokes]);
        break;

    case 'sendPoke':
        $poke = $input['poke'] ?? [];
        $id = generateId('poke_');

        $stmt = $pdo->prepare("INSERT INTO pokes (id, coupleId, senderUid, senderName, recipientUid, message, itemId, itemTitle, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())");
        $stmt->execute([
            $id,
            $poke['coupleId'] ?? '',
            $poke['senderUid'] ?? '',
            $poke['senderName'] ?? '',
            $poke['recipientUid'] ?? '',
            $poke['message'] ?? '',
            $poke['itemId'] ?? '',
            $poke['itemTitle'] ?? ''
        ]);

        echo json_encode(['status' => 'success', 'id' => $id]);
        break;

    case 'markPokeRead':
        $id = $input['id'] ?? $_GET['id'] ?? '';
        if ($id) {
            $stmt = $pdo->prepare("UPDATE pokes SET isRead = 1 WHERE id = ?");
            $stmt->execute([$id]);
        }
        echo json_encode(['status' => 'success']);
        break;

    // ----------------------------------------------------
    // DEFAULT CATCH-ALL & STATUS
    // ----------------------------------------------------
    default:
        echo json_encode([
            'status' => 'online',
            'app' => 'Toghrool Couple App API',
            'version' => '2.0',
            'message' => 'PHP API endpoint is fully operational on cPanel host.',
            'db_connected' => true
        ]);
        break;
}
