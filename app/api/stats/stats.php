<?php

$API_KEY_SECRET = "sepehrmeet_default_secret";
$MEETING_URL = "http://localhost:3010/api/v1/stats";
//$MEETING_URL = "http://localhost:3010/api/v1/stats";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $MEETING_URL);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_HTTPGET, true);

$headers = [
    'authorization:' . $API_KEY_SECRET,
    'Content-Type: application/json'
];

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

curl_close($ch);

echo "Status code: $httpcode \n";

if ($response) {
    echo json_encode(json_decode($response), JSON_PRETTY_PRINT);
} else {
    echo "Failed to retrieve data.\n";
}
