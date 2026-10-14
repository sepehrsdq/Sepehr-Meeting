#!/bin/bash

API_KEY_SECRET="sepehrmeet_default_secret"
MEETING_URL="http://localhost:3010/api/v1/stats"
#MEETING_URL="http://localhost:3010/api/v1/stats"

curl $MEETING_URL \
    --header "authorization: $API_KEY_SECRET" \
    --header "Content-Type: application/json" \
    --request GET
