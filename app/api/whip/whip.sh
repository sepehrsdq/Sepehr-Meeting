#!/bin/bash

API_KEY_SECRET="sepehrmeet_default_secret"
MEETING_URL="http://localhost:3010/api/v1/whip"
#MEETING_URL="http://localhost:3010/api/v1/whip"

# Returns { whip, token }: use them in OBS Studio -> Settings -> Stream -> Service: WHIP
# (Server: whip, Bearer Token: token) or with any other WHIP client.
curl $MEETING_URL \
    --header "authorization: $API_KEY_SECRET" \
    --header "Content-Type: application/json" \
    --data '{"room":"test","name":"OBS","expire":"4h"}' \
    --request POST
