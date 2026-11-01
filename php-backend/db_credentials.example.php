<?php
// Example Database Credentials Template
// Copy this to db_credentials.php (or outside web root) and adjust values
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) {
    http_response_code(403);
    exit('Access denied.');
}

return [
    'host' => 'localhost',
    'dbname' => 'your_db_name',
    'user' => 'your_db_user',
    'pass' => 'your_db_password',
    'charset' => 'utf8mb4'
];
