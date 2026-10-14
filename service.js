'use strict';

/**
 * Windows Service installer for Sepehr Meeting — «میتینگ داخلی»
 *
 * Usage (from an ELEVATED PowerShell/cmd, in the Sepehr-Meeting folder):
 *   node service.js install     -> register & start the service
 *   node service.js uninstall   -> stop & remove the service
 *
 * The service runs app/src/Server.js with the same Node runtime, restarts
 * automatically on crash (node-windows default), and logs to the service log.
 *
 * @license Proprietary - see LICENSE
 */

const path = require('path');
const Service = require('node-windows').Service;

const MODE = (process.argv[2] || '').toLowerCase();

const svc = new Service({
    name: 'SepehrMeeting',
    displayName: 'Sepehr Meeting — میتینگ داخلی',
    description: 'Self-hosted WebRTC video meetings (Sepehr Meeting). Runs alongside the existing portals.',
    script: path.join(__dirname, 'app', 'src', 'Server.js'),
    // workingDirectory ensures .env / relative paths resolve to the app root
    workingDirectory: __dirname,
    // Small env hardening for production service mode
    env: [
        { name: 'NODE_ENV', value: 'production' },
        { name: 'LOGS_JSON', value: 'false' },
    ],
    // Wait before restarts (ms) so a crashing loop does not spin
    grow: 0.25,
    wait: 2,
    maxRetries: 10,
});

svc.on('install', () => {
    console.log('[service] installed. Starting...');
    svc.start();
});
svc.on('alreadyinstalled', () => console.log('[service] already installed.'));
svc.on('start', () => console.log('[service] started. Listen on https://localhost:3010'));
svc.on('stop', () => console.log('[service] stopped.'));
svc.on('uninstall', () => console.log('[service] uninstalled.'));
svc.on('error', (err) => console.error('[service] error:', err));

if (MODE === 'install') {
    svc.install();
} else if (MODE === 'uninstall') {
    svc.uninstall();
} else {
    console.log('Usage: node service.js <install|uninstall>');
    console.log('(Run from an elevated prompt to manage the Windows service.)');
}
