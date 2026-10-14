# pip3 install requests
import requests
import json

API_KEY_SECRET = "sepehrmeet_default_secret"
MEETING_URL = "http://localhost:3010/api/v1/join"
# MEETING_URL = "http://localhost:3010/api/v1/join"

headers = {
    "authorization": API_KEY_SECRET,
    "Content-Type": "application/json",
}

data = {
    "room": "test",
    "roomPassword": "false",
    "name": "sepehrmeet",
    "avatar": "false",
    "audio": "false",
    "video": "false",
    "screen": "false",
    "chat": "false",
    "hide": "false",
    "notify": "true",
    "duration": "unlimited",
    "token": {
        "username": "username",
        "password": "password",
        "presenter": "true",
        "expire": "1h",
    }
}

response = requests.post(
    MEETING_URL,
    headers=headers,
    json=data,
)

print("Status code:", response.status_code)
data = json.loads(response.text)
print("join:", data["join"])
