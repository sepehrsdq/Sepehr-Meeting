'use strict';

// Regression tests for the join media-setup failures that used to surface as
// "TypeError: Cannot read properties of null (reading 'rtpCapabilities')" in a
// 'Join Room' dialog, followed by a reload loop and a half-joined black room.

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const roomClientSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'RoomClient.js'), 'utf8');

const CAPS = {
    codecs: [{ kind: 'video', mimeType: 'video/VP8', clockRate: 90000, preferredPayloadType: 96 }],
    headerExtensions: [
        { uri: 'urn:3gpp:video-orientation', kind: 'video' },
        { uri: 'urn:ietf:params:rtp-hdrext:sdes:mid', kind: 'mixed' },
    ],
};

describe('join media setup failure handling', () => {
    let proto;

    before(() => {
        const context = vm.createContext({
            window: { location: { origin: 'https://localhost:3010' }, localStorage: {} },
            navigator: { userAgent: 'test-agent' },
            RTCPeerConnection: function RTCPeerConnection() {},
            endRoomSession: () => {},
            setTimeout: () => {},
        });
        vm.runInContext(`${roomClientSource}; globalThis.RoomClientForTest = RoomClient;`, context);
        proto = context.RoomClientForTest.prototype;
    });

    function createClient(caps, deviceFactory) {
        const toasts = [];
        const client = {
            socket: { request: async (type) => (type === 'getRouterRtpCapabilities' ? caps : {}) },
            mediasoupClient: { Device: { factory: deviceFactory } },
            test: { device: { enabled: false } },
            userLog: (type, message) => toasts.push({ type, message }),
            producerTransport: null,
            consumerTransport: null,
            initTransports: async () => {
                client.producerTransport = {};
                client.consumerTransport = {};
            },
        };
        client.loadDevice = proto.loadDevice.bind(client);
        return { client, toasts };
    }

    it('rejects with a fatal error, not a TypeError, when the browser cannot create the device', async () => {
        const unsupported = () => {
            const error = new Error('Unsupported browser');
            error.name = 'UnsupportedError';
            throw error;
        };
        const { client, toasts } = createClient(CAPS, unsupported);
        await assert.rejects(proto.loadDeviceAndInitTransports.call(client), (error) => {
            // The error crosses the vm realm boundary, so instanceof does not apply;
            // a clean Error (not a TypeError) must carry the fatal flag.
            assert.equal(typeof error.message, 'string');
            assert.notEqual(error.constructor.name, 'TypeError');
            assert.equal(error.fatal, true);
            assert.match(error.message, /media device/);
            return true;
        });
        // The precise reason must still reach the user as a toast
        assert.ok(toasts.some((toast) => /browser/i.test(toast.message)));
    });

    it('rejects with a fatal error when the server returns no capabilities', async () => {
        const { client } = createClient(null, () => ({}));
        await assert.rejects(proto.loadDeviceAndInitTransports.call(client), (error) => {
            assert.equal(error.fatal, true);
            assert.match(error.message, /router RTP capabilities/);
            return true;
        });
    });

    it('rejects with a fatal error when transports cannot be established', async () => {
        const workingDevice = () => ({ handlerName: 'Chrome', load: async () => {}, rtpCapabilities: { codecs: [] } });
        const { client } = createClient(CAPS, workingDevice);
        client.initTransports = async () => {}; // leaves both transports unset
        await assert.rejects(proto.loadDeviceAndInitTransports.call(client), (error) => {
            assert.equal(error.fatal, true);
            assert.match(error.message, /media connection/);
            return true;
        });
    });

    it('keeps working for a fully successful setup', async () => {
        const workingDevice = () => ({
            handlerName: 'Chrome',
            load: async () => {},
            rtpCapabilities: { codecs: [{ kind: 'video' }] },
        });
        const { client } = createClient(CAPS, workingDevice);
        await proto.loadDeviceAndInitTransports.call(client);
        assert.ok(client.device);
        assert.ok(client.producerTransport);
        assert.ok(client.consumerTransport);
    });

    it('fails fast with a noWebRTC flag in embedded browsers without RTCPeerConnection', async () => {
        const context = vm.createContext({
            window: { location: { origin: 'https://localhost:3010' }, localStorage: {} },
            navigator: { userAgent: 'embedded-webview' },
            // No RTCPeerConnection: embedded browsers / stripped webviews
            endRoomSession: () => {},
            setTimeout: () => {},
        });
        vm.runInContext(`${roomClientSource}; globalThis.RoomClientForTest = RoomClient;`, context);
        const embeddedProto = context.RoomClientForTest.prototype;
        const client = {
            socket: { request: async () => CAPS },
            mediasoupClient: { Device: { factory: () => ({}) } },
            test: { device: { enabled: false } },
            userLog: () => {},
            producerTransport: null,
            consumerTransport: null,
        };
        await assert.rejects(embeddedProto.loadDeviceAndInitTransports.call(client), (error) => {
            assert.equal(error.fatal, true);
            assert.equal(error.noWebRTC, true);
            assert.match(error.message, /WebRTC/);
            return true;
        });
        // The join request must never reach the server in this state
        assert.equal(client.producerTransport, null);
    });
});
