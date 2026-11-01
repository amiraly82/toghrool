<?php
// Secure Database Credentials
// Direct web access is forbidden via .htaccess
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) {
    http_response_code(403);
    exit('Access denied.');
}

return [
    'host' => 'localhost',
    'dbname' => 'amiraly1_toghrool',
    'user' => 'amiraly1_tuser',
    'pass' => 'Toghrool_Pass@2026',
    'charset' => 'utf8mb4'
];
