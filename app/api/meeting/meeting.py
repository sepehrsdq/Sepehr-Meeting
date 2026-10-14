# pip3 install requests
import requests
import json

API_KEY_SECRET = "sepehrmeet_default_secret"
MEETING_URL = "http://localhost:3010/api/v1/meeting"
# MEETING_URL = "http://localhost:3010/api/v1/meeting"

headers = {
    "authorization": API_KEY_SECRET,
    "Content-Type": "application/json",
}

response = requests.post(
    MEETING_URL,
    headers=headers
)

print("Status code:", response.status_code)
data = json.loads(response.text)
print("meeting:", data["meeting"])
