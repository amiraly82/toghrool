<?php
// Configuration and Database Connection with Strict CORS and Error Isolation

// 1. CORS Whitelist
$allowedOrigins = [
    'https://toghrool.ir',
    'capacitor://localhost',
    'http://localhost',
    'https://localhost',
    'http://localhost:5173',
    'http://localhost:3000'
];

$httpOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($httpOrigin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $httpOrigin");
    header("Access-Control-Allow-Credentials: true");
    header("Vary: Origin");
} else {
    // If not explicitly in allowed list, check if from toghrool domain
    if (!empty($_SERVER['HTTP_HOST']) && strpos($_SERVER['HTTP_HOST'], 'toghrool.ir') !== false) {
        header("Access-Control-Allow-Origin: https://toghrool.ir");
        header("Vary: Origin");
    }
}

header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Token, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0");
header("Pragma: no-cache");
header("Expires: Thu, 01 Jan 1970 00:00:00 GMT");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 2. Load Database Credentials securely
$credFile = __DIR__ . '/db_credentials.php';
if (!file_exists($credFile)) {
    $credFile = dirname(__DIR__) . '/db_credentials.php';
}

if (!file_exists($credFile)) {
    error_log("CRITICAL: db_credentials.php not found.");
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'خطای پیکربندی سرور.']);
    exit();
}

$dbConfig = require $credFile;

// 3. Establish PDO connection without exposing internal errors
try {
    $dsn = "mysql:host={$dbConfig['host']};dbname={$dbConfig['dbname']};charset={$dbConfig['charset']}";
    $pdo = new PDO($dsn, $dbConfig['user'], $dbConfig['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
} catch (PDOException $e) {
    error_log("Database connection error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'خطای ارتباط با پایگاه داده. لطفاً بعداً دوباره تلاش کنید.'
    ]);
    exit();
}
