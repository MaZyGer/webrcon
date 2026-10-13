<?php

header('Content-Type: application/json; charset=utf-8');

if (!isset($_GET['id'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'avatar' => null
    ]);
    exit;
}

$steamId = trim($_GET['id']);

// SteamID64 validieren
if (!preg_match('/^\d{17}$/', $steamId)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'avatar' => null
    ]);
    exit;
}

$url = 'https://steamcommunity.com/profiles/' . $steamId . '/?xml=1';

$xmlData = @file_get_contents($url);

if ($xmlData === false) {
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'avatar' => null
    ]);
    exit;
}

libxml_use_internal_errors(true);

$xml = simplexml_load_string($xmlData);

if ($xml === false) {
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'avatar' => null
    ]);
    exit;
}

// Avatar prüfen
$avatar = isset($xml->avatarMedium)
    ? trim((string)$xml->avatarMedium)
    : null;

// Leere Avatar-Werte ebenfalls als "nicht vorhanden" behandeln
if ($avatar === '') {
    $avatar = null;
}

echo json_encode([
    'success' => true,
    'steamid' => $steamId,
    'avatar' => $avatar
]);