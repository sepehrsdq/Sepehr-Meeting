#!/usr/bin/env node
'use strict';

// Generate the local self-signed certificates used for HTTPS development.
// Private keys are never committed; run this once after cloning.
//
// Usage: npm run ssl:dev

const { spawnSync } = require('node:child_process');
const { existsSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const targets = [
    join(root, 'app', 'ssl'),
    join(root, 'rtmpServers', 'node-media-server', 'src'),
];

const opensslCandidates = [
    'openssl',
    process.env.OPENSSL_BIN,
    'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
    'C:\\Program Files\\Git\\bin\\openssl.exe',
].filter(Boolean);

const openssl = opensslCandidates.find((bin) => {
    const result = spawnSync(bin, ['version'], { stdio: 'ignore' });
    return result.status === 0;
});

if (!openssl) {
    console.error(
        'openssl was not found. Install OpenSSL, add it to PATH, or set OPENSSL_BIN to its full path.'
    );
    process.exit(1);
}

let created = 0;
for (const dir of targets) {
    const cert = join(dir, 'cert.pem');
    const key = join(dir, 'key.pem');
    if (existsSync(cert) && existsSync(key)) {
        console.log(`exists: ${dir}`);
        continue;
    }
    mkdirSync(dir, { recursive: true });
    const result = spawnSync(
        openssl,
        [
            'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '3650',
            '-keyout', key,
            '-out', cert,
            '-subj', '/CN=localhost/O=Sepehr/C=IR',
            '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1',
        ],
        { stdio: 'inherit' }
    );
    if (result.status !== 0) {
        console.error(`failed to create a certificate in ${dir}`);
        process.exit(1);
    }
    created += 1;
    console.log(`created: ${dir}`);
}

console.log(created ? 'Local certificates ready.' : 'Nothing to do; certificates already exist.');
