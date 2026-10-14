#!/bin/bash

API_KEY_SECRET="sepehrmeet_default_secret"
MEETING_URL="http://localhost:3010/api/v1/token"
#MEETING_URL="http://localhost:3010/api/v1/token"

curl $MEETING_URL \
    --header "authorization: $API_KEY_SECRET" \
    --header "Content-Type: application/json" \
    --data '{"username":"username","password":"password","presenter":"true", "expire":"1h"}' \
    --request POST