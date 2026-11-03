<?php
// Pure PHP RFC 8291 (Message Encryption for Web Push) & RFC 8292 (VAPID) Engine
// Zero external dependencies, compatible with PHP 7.4+ (OpenSSL, cURL, hash_hkdf)

define('TOGHROOL_VAPID_PUBLIC_KEY', 'BKv-s4x3z-pRv3dnK94LrN1v3ap_yO4j6QVqMEGV6s8ojg6Ej5P0laqfobJPXLy1meBcVuyFrAMiWHD6Vz0e1PU');
define('TOGHROOL_VAPID_PRIVATE_KEY_PEM', "-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEIJbI1itpndcOZtgk7SWo9IQzJCutRUHRhaUP1fM9kXjIoAoGCCqGSM49\nAwEHoUQDQgAEq/6zjHfP6lG/d2cr3gus3W/dqn/I7iPpBWowQZXqzyiODoSPk/SV\nqp+hsk9cvLWZ4FxW7IWsAyJYcPpXPR7U9Q==\n-----END EC PRIVATE KEY-----\n");
define('TOGHROOL_VAPID_SUBJECT', 'mailto:admin@toghrool.ir');

function base64UrlEncode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode($data) {
    $remainder = strlen($data) % 4;
    if ($remainder) {
        $data .= str_repeat('=', 4 - $remainder);
    }
    return base64_decode(strtr($data, '-_', '+/'));
}

// Convert OpenSSL ASN.1 DER ECDSA signature to raw 64-byte IEEE P1363 (r || s)
function derToRawSignature($der) {
    if (strlen($der) < 8 || ord($der[0]) !== 0x30) return false;
    $offset = 2;
    if (ord($der[1]) & 0x80) {
        $offset += (ord($der[1]) & 0x7f);
    }
    if (ord($der[$offset++]) !== 0x02) return false;
    $rLen = ord($der[$offset++]);
    $r = substr($der, $offset, $rLen);
    $offset += $rLen;
    if (ord($der[$offset++]) !== 0x02) return false;
    $sLen = ord($der[$offset++]);
    $s = substr($der, $offset, $sLen);

    $r = ltrim($r, "\x00");
    $s = ltrim($s, "\x00");
    $r = str_pad($r, 32, "\x00", STR_PAD_LEFT);
    $s = str_pad($s, 32, "\x00", STR_PAD_LEFT);
    return $r . $s;
}

// Generate signed VAPID JWT (RFC 8292)
function createVapidJwt($audience) {
    $header = base64UrlEncode(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
    $payload = base64UrlEncode(json_encode([
        'aud' => $audience,
        'exp' => time() + 86400,
        'sub' => TOGHROOL_VAPID_SUBJECT
    ]));

    $dataToSign = $header . '.' . $payload;
    $signatureDer = '';
    $pkey = openssl_pkey_get_private(TOGHROOL_VAPID_PRIVATE_KEY_PEM);
    if (!$pkey) return false;

    if (!openssl_sign($dataToSign, $signatureDer, $pkey, OPENSSL_ALGO_SHA256)) {
        return false;
    }

    $rawSignature = derToRawSignature($signatureDer);
    if (!$rawSignature) return false;

    return $dataToSign . '.' . base64UrlEncode($rawSignature);
}

// Encrypt Web Push message using RFC 8291 aes128gcm
function encryptWebPushPayload($payloadJsonStr, $userP256dh, $userAuth) {
    $userPublicKey = base64UrlDecode($userP256dh);
    $userAuthToken = base64UrlDecode($userAuth);
    if (strlen($userPublicKey) !== 65 || strlen($userAuthToken) !== 16) {
        return false;
    }

    // Generate ephemeral P-256 local key
    $localKey = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
    if (!$localKey) return false;

    $details = openssl_pkey_get_details($localKey);
    $localPublicKey = "\x04" . $details['ec']['x'] . $details['ec']['y']; // 65 bytes

    // Convert raw 65-byte uncompressed public key to PEM format
    $derPrefix = hex2bin("3059301306072a8648ce3d020106082a8648ce3d030107034200");
    $userPem = "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($derPrefix . $userPublicKey), 64, "\n") . "-----END PUBLIC KEY-----\n";

    // ECDH Shared Secret
    $sharedSecret = openssl_pkey_derive($userPem, $localKey);
    if (!$sharedSecret) return false;

    // 16-byte random salt
    $salt = random_bytes(16);

    // HKDF Derivation (RFC 8291)
    $keyInfo = "WebPush: info\x00" . $userPublicKey . $localPublicKey;
    $prk = hash_hkdf('sha256', $sharedSecret, 32, $keyInfo, $userAuthToken);

    $cekInfo = "Content-Encoding: aes128gcm\x00";
    $cek = hash_hkdf('sha256', $prk, 16, $cekInfo, $salt);

    $nonceInfo = "Content-Encoding: nonce\x00";
    $nonce = hash_hkdf('sha256', $prk, 12, $nonceInfo, $salt);

    // Delimiter padding: \x02 at end of plaintext
    $padded = $payloadJsonStr . "\x02";

    $tag = '';
    $ciphertext = openssl_encrypt($padded, 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag);
    if ($ciphertext === false) return false;

    // Body format: salt (16) || rs (4) || idlen (1) || key (65) || ciphertext || tag (16)
    $recordSize = pack('N', 4096);
    $idLen = pack('C', 65);
    return $salt . $recordSize . $idLen . $localPublicKey . $ciphertext . $tag;
}

// Send Web Push notification to a specific endpoint
function dispatchSingleWebPush($endpoint, $p256dh, $auth, $payloadArray) {
    $payloadJson = json_encode($payloadArray, JSON_UNESCAPED_UNICODE);
    $encryptedBody = encryptWebPushPayload($payloadJson, $p256dh, $auth);
    if (!$encryptedBody) {
        return ['success' => false, 'error' => 'encryption_failed'];
    }

    $parsed = parse_url($endpoint);
    $audience = $parsed['scheme'] . '://' . $parsed['host'];
    if (isset($parsed['port']) && $parsed['port'] != 80 && $parsed['port'] != 443) {
        $audience .= ':' . $parsed['port'];
    }

    $jwt = createVapidJwt($audience);
    if (!$jwt) {
        return ['success' => false, 'error' => 'jwt_generation_failed'];
    }

    $headers = [
        'Content-Type: application/octet-stream',
        'Content-Encoding: aes128gcm',
        'TTL: 86400',
        'Urgency: high',
        'Authorization: vapid t=' . $jwt . ',k=' . TOGHROOL_VAPID_PUBLIC_KEY
    ];

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $endpoint,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => $encryptedBody,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    $isOk = ($httpCode >= 200 && $httpCode < 300);
    return [
        'success' => $isOk,
        'httpCode' => $httpCode,
        'error' => $error,
        'expired' => ($httpCode === 404 || $httpCode === 410)
    ];
}

// Ensure database table for storing Web Push client subscriptions
function ensurePushSchema($pdo) {
    static $checked = false;
    if ($checked) return;
    $checked = true;

    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `push_subscriptions` (
            `id` VARCHAR(64) PRIMARY KEY,
            `userId` VARCHAR(64) NOT NULL,
            `coupleId` VARCHAR(128) DEFAULT NULL,
            `endpoint` TEXT NOT NULL,
            `endpointHash` VARCHAR(64) NOT NULL,
            `p256dh` VARCHAR(255) NOT NULL,
            `auth` VARCHAR(255) NOT NULL,
            `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
            `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY `uniq_user_endpoint` (`userId`, `endpointHash`),
            INDEX `idx_user` (`userId`),
            INDEX `idx_couple` (`coupleId`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Exception $e) {
        error_log("Push schema check notice: " . $e->getMessage());
    }
}

// Store or refresh a user's browser push subscription
function saveUserPushSubscription($pdo, $userId, $coupleId, $endpoint, $p256dh, $auth) {
    ensurePushSchema($pdo);
    $id = 'sub_' . bin2hex(random_bytes(10));
    $endpointHash = hash('sha256', $endpoint);

    $stmt = $pdo->prepare("INSERT INTO push_subscriptions 
        (id, userId, coupleId, endpoint, endpointHash, p256dh, auth, createdAt, updatedAt) 
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW()) 
        ON DUPLICATE KEY UPDATE 
            coupleId = VALUES(coupleId),
            endpoint = VALUES(endpoint),
            p256dh = VALUES(p256dh),
            auth = VALUES(auth),
            updatedAt = NOW()");
    return $stmt->execute([$id, $userId, $coupleId, $endpoint, $endpointHash, $p256dh, $auth]);
}

// Dispatch Web Push to all devices registered to a target user
function sendPushToUser($pdo, $targetUserId, $payloadArray) {
    if (empty($targetUserId)) return [];
    ensurePushSchema($pdo);
    try {
        $stmt = $pdo->prepare("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE userId = ?");
        $stmt->execute([$targetUserId]);
        $subs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        error_log("Error fetching push subscriptions: " . $e->getMessage());
        return [];
    }

    $results = [];
    foreach ($subs as $sub) {
        $res = dispatchSingleWebPush($sub['endpoint'], $sub['p256dh'], $sub['auth'], $payloadArray);
        $results[] = $res;
        if (!empty($res['expired'])) {
            try {
                $del = $pdo->prepare("DELETE FROM push_subscriptions WHERE id = ?");
                $del->execute([$sub['id']]);
            } catch (Exception $e) {
                // ignore
            }
        }
    }
    return $results;
}
