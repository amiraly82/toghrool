<?php
require_once __DIR__ . '/config.php';

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
    return $user;
}

// Enforce paired couple membership
function requireCoupleMember($pdo) {
    global $input;
    $user = requireAuth($pdo);
    if (empty($user['coupleId'])) {
        http_response_code(403);
        echo json_encode([
            'status' => 'error',
            'code' => 'NOT_COUPLE_MEMBER',
            'message' => 'شما هنوز به پارتنر خود متصل نشده‌اید.'
        ]);
        exit();
    }

    // Verify client did not attempt to forge another couple's ID
    $requestedCoupleId = trim($_GET['coupleId'] ?? $input['coupleId'] ?? '');
    if ($requestedCoupleId !== '' && $requestedCoupleId !== $user['coupleId']) {
        http_response_code(403);
        echo json_encode([
            'status' => 'error',
            'code' => 'FORBIDDEN_COUPLE',
            'message' => 'شما دسترسی به اطلاعات زوج دیگر را ندارید.'
        ]);
        exit();
    }

    return $user;
}

// ----------------------------------------------------
// API ACTIONS ROUTING
// ----------------------------------------------------

switch ($action) {
    // ----------------------------------------------------
    // AUTHENTICATION & SESSIONS
    // ----------------------------------------------------
    case 'register':
        $email = strtolower(trim($input['email'] ?? ''));
        $password = (string)($input['password'] ?? '');
        $displayName = trim($input['displayName'] ?? '');
        $gender = trim($input['gender'] ?? 'female');
        if (!in_array($gender, ['female', 'male'], true)) {
            $gender = 'female';
        }

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

        $stmt = $pdo->prepare("INSERT INTO users (uid, email, displayName, coupleCode, passwordHash, gender) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$uid, $email, $displayName, $coupleCode, $passwordHash, $gender]);

        // Generate 32-byte (64 hex char) random raw token & store sha256
        $rawToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);
        $tStmt = $pdo->prepare("INSERT INTO auth_tokens (token_hash, uid, createdAt, expiresAt, lastUsedAt) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())");
        $tStmt->execute([$tokenHash, $uid]);

        $stmt = $pdo->prepare("SELECT uid, email, displayName, coupleCode, partnerEmail, partnerUid, coupleId, photoURL, gender FROM users WHERE uid = ?");
        $stmt->execute([$uid]);
        $user = $stmt->fetch();

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
        $user = requireAuth($pdo);

        // Partner data sanitized: NO partner email exposed!
        $partnerData = null;
        if (!empty($user['partnerUid'])) {
            $pStmt = $pdo->prepare("SELECT uid, displayName, photoURL, isOnline, lastActiveAt, gender FROM users WHERE uid = ?");
            $pStmt->execute([$user['partnerUid']]);
            $partnerRow = $pStmt->fetch();
            if ($partnerRow) {
                $isRecent = (time() - ((int)($partnerRow['lastActiveAt'] ?? 0))) < 60;
                $partnerData = [
                    'uid' => $partnerRow['uid'],
                    'displayName' => $partnerRow['displayName'],
                    'photoURL' => $partnerRow['photoURL'],
                    'isOnline' => $isRecent ? 1 : 0,
                    'lastActiveAt' => $partnerRow['lastActiveAt'],
                    'gender' => $partnerRow['gender'] ?? 'female'
                ];
            }
        }

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

        $stmt = $pdo->prepare("SELECT uid, email, displayName, coupleCode, partnerEmail, partnerUid, coupleId, photoURL, gender FROM users WHERE uid = ?");
        $stmt->execute([$uid]);
        $updatedUser = $stmt->fetch();

        echo json_encode([
            'status' => 'success',
            'user' => $updatedUser,
            'message' => 'پروفایل با موفقیت به‌روزرسانی شد.'
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
    // PERIOD TRACKER (SENSITIVE HEALTH DATA - SCOPED STRICTLY TO COUPLE)
    // ----------------------------------------------------
    case 'getPeriodData':
        $user = requireCoupleMember($pdo);
        $targetId = $user['coupleId'];

        // Settings
        $stmt = $pdo->prepare("SELECT * FROM couple_period_settings WHERE coupleId = ?");
        $stmt->execute([$targetId]);
        $settings = $stmt->fetch();

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

        // Daily Logs
        $stmt = $pdo->prepare("SELECT * FROM couple_period_logs WHERE coupleId = ? ORDER BY date DESC");
        $stmt->execute([$targetId]);
        $rawLogs = $stmt->fetchAll();

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
        $user = requireCoupleMember($pdo);
        $targetId = $user['coupleId'];
        $settings = $input['settings'] ?? [];

        $cycleLength = (int)($settings['cycleLength'] ?? 28);
        $periodLength = (int)($settings['periodLength'] ?? 5);
        $lastPeriodStartDate = $settings['lastPeriodStartDate'] ?? date('Y-m-d');
        $goalMode = $settings['goalMode'] ?? 'track';
        $birthDate = $settings['birthDate'] ?? '2000-01-01';
        $viewMode = $settings['viewMode'] ?? 'circular';
        $updatedBy = $user['uid'];

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
        $user = requireCoupleMember($pdo);
        $targetId = $user['coupleId'];
        $log = $input['log'] ?? [];

        if (empty($log['date'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'تاریخ ثبت الزامی است.']);
            exit();
        }

        // IDs strictly generated server-side
        $id = generateId('log_');
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
        $loggedByUid = $user['uid'];
        $loggedByName = $user['displayName'];

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
        $user = requireCoupleMember($pdo);
        $targetId = $user['coupleId'];
        $id = trim($input['id'] ?? $_GET['id'] ?? '');
        $date = trim($input['date'] ?? $_GET['date'] ?? '');

        if (!$id && !$date) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'شناسه یا تاریخ مشخص نشده است.']);
            exit();
        }

        // Hardened: strictly WHERE coupleId = ?
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

    // ----------------------------------------------------
    // MEMORIES (SCOPED TO AUTHENTICATED COUPLE)
    // ----------------------------------------------------
    case 'getMemories':
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

        $stmt = $pdo->prepare("INSERT INTO memories (id, coupleId, title, date, imageUrl, content, createdBy, createdByName, reactions, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
        $stmt->execute([
            $id,
            $coupleId,
            $mem['title'] ?? '',
            $mem['date'] ?? date('Y-m-d'),
            $mem['imageUrl'] ?? '',
            $mem['content'] ?? '',
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
        $user = requireAuth($pdo);
        $uid = $user['uid'];

        $stmt = $pdo->prepare("UPDATE users SET isOnline = 1, lastActiveAt = ? WHERE uid = ?");
        $stmt->execute([time(), $uid]);

        $partnerData = null;
        if (!empty($user['partnerUid'])) {
            $stmt = $pdo->prepare("SELECT uid, displayName, photoURL, isOnline, lastActiveAt, gender FROM users WHERE uid = ?");
            $stmt->execute([$user['partnerUid']]);
            $partner = $stmt->fetch();
            if ($partner) {
                $isRecent = (time() - ((int)($partner['lastActiveAt'] ?? 0))) < 60;
                $partnerData = [
                    'uid' => $partner['uid'],
                    'displayName' => $partner['displayName'],
                    'photoURL' => $partner['photoURL'],
                    'isOnline' => $isRecent ? 1 : 0,
                    'lastActiveAt' => $partner['lastActiveAt'],
                    'gender' => $partner['gender'] ?? 'female'
                ];
            }
        }

        echo json_encode(['status' => 'success', 'partner' => $partnerData]);
        break;

    // ----------------------------------------------------
    // WISHLIST ITEMS (SCOPED STRICTLY TO COUPLE)
    // ----------------------------------------------------
    case 'getWishlist':
        $user = requireCoupleMember($pdo);
        $coupleId = $user['coupleId'];

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

        $stmt = $pdo->prepare("INSERT INTO wishlist (id, coupleId, title, category, description, link, linkPreview, date, progress, isCompleted, createdBy, createdByName, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
        $stmt->execute([
            $id,
            $coupleId,
            $item['title'],
            $item['category'] ?? 'place',
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

        foreach (['title', 'category', 'description', 'link', 'date', 'completedAt'] as $f) {
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
    // DEFAULT HEALTH STATUS
    // ----------------------------------------------------
    default:
        echo json_encode([
            'status' => 'online',
            'app' => 'Toghrool Couple App API',
            'version' => '2.1-hardened',
            'security' => 'Bearer token authentication enabled'
        ]);
        break;
}
