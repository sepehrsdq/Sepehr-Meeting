'use strict';

async function getWhip() {
    try {
        // Use dynamic import with await
        const { default: fetch } = await import('node-fetch');

        const API_KEY_SECRET = 'sepehrmeet_default_secret';
        const MEETING_URL = 'http://localhost:3010/api/v1/whip';
        //const MEETING_URL = 'http://localhost:3010/api/v1/whip';

        const response = await fetch(MEETING_URL, {
            method: 'POST',
            headers: {
                authorization: API_KEY_SECRET,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                room: 'test',
                name: 'OBS',
                expire: '4h',
            }),
        });
        const data = await response.json();
        if (data.error) {
            console.log('Error:', data.error);
        } else {
            // OBS Studio -> Settings -> Stream -> Service: WHIP (Server: whip, Bearer Token: token)
            console.log('whip:', data.whip);
            console.log('token:', data.token);
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

getWhip();
