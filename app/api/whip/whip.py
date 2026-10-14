# pip3 install requests
import requests
import json

API_KEY_SECRET = "sepehrmeet_default_secret"
MEETING_URL = "http://localhost:3010/api/v1/whip"
#MEETING_URL = "http://localhost:3010/api/v1/whip"

headers = {
    "authorization": API_KEY_SECRET,
    "Content-Type": "application/json",
}

data = {
    "room": "test",
    "name": "OBS",
    "expire": "4h"
}

response = requests.post(
    MEETING_URL, 
    headers=headers, 
    json=data
)

print("Status code:", response.status_code)
data = json.loads(response.text)
# OBS Studio -> Settings -> Stream -> Service: WHIP (Server: whip, Bearer Token: token)
print("whip:", data["whip"])
print("token:", data["token"])
