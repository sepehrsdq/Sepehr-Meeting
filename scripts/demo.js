/**
 * Record the README demo: one real meeting, both peers, in one frame.
 *
 *   FFMPEG=/path/to/ffmpeg npm run demo
 *
 * Starts a private Sepehr Meeting server (real mediasoup SFU, real sockets)
 * and opens one HTTPS page with two iframes — 127.0.0.1 and localhost are
 * different origins, so each side gets its own storage while the server
 * still shares one room. One video, both peers, no post-composite alignment
 * to get wrong. Same recipe as pol's demo.
 *
 * The camera is a canvas-rendered brand gradient (one palette per peer) wired
 * into getUserMedia before the app boots — a real MediaStream track travels
 * through the real SFU, but the picture is a designed placeholder instead of
 * Chromium's green test pattern. Everything else (rooms, sockets, mediasoup,
 * chat) is the untouched application.
 *
 * The scenario tells a story: Ali joins first, Maryam arrives a moment later,
 * both see each other, Ali starts the chat, Maryam answers, hold the frame.
 *
 * Needs a normal ffmpeg with GIF support (palettegen):
 *   winget install Gyan.FFmpeg | brew install ffmpeg | apt install ffmpeg
 *
 * Env knobs (all optional): DEMO_PORT, DEMO_ROOM, DEMO_WIDTH, DEMO_HEIGHT,
 * FFMPEG (path to a full ffmpeg binary).
 */
'use strict';

const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } = require('node:fs');
const { createServer } = require('node:https');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const PORT = Number(process.env.DEMO_PORT || 8920);
const RTC_MIN = Number(process.env.DEMO_RTC_MIN_PORT || 41100);
const RTC_MAX = Number(process.env.DEMO_RTC_MAX_PORT || 41150);
const WIDTH = Number(process.env.DEMO_WIDTH || 1700);
const HEIGHT = Number(process.env.DEMO_HEIGHT || 950);
const ROOM = process.env.DEMO_ROOM || 'demo';
const OUT_GIF = join('docs', 'demo.gif');

const PEER_A_NAME = 'علی';
const PEER_B_NAME = 'مریم';
const CHAT_A = 'سلام مریم! جلسه رو شروع کنیم؟';
const CHAT_B = 'سلام علی، آماده‌ام 👋';

const APP_A = `https://127.0.0.1:${PORT}/join/?room=${ROOM}&name=${encodeURIComponent(PEER_A_NAME)}&audio=1&video=1&notify=0`;
const APP_B = `https://localhost:${PORT}/join/?room=${ROOM}&name=${encodeURIComponent(PEER_B_NAME)}&audio=1&video=1&notify=0`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function ffmpeg() {
    // Playwright's bundled ffmpeg is a cut-down build without palettegen, so
    // the demo needs a normal one: FFMPEG=/path/to/ffmpeg or ffmpeg on PATH.
    return process.env.FFMPEG || 'ffmpeg';
}

function run(exe, args) {
    return new Promise((resolvePromise, reject) => {
        const child = spawn(exe, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let err = '';
        child.stdout.on('data', () => {});
        child.stderr.on('data', (chunk) => (err += chunk));
        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) resolvePromise();
            else reject(new Error(`${exe} exited ${code}\n${err.slice(-1600)}`));
        });
    });
}

/** Wait until the frame's predicate holds; dump page state on timeout. */
async function waitFor(frame, predicate, timeoutMs, label) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            if (await frame.evaluate(predicate)) return;
        } catch {
            /* frame may be navigating */
        }
        await sleep(150);
    }
    const state = await frame
        .evaluate(() => ({
            url: location.href,
            ready: document.readyState,
            videoTiles: document.getElementById('videoMediaContainer')?.childElementCount ?? -1,
            chatOpen: document.getElementById('chatRoom')?.classList.contains('show') ?? 'missing',
            loadingMsg: document.getElementById('loadingMessage')?.textContent?.trim().slice(0, 80) ?? '',
            body: document.body?.textContent?.trim().slice(0, 120) ?? '',
        }))
        .catch((error) => ({ evalError: String(error).slice(0, 160) }));
    throw new Error(`${label} never happened — ${JSON.stringify(state)}`);
}

/* -------------------------------------------------------------------------
 * Fake camera: a designed animated gradient per peer, not Chromium's test
 * pattern. Runs before any app script; getUserMedia is answered with a real
 * canvas capture track (plus a near-silent oscillator mic), so the whole
 * WebRTC chain below it stays honest.
 * ---------------------------------------------------------------------- */
const FAKE_CAMERA_SCRIPT = `(() => {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices || !mediaDevices.getUserMedia) return;

    // Brand palettes — violet for the first peer, teal for the second.
    const PALETTES = {
        '127.0.0.1': ['#4f46e5', '#7c3aed', '#312e81'],
        localhost: ['#0d9488', '#10b981', '#064e3b'],
    };
    const palette = PALETTES[location.hostname] || PALETTES['127.0.0.1'];

    const W = 960;
    const H = 540;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const blobs = [
        { r: 320, speed: 0.22, phase: 0, ax: 0.34, ay: 0.30, alpha: 0.34 },
        { r: 260, speed: 0.17, phase: 2.1, ax: 0.30, ay: 0.26, alpha: 0.30 },
        { r: 380, speed: 0.12, phase: 4.2, ax: 0.26, ay: 0.34, alpha: 0.26 },
    ];

    function draw(now) {
        const t = now / 1000;
        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, palette[0]);
        bg.addColorStop(0.55, palette[2]);
        bg.addColorStop(1, palette[1]);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        for (const b of blobs) {
            const x = W / 2 + Math.sin(t * b.speed + b.phase) * W * b.ax;
            const y = H / 2 + Math.cos(t * b.speed * 0.8 + b.phase) * H * b.ay;
            const g = ctx.createRadialGradient(x, y, 0, x, y, b.r);
            g.addColorStop(0, 'rgba(255,255,255,' + b.alpha + ')');
            g.addColorStop(0.5, 'rgba(255,255,255,' + b.alpha * 0.35 + ')');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, b.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Soft vignette so the tile blends into the porcelain UI.
        const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
        v.addColorStop(0, 'rgba(0,0,0,0)');
        v.addColorStop(1, 'rgba(0,0,0,0.28)');
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, W, H);
    }

    draw(0);
    // setInterval rather than rAF: two iframes must both keep painting while
    // headless recording runs.
    setInterval(() => draw(performance.now()), 33);
    const videoStream = canvas.captureStream(30);
    const videoTrack = videoStream.getVideoTracks()[0];

    let audioTrack = null;
    function silentMic() {
        if (audioTrack) return audioTrack;
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            const actx = new AC();
            actx.resume().catch(() => {});
            const osc = actx.createOscillator();
            const gain = actx.createGain();
            gain.gain.value = 0.0004; // effectively silent, still a real track
            const dest = actx.createMediaStreamDestination();
            osc.connect(gain);
            gain.connect(dest);
            osc.start();
            audioTrack = dest.stream.getAudioTracks()[0];
        } catch (e) {
            audioTrack = null;
        }
        return audioTrack;
    }

    const original = mediaDevices.getUserMedia.bind(mediaDevices);
    mediaDevices.getUserMedia = async (constraints = {}) => {
        const wantsVideo = constraints.video !== undefined && constraints.video !== false;
        const wantsAudio = constraints.audio !== undefined && constraints.audio !== false;
        if (!wantsVideo && !wantsAudio) return original(constraints);
        const stream = new MediaStream();
        // Always hand out clones: the app probes permissions by opening and
        // stopping test streams, and stopping the source track would kill the
        // camera for the whole session.
        if (wantsVideo) stream.addTrack(videoTrack.clone());
        if (wantsAudio) {
            const mic = silentMic();
            if (mic) stream.addTrack(mic.clone());
        }
        return stream;
    };
})();`;

async function main() {
    const root = resolve(__dirname, '..');
    mkdirSync(join(root, 'docs'), { recursive: true });
    const videoDir = mkdtempSync(join(tmpdir(), 'meet-demo-'));

    // ---- private server on its own ports --------------------------------
    // Note: SFU_LISTEN_IP is intentionally NOT restricted to 127.0.0.1 —
    // binding WebRTC to loopback breaks ICE on this setup (verified locally);
    // the server only lives for the few seconds of the recording anyway.
    const serverEnv = {
        ...process.env,
        SERVER_LISTEN_PORT: String(PORT),
        SFU_MIN_PORT: String(RTC_MIN),
        SFU_MAX_PORT: String(RTC_MAX),
        NGROK_ENABLED: 'false',
    };
    const server = spawn(process.execPath, ['app/src/Server.js'], {
        cwd: root,
        env: serverEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    let serverLog = '';
    server.stdout.on('data', (chunk) => (serverLog += chunk));
    server.stderr.on('data', (chunk) => (serverLog += chunk));

    // ---- two-pane harness over HTTPS (two origins, one video) -----------
    // The embedder must be a secure context, otherwise Chromium ignores the
    // camera/mic permission delegation on the cross-origin iframes.
    const certPath = join(root, 'app', 'ssl', 'cert.pem');
    const keyPath = join(root, 'app', 'ssl', 'key.pem');
    if (!existsSync(certPath) || !existsSync(keyPath)) {
        throw new Error(
            'app/ssl/cert.pem not found — run "npm run ssl:dev" first (the harness must be HTTPS for camera delegation)',
        );
    }
    const HARNESS_PORT = PORT + 1;
    const harness = createServer(
        { cert: readFileSync(certPath), key: readFileSync(keyPath) },
        (_, response) => {
            response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
            response.end(`<!doctype html>
      <html><head><meta charset="utf-8"><style>
        html,body{margin:0;height:100%;overflow:hidden;background:#0d0f14}
        body{display:flex;gap:12px;padding:12px;box-sizing:border-box}
        .pane{flex:1;min-width:0;border-radius:16px;overflow:hidden;background:#11141a;
              box-shadow:0 12px 40px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.05)}
        .pane.empty{display:flex;align-items:center;justify-content:center;color:#3d4454;
              font:500 15px/1.6 system-ui,Tahoma,sans-serif}
        iframe{width:100%;height:100%;border:0;display:block}
      </style></head><body>
        <div class="pane" id="paneA">
          <iframe src="${APP_A}" title="peer-a" allow="camera; microphone; autoplay"></iframe>
        </div>
        <div class="pane empty" id="paneB"><span>در انتظار شرکت‌کنندهٔ دوم…</span></div>
        <script>
          window.loadPeerB = () => {
            const wrap = document.getElementById('paneB');
            wrap.classList.remove('empty');
            wrap.innerHTML = '';
            const f = document.createElement('iframe');
            f.src = ${JSON.stringify(APP_B)};
            f.title = 'peer-b';
            f.setAttribute('allow', 'camera; microphone; autoplay');
            wrap.appendChild(f);
          };
        </script>
      </body></html>`);
        },
    );
    await new Promise((resolvePromise) => harness.listen(HARNESS_PORT, '127.0.0.1', resolvePromise));

    const browser = await chromium.launch({
        args: [
            '--ignore-certificate-errors', // self-signed dev cert
            '--use-fake-device-for-media-stream', // device list for the UI
            '--use-fake-ui-for-media-stream', // auto-approve any prompt
            '--autoplay-policy=no-user-gesture-required',
        ],
    });
    let video;
    try {
        // Server readiness: any response (301/200) means it is listening. The
        // cert is self-signed, so skip verification for this probe only.
        const savedReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const deadline = Date.now() + 60_000;
        for (;;) {
            try {
                const response = await fetch(`https://127.0.0.1:${PORT}/`);
                if (response.status < 500) break;
            } catch {
                /* not up yet */
            }
            if (Date.now() > deadline) throw new Error(`server never started\n${serverLog.slice(-1600)}`);
            await sleep(300);
        }
        if (savedReject === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        else process.env.NODE_TLS_REJECT_UNAUTHORIZED = savedReject;

        const context = await browser.newContext({
            viewport: { width: WIDTH, height: HEIGHT },
            recordVideo: { dir: videoDir, size: { width: WIDTH, height: HEIGHT } },
            locale: 'fa-IR',
            colorScheme: 'light',
            ignoreHTTPSErrors: true,
        });
        await context.grantPermissions(['camera', 'microphone']);
        // Designed camera, before any app script runs.
        await context.addInitScript(FAKE_CAMERA_SCRIPT);

        const page = await context.newPage();
        const born = Date.now();
        video = page.video();

        await page.goto(`https://127.0.0.1:${HARNESS_PORT}/`, { waitUntil: 'load', timeout: 45_000 });

        const peerA = page.frame({ url: new RegExp(`127\\.0\\.0\\.1:${PORT}/`) });
        if (!peerA) throw new Error('peer-a iframe did not appear');

        await waitFor(
            peerA,
            () => Boolean(document.getElementById('videoMediaContainer')),
            60_000,
            'peer-a mount',
        );
        await peerA.evaluate(() => document.fonts.ready);
        // Ali's tile starts streaming while Maryam's pane is already loading —
        // the join latencies overlap instead of playing out back to back.
        const markA = Date.now();
        await sleep(1100);
        await page.evaluate(() => window.loadPeerB());
        const markLoadB = Date.now();

        const peerB = await (async () => {
            for (let i = 0; i < 50; i++) {
                const f = page.frame({ url: new RegExp(`localhost:${PORT}/`) });
                if (f) return f;
                await sleep(200);
            }
            throw new Error('peer-b iframe did not appear');
        })();

        for (const [label, frame] of [
            ['peer-a', peerA],
            ['peer-b', peerB],
        ]) {
            await waitFor(
                frame,
                () => Boolean(document.getElementById('videoMediaContainer')),
                60_000,
                `${label} mount`,
            );
            await frame.evaluate(() => document.fonts.ready);
        }

        // Real media must flow: each side shows two tiles streaming.
        // (predicate runs inside the page — everything must be self-contained)
        const bothTilesStreaming = () => {
            const container = document.getElementById('videoMediaContainer');
            if (!container) return false;
            let n = 0;
            for (const v of container.querySelectorAll('video')) if (v.readyState >= 2) n++;
            return n >= 2;
        };
        await waitFor(peerA, bothTilesStreaming, 90_000, 'peer-a sees both tiles');
        await waitFor(peerB, bothTilesStreaming, 90_000, 'peer-b sees both tiles');
        const markBoth = Date.now();

        // One consistent brand theme on both sides (built-in light theme).
        for (const frame of [peerA, peerB]) {
            await frame.evaluate(() => {
                applyTheme(lightTheme('#4f46e5'));
            });
        }

        await sleep(800);

        // Ali opens chat and types like a person. The button bar can sit
        // below the fold in a half-width iframe, so click via JS dispatch.
        const openChatAndSend = async (frame, text, humanType = true) => {
            // Open the panel if hidden and focus the input without Playwright's
            // actionability waits — the chat slide animation makes every
            // click()/fill() pay ~1s of stability checks.
            await frame.evaluate(() => {
                const room = document.getElementById('chatRoom');
                if (!room || !room.classList.contains('show')) {
                    document.getElementById('chatButton')?.click();
                }
            });
            await waitFor(
                frame,
                () => document.getElementById('chatRoom')?.classList.contains('show'),
                15_000,
                'chat panel open',
            );
            await sleep(350); // let the slide-in settle before typing
            await frame.evaluate(() => document.getElementById('chatMessage')?.focus());
            const keyboard = frame.page().keyboard;
            if (humanType) {
                // Char-by-char for the opener: the one place a person watches
                // the message being written.
                for (const ch of text) {
                    await keyboard.type(ch);
                    await sleep(14);
                }
            } else {
                // Instant paste for the reply — keeps the clip short.
                await keyboard.insertText(text);
            }
            await sleep(200);
            await frame.evaluate(() => {
                const btn = document.getElementById('chatSendButton');
                if (btn) btn.click();
            });
        };

        await openChatAndSend(peerA, CHAT_A);
        const markChatA = Date.now();

        // The message must land on peer B (its chat auto-opens on message).
        await waitFor(
            peerB,
            () => Boolean(document.querySelector('#chatHistory li.chat-row--other')),
            30_000,
            'peer-b receives the chat message',
        );
        const markChatB = Date.now();
        // A sees its own message too.
        await waitFor(
            peerA,
            () => Boolean(document.querySelector('#chatHistory li.chat-row--own')),
            30_000,
            'peer-a sees its own message',
        );

        // Maryam answers — the conversation looks alive, not staged.
        await sleep(500);
        await openChatAndSend(peerB, CHAT_B, false);
        const markChatBReply = Date.now();
        await waitFor(
            peerA,
            () => document.querySelectorAll('#chatHistory li.chat-row--other').length >= 1,
            30_000,
            'peer-a receives the reply',
        );

        // Hold the payoff frame: two peers, two tiles, a real conversation.
        await sleep(2000);

        const end = Date.now();
        console.log(
            `timing: A-ready ${(markA - born) / 1000}s, B-load ${(markLoadB - born) / 1000}s, ` +
                `both-tiles ${(markBoth - born) / 1000}s, chatA ${(markChatA - born) / 1000}s, ` +
                `chatB ${(markChatB - born) / 1000}s, reply ${(markChatBReply - born) / 1000}s, ` +
                `end ${(end - born) / 1000}s`,
        );

        // The GIF starts when Maryam's pane appears (a beat before), not at
        // page load — the join waits are real but not worth 10s of frames.
        const trim = Math.max(0, (markLoadB - born) / 1000 - 0.6);
        const duration = (end - born) / 1000 - trim;

        await context.close();
        const path = await video.path();

        await run(ffmpeg(), [
            '-y',
            '-ss', trim.toFixed(2), '-t', duration.toFixed(2), '-i', path,
            '-vf',
            'fps=8,scale=1000:-2:flags=lanczos,split[s0][s1];' +
                '[s0]palettegen=max_colors=96:stats_mode=diff[p];' +
                '[s1][p]paletteuse=dither=bayer:bayer_scale=5',
            '-loop', '0',
            OUT_GIF,
        ]);

        const bytes = statSync(OUT_GIF).size;
        console.log(`demo: ${OUT_GIF} — ${(bytes / 1024 / 1024).toFixed(2)} MB, ${duration.toFixed(1)} s`);
    } finally {
        await browser.close().catch(() => {});
        server.kill();
        harness.close();
        for (let attempt = 0; attempt < 5; attempt += 1) {
            try {
                rmSync(videoDir, { recursive: true, force: true });
                break;
            } catch {
                // Windows can hold the video handle for a moment after close.
                await sleep(300);
            }
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
