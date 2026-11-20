/**
 * Sepehr Meeting — browser gate & self-updater page.
 *
 * ES5 on purpose: must run and render a readable Persian explanation on very old
 * browsers where the rest of the bundle may fail to parse. No CDN, no external assets.
 *
 * Flow: detect → pick the installer that matches the *current* browser family
 * (Chrome/Edge or Firefox) → stream it from this server with a live progress ring
 * → guide the offline install → auto re-check and auto-enter the room when ready.
 */
(function (window, document) {
    'use strict';

    // Canonical installer files the admin drops into public/download/ (see README.txt).
    // The first candidate that exists on the server wins. The Enterprise MSI comes first:
    // the standalone EXE (Google Installer meta-bootstrapper) can fail with "INVALID_OPTION"
    // on locked-down/enterprise machines, while the MSI installs fully offline and reliably.
    var INSTALLERS = {
        chromium: [
            '/download/GoogleChromeStandaloneEnterprise64.msi',
            '/download/ChromeStandaloneSetup64.exe',
            '/download/MicrosoftEdgeEnterpriseX64.msi',
            '/download/ChromeStandaloneSetup.exe',
        ],
        firefox: [
            '/download/FirefoxSetup-win64.exe',
            '/download/FirefoxSetup.exe',
            '/download/Firefox-Setup.exe',
        ],
    };

    var RECHECK_INTERVAL_MS = 4000;
    var WEBRTC_LABEL = 'تماس تصویری (WebRTC)';
    var CHECKS = [
        {
            label: 'دسترسی به دوربین و میکروفون',
            test: function () {
                return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
            },
        },
        {
            label: 'پردازش تصویر جلسه',
            test: function () {
                return typeof window.MediaStream !== 'undefined' && !!(window.HTMLCanvasElement && HTMLCanvasElement.prototype.captureStream);
            },
        },
        {
            label: 'رمزنگاری اتصال',
            test: function () {
                return typeof window.crypto !== 'undefined' && !!window.crypto.subtle;
            },
        },
    ];

    /* ------------------------------------------------------------------ *
     * browser detection
     * ------------------------------------------------------------------ */

    function parseBrowser() {
        var ua = navigator.userAgent || '';
        var name = 'مرورگر ناشناس';
        var major = 0;
        var m;

        if ((m = ua.match(/Edg(?:e|A|iOS)?\/(\d+)/))) {
            name = 'Microsoft Edge';
            major = parseInt(m[1], 10);
        } else if ((m = ua.match(/OPR\/(\d+)/))) {
            name = 'Opera';
            major = parseInt(m[1], 10);
        } else if ((m = ua.match(/Firefox\/(\d+)/))) {
            name = 'Firefox';
            major = parseInt(m[1], 10);
        } else if ((m = ua.match(/Chrome\/(\d+)/))) {
            name = 'Chrome';
            major = parseInt(m[1], 10);
        } else if (/Safari/.test(ua) && (m = ua.match(/Version\/(\d+)/))) {
            name = 'Safari';
            major = parseInt(m[1], 10);
        }

        var firefox = name === 'Firefox';
        var chromium = /Chrome\//.test(ua) || /Chromium\//.test(ua) || name === 'Microsoft Edge' || name === 'Opera';
        return { name: name, major: major, chromium: chromium, firefox: firefox, userAgent: ua };
    }

    /* WebRTC probe.
     *
     * Extensions such as "WebRTC Control" do not make the browser old — they simply
     * remove `RTCPeerConnection` from the page. Content scripts usually run in the top
     * frame only, so a same-origin about:blank child frame still exposes the genuine
     * constructor. When that is the case we know for sure an extension is the culprit,
     * and we can tell the user exactly what to fix instead of re-downloading a browser.
     */
    function probeWebRTC() {
        var Ctor = window.RTCPeerConnection || window.webkitRTCPeerConnection;
        if (typeof Ctor !== 'undefined') {
            try {
                var pc = new Ctor({ iceServers: [] });
                if (pc && typeof pc.close === 'function') pc.close();
                return { available: true, foundElsewhere: true };
            } catch (e) {
                return { available: false, foundElsewhere: false };
            }
        }

        var foundElsewhere = false;
        try {
            var frame = document.createElement('iframe');
            frame.setAttribute('aria-hidden', 'true');
            frame.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
            (document.body || document.documentElement).appendChild(frame);
            var w = frame.contentWindow;
            var inner = w && (w.RTCPeerConnection || w.webkitRTCPeerConnection);
            foundElsewhere = typeof inner !== 'undefined';
            if (frame.parentNode) frame.parentNode.removeChild(frame);
        } catch (e) {
            foundElsewhere = false;
        }
        return { available: false, foundElsewhere: foundElsewhere };
    }

    function check() {
        var webrtc = probeWebRTC();
        var failed = [];
        if (!webrtc.available) failed.push(WEBRTC_LABEL);
        for (var i = 0; i < CHECKS.length; i++) {
            var ok = false;
            try {
                ok = CHECKS[i].test() === true;
            } catch (e) {
                ok = false;
            }
            if (!ok) failed.push(CHECKS[i].label);
        }

        var info = parseBrowser();
        // Minimum engines: Chromium 111+, Firefox 120+ (matches RoomClient messages).
        var knownFamily = info.chromium || info.firefox;
        var minVersion = info.firefox ? 120 : 111;
        var tooOld = knownFamily && (!info.major || info.major < minVersion);
        var ok = failed.length === 0 && !tooOld;
        // A *new enough* browser that still fails the feature checks is NOT outdated:
        // it is running in a restricted environment (embedded pane, a WebRTC-blocking
        // extension, plain HTTP…). Re-installing the browser cannot fix that, so it
        // must never be pushed through the installer flow.
        var restricted = !ok && !tooOld;
        // The API exists in a child frame but not here → something injected into this
        // page removed it. That is an extension, not the browser.
        var blockedByExtension = !webrtc.available && webrtc.foundElsewhere;

        return {
            ok: ok,
            failed: failed,
            info: info,
            tooOld: tooOld,
            restricted: restricted,
            blockedByExtension: blockedByExtension,
        };
    }

    /* ------------------------------------------------------------------ *
     * helpers (ES5, no dependencies)
     * ------------------------------------------------------------------ */

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    var FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    function faDigits(text) {
        return String(text).replace(/\d/g, function (d) {
            return FA_DIGITS[+d];
        });
    }

    function faBytes(bytes) {
        if (!bytes && bytes !== 0) return '—';
        if (bytes >= 1024 * 1024 * 1024) return faDigits((bytes / (1024 * 1024 * 1024)).toFixed(1)) + ' گیگابایت';
        if (bytes >= 1024 * 1024) return faDigits((bytes / (1024 * 1024)).toFixed(1)) + ' مگابایت';
        if (bytes >= 1024) return faDigits(Math.round(bytes / 1024)) + ' کیلوبایت';
        return faDigits(bytes) + ' بایت';
    }

    function faDuration(seconds) {
        if (!isFinite(seconds) || seconds < 0) return '—';
        seconds = Math.round(seconds);
        if (seconds < 60) return faDigits(seconds) + ' ثانیه';
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        if (m < 60) return faDigits(m) + ' دقیقه و ' + faDigits(s) + ' ثانیه';
        return faDigits(Math.floor(m / 60)) + ' ساعت و ' + faDigits(m % 60) + ' دقیقه';
    }

    function trimFileName(url) {
        var name = url.split('/').pop() || url;
        try {
            name = decodeURIComponent(name);
        } catch (e) {
            /* keep raw */
        }
        return name;
    }

    /* tiny XHR wrapper — works on browsers old enough to trip this gate */
    function xhrRequest(options) {
        var xhr = new XMLHttpRequest();
        xhr.open(options.method || 'GET', options.url, true);
        if (options.responseType) xhr.responseType = options.responseType;
        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) options.onSuccess(xhr);
            else options.onError(xhr.status);
        };
        xhr.onerror = function () {
            options.onError(0);
        };
        xhr.onabort = function () {
            if (options.onAbort) options.onAbort();
        };
        if (options.onProgress) xhr.onprogress = options.onProgress;
        try {
            xhr.send(null);
        } catch (e) {
            options.onError(0);
        }
        return xhr;
    }

    function headUrl(url, onFound, onMissing) {
        xhrRequest({
            method: 'HEAD',
            url: url + (url.indexOf('?') === -1 ? '?' : '&') + 'probe=' + Date.now(),
            onSuccess: function (xhr) {
                var len = parseInt(xhr.getResponseHeader('Content-Length') || '0', 10) || 0;
                if (len > 0) onFound({ url: url, size: len });
                else onMissing();
            },
            onError: function () {
                onMissing();
            },
        });
    }

    // Callback-based sequencer (no Promise) so ancient engines can still run this file.
    function findInstaller(browserInfo, onFound, onMissing) {
        var family = browserInfo.firefox ? 'firefox' : 'chromium';
        var candidates = INSTALLERS[family] || INSTALLERS.chromium;
        var index = 0;
        function next() {
            if (index >= candidates.length) {
                onMissing();
                return;
            }
            var url = candidates[index++];
            headUrl(
                url,
                function (found) {
                    onFound(found);
                },
                next
            );
        }
        next();
    }

    /* ------------------------------------------------------------------ *
     * styles
     * ------------------------------------------------------------------ */

    var STYLE_ID = 'spBrowserGateStyles';
    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        var css =
            '.sp-gate{position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147483000;display:flex;align-items:flex-start;' +
            'justify-content:center;padding:24px;background:radial-gradient(1200px 600px at 80% -10%,#ecebff 0%,transparent 60%),' +
            'linear-gradient(160deg,#f7f8fc 0%,#eef1fa 100%);font-family:IRANSans,Vazirmatn,"Segoe UI",Tahoma,sans-serif;' +
            'direction:rtl;color:#14142b;overflow-y:auto;overflow-x:hidden}' +
            '.sp-gate *{box-sizing:border-box}' +
            '.sp-gate__card{width:100%;max-width:640px;margin:auto;background:#fff;border:1px solid rgba(20,20,43,.09);border-radius:24px;' +
            'box-shadow:0 4px 10px rgba(20,20,43,.04),0 40px 90px -40px rgba(67,56,202,.35);padding:28px 30px 26px;text-align:right;' +
            'animation:spGateCardIn .42s cubic-bezier(.22,1,.36,1) both}' +
            '.sp-gate__crests{display:flex;align-items:center;gap:10px;justify-content:flex-start;margin-bottom:16px}' +
            '.sp-gate__crest{width:44px;height:44px;object-fit:contain}' +
            '.sp-gate__rule{width:1px;height:26px;background:rgba(20,20,43,.14)}' +
            '.sp-gate__brand{font-size:15px;font-weight:800;color:#2b2c4a;line-height:1.5}' +
            '.sp-gate__brand small{display:block;font-size:11px;font-weight:600;color:#8a90a8}' +
            '.sp-gate h1{font-size:20px;font-weight:800;margin:0 0 6px;text-align:right}' +
            '.sp-gate__sub{font-size:13.5px;line-height:1.95;color:#4b5063;margin:0 0 18px;text-align:right}' +
            '.sp-gate__chip{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;' +
            'background:#f4f5ff;border:1px solid rgba(99,102,241,.24);color:#4338ca;font-size:13px;font-weight:700;margin:0 0 18px}' +
            /* hero: progress ring */
            '.sp-gate__hero{display:flex;flex-direction:column;align-items:center;gap:14px;padding:8px 0 6px;margin-bottom:6px}' +
            '.sp-gate__ring{position:relative;width:168px;height:168px;flex:0 0 auto}' +
            '.sp-gate__ring svg{width:100%;height:100%;display:block}' +
            '.sp-gate__ring .sp-gate__track{stroke:#e6e8f7}' +
            '.sp-gate__ring .sp-gate__bar{stroke:url(#spGateGrad);stroke-linecap:round;transition:stroke-dashoffset .3s cubic-bezier(.22,1,.36,1)}' +
            '.sp-gate__ring--spin .sp-gate__halo{animation:spGateSpin 1.6s linear infinite}' +
            '.sp-gate__halo{transform-origin:84px 84px}' +
            '.sp-gate__ringTxt{position:absolute;top:0;right:0;bottom:0;left:0;display:flex;flex-direction:column;' +
            'align-items:center;justify-content:center;gap:2px}' +
            '.sp-gate__ringPct{font-size:30px;font-weight:800;color:#4338ca;line-height:1}' +
            '.sp-gate__ringLbl{font-size:11px;font-weight:700;color:#8a90a8}' +
            '.sp-gate__orb{position:absolute;border-radius:50%;background:rgba(99,102,241,.16);' +
            'animation:spGateFloat 3.2s ease-in-out infinite}' +
            '.sp-gate__orb--1{width:10px;height:10px;top:8px;right:22px;animation-delay:.2s}' +
            '.sp-gate__orb--2{width:7px;height:7px;top:34px;left:12px;animation-delay:.9s}' +
            '.sp-gate__orb--3{width:12px;height:12px;bottom:16px;right:34px;animation-delay:1.5s;background:rgba(99,102,241,.12)}' +
            /* meta row under the ring */
            '.sp-gate__meta{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;max-width:100%}' +
            '.sp-gate__pill{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;' +
            'background:#f8fafc;border:1px solid rgba(20,20,43,.07);font-size:12px;font-weight:700;color:#3c3c5c}' +
            '.sp-gate__pill b{color:#4338ca;font-weight:800}' +
            '.sp-gate__barRow{width:100%;max-width:420px;margin-top:4px}' +
            '.sp-gate__bar{position:relative;height:10px;border-radius:999px;background:#eef0fa;overflow:hidden}' +
            '.sp-gate__barFill{position:absolute;top:0;right:0;bottom:0;width:0%;border-radius:999px;' +
            'background:linear-gradient(270deg,#6366f1,#a5b4fc);transition:width .3s cubic-bezier(.22,1,.36,1)}' +
            '.sp-gate__barFill:after{content:"";position:absolute;top:0;right:-60%;bottom:0;width:45%;' +
            'background:linear-gradient(270deg,transparent,rgba(255,255,255,.55),transparent);animation:spGateShimmer 1.8s linear infinite}' +
            /* status line + hint */
            '.sp-gate__status{display:flex;align-items:center;justify-content:center;gap:8px;font-size:13.5px;' +
            'font-weight:700;color:#3c3c5c;margin:2px 0 4px;min-height:22px;text-align:center}' +
            '.sp-gate__statusDot{width:8px;height:8px;border-radius:50%;background:#6366f1;flex:0 0 auto;' +
            'animation:spGatePulse 1.4s ease-in-out infinite}' +
            '.sp-gate__hint{font-size:12px;color:#8a90a8;line-height:1.9;text-align:center;margin:0 0 8px}' +
            /* steps */
            '.sp-gate__steps{counter-reset:step;display:grid;gap:10px;margin:0 0 18px;padding:14px 16px;list-style:none;' +
            'border-radius:16px;background:#f8fafc;border:1px solid rgba(20,20,43,.06)}' +
            '.sp-gate__steps li{position:relative;padding-right:38px;font-size:13.5px;line-height:1.9;color:#3c3c5c;' +
            'opacity:0;animation:spGateStepIn .5s cubic-bezier(.22,1,.36,1) forwards}' +
            '.sp-gate__steps li:nth-child(1){animation-delay:.08s}.sp-gate__steps li:nth-child(2){animation-delay:.2s}' +
            '.sp-gate__steps li:nth-child(3){animation-delay:.32s}.sp-gate__steps li:nth-child(4){animation-delay:.44s}' +
            '.sp-gate__steps li:before{counter-increment:step;content:counter(step);position:absolute;right:0;top:2px;' +
            'width:26px;height:26px;border-radius:9px;background:#f4f5ff;color:#4338ca;font-weight:800;font-size:12px;' +
            'display:flex;align-items:center;justify-content:center;border:1px solid rgba(99,102,241,.24)}' +
            '.sp-gate__steps li b{color:#14142b}' +
            /* failure list (feature blockers) */
            '.sp-gate__list{list-style:none;padding:0;margin:0 0 16px;display:grid;gap:8px}' +
            '.sp-gate__list li{display:flex;align-items:center;gap:10px;font-size:13.5px;color:#3c3c5c;' +
            'padding:9px 12px;border-radius:12px;background:#f8fafc;border:1px solid rgba(20,20,43,.06)}' +
            '.sp-gate__dot{width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;' +
            'font-size:11px;font-weight:800;flex:0 0 auto}' +
            '.sp-gate__dot--bad{background:rgba(225,29,72,.12);color:#e11d48}' +
            /* actions */
            '.sp-gate__actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}' +
            '.sp-gate__btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:46px;padding:0 22px;' +
            'border-radius:13px;font-size:14px;font-weight:700;text-decoration:none;border:1px solid transparent;cursor:pointer;' +
            'font-family:inherit;transition:transform .18s cubic-bezier(.22,1,.36,1),background .18s ease,box-shadow .18s ease}' +
            '.sp-gate__btn--primary{background:#6366f1;color:#fff;box-shadow:0 12px 24px -14px rgba(67,56,202,.85)}' +
            '.sp-gate__btn--primary:hover{background:#4f46e5;transform:translateY(-2px)}' +
            '.sp-gate__btn--ghost{background:#fff;color:#2b2c4a;border-color:rgba(20,20,43,.14)}' +
            '.sp-gate__btn--ghost:hover{background:#f4f5ff;border-color:rgba(99,102,241,.3);color:#4338ca}' +
            '.sp-gate__link{font-size:12.5px;color:#4338ca;font-weight:700;text-decoration:none;border-bottom:1px dashed rgba(99,102,241,.5)}' +
            '.sp-gate__link:hover{color:#4338ca;border-bottom-style:solid}' +
            /* success overlay state */
            '.sp-gate.is-done .sp-gate__barFill{background:linear-gradient(270deg,#059669,#6ee7b7)}' +
            '.sp-gate.is-done .sp-gate__ring .sp-gate__bar{stroke:#059669}' +
            /* advisory state: the browser is fine, something else blocks it (no download) */
            '.sp-gate.is-warning .sp-gate__ring .sp-gate__bar{stroke:#f59e0b}' +
            '.sp-gate.is-warning .sp-gate__ringPct{color:#b45309}' +
            '.sp-gate.is-warning .sp-gate__ringLbl{color:#b45309}' +
            '.sp-gate.is-warning .sp-gate__statusDot{background:#f59e0b;animation:none}' +
            '.sp-gate.is-warning .sp-gate__halo{opacity:.45}' +
            '.sp-gate__check{stroke:#059669;stroke-dasharray:60;stroke-dashoffset:60;animation:spGateDraw .6s .1s cubic-bezier(.22,1,.36,1) forwards}' +
            /* keyframes */
            '@keyframes spGateCardIn{from{opacity:0;transform:translateY(18px) scale(.98)}to{opacity:1;transform:none}}' +
            '@keyframes spGateSpin{to{transform:rotate(360deg)}}' +
            '@keyframes spGateShimmer{to{right:110%}}' +
            '@keyframes spGatePulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.6);opacity:.55}}' +
            '@keyframes spGateFloat{0%,100%{transform:translateY(0);opacity:.9}50%{transform:translateY(-9px);opacity:.4}}' +
            '@keyframes spGateStepIn{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:none}}' +
            '@keyframes spGateDraw{to{stroke-dashoffset:0}}' +
            '@media (max-width:520px){.sp-gate{padding:12px}.sp-gate__card{padding:22px 18px 20px;border-radius:20px}' +
            '.sp-gate h1{font-size:18px}.sp-gate__actions{flex-direction:column}.sp-gate__btn{width:100%}}' +
            '@media (prefers-reduced-motion:reduce){.sp-gate *,.sp-gate *:before,.sp-gate *:after{animation:none !important;transition:none !important}}';
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.appendChild(document.createTextNode(css));
        (document.head || document.documentElement).appendChild(style);
    }

    /* ------------------------------------------------------------------ *
     * markup pieces
     * ------------------------------------------------------------------ */

    function crestsMarkup() {
        return (
            '<div class="sp-gate__crests">' +
            '<img class="sp-gate__crest" src="/images/logo.svg" alt="" />' +
            '<span class="sp-gate__brand">سامانه سپهر<small>جلسات تصویری سازمانی</small></span>' +
            '</div>'
        );
    }

    function ringMarkup() {
        var R = 74; // ring radius (viewBox 168)
        var C = 2 * Math.PI * R;
        return (
            '<div class="sp-gate__ring sp-gate__ring--spin" id="spGateRing">' +
            '<svg viewBox="0 0 168 168" aria-hidden="true">' +
            '<defs><linearGradient id="spGateGrad" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#a5b4fc"/>' +
            '</linearGradient></defs>' +
            /* soft halo arc that rotates while working */
            '<g class="sp-gate__halo"><circle cx="84" cy="84" r="' + (R + 8) + '" fill="none" stroke="rgba(99,102,241,.18)" ' +
            'stroke-width="3" stroke-dasharray="18 26" stroke-linecap="round"/></g>' +
            '<circle class="sp-gate__track" cx="84" cy="84" r="' + R + '" fill="none" stroke-width="11"/>' +
            '<circle class="sp-gate__bar" id="spGateRingBar" cx="84" cy="84" r="' + R + '" fill="none" stroke-width="11" ' +
            'stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '" transform="rotate(-90 84 84)"/>' +
            '<path class="sp-gate__check" id="spGateCheck" d="M64 86 L78 100 L104 70" fill="none" stroke-width="9" ' +
            'stroke-linecap="round" stroke-linejoin="round" style="display:none"/>' +
            '</svg>' +
            '<div class="sp-gate__ringTxt">' +
            '<div class="sp-gate__ringPct" id="spGatePct">…</div>' +
            '<div class="sp-gate__ringLbl" id="spGateRingLbl">در حال آماده‌سازی</div>' +
            '</div>' +
            '<span class="sp-gate__orb sp-gate__orb--1"></span>' +
            '<span class="sp-gate__orb sp-gate__orb--2"></span>' +
            '<span class="sp-gate__orb sp-gate__orb--3"></span>' +
            '</div>'
        );
    }

    var RING_C = 2 * Math.PI * 74;

    /* ------------------------------------------------------------------ *
     * main UI
     * ------------------------------------------------------------------ */

    var state = {
        installer: null,
        xhr: null,
        pollTimer: null,
        recheckTimer: null,
        downloadStartedAt: 0,
        lastSample: null,
        delivered: false,
        mode: 'update', // 'update' (outdated browser) | 'error' (room-join failure on a capable browser)
        errorMessage: '',
        report: null,
    };

    function el(id) {
        return document.getElementById(id);
    }

    function setStatus(text) {
        var node = el('spGateStatus');
        if (node) node.innerHTML = '<span class="sp-gate__statusDot"></span>' + escapeHtml(text);
    }

    function setHint(html) {
        var node = el('spGateHint');
        if (node) node.innerHTML = html;
    }

    function setRing(fraction, label) {
        var bar = el('spGateRingBar');
        var pct = el('spGatePct');
        var lbl = el('spGateRingLbl');
        var f = Math.max(0, Math.min(1, fraction || 0));
        if (bar) bar.setAttribute('stroke-dashoffset', String(RING_C * (1 - f)));
        if (pct) pct.innerHTML = faDigits(Math.round(f * 100)) + '٪';
        if (label && lbl) lbl.textContent = label;
    }

    function setBar(fraction) {
        var fill = el('spGateBarFill');
        if (fill) fill.style.width = Math.max(0, Math.min(100, (fraction || 0) * 100)) + '%';
    }

    function setMeta(html) {
        var node = el('spGateMeta');
        if (node) node.innerHTML = html;
    }

    function showSteps(mode) {
        var wrap = el('spGateSteps');
        if (!wrap) return;
        var items;
        if (mode === 'install') {
            items = [
                'فایل نصب‌کننده آماده شد؛ آن را از پوشهٔ <b>دانلودهای</b> رایانه پیدا کنید.',
                'همهٔ پنجره‌های مرورگر را ببندید و روی فایل نصب دوبار کلیک کنید — نصب خودشان تمام می‌شود.',
                'پس از نصب، مرورگر را باز کنید و به همین صفحه برگردید؛ <b>خودکار بررسی می‌کنیم</b> و وارد جلسه می‌شوید.',
            ];
        } else if (mode === 'retry') {
            items = [
                'مرورگر شما به‌روز است و مشکلی ندارد.',
                'اتصال لحظه‌ای به سامانه برقرار نشد؛ معمولاً با یک تلاش دوباره حل می‌شود.',
                'اگر تکرار شد: افزونه‌های مسدودکننده (مثل «WebRTC Control» یا VPN) را موقتاً غیرفعال کنید و با واحد پشتیبانی تماس بگیرید.',
            ];
        } else if (mode === 'extension') {
            items = [
                'روی آیکون <b>افزونه‌ها</b> (قطعهٔ پازل 🧩) در نوار بالای مرورگر بزنید.',
                'کنار «<b>WebRTC Control</b>» گزینهٔ <b>Remove</b> (حذف) یا <b>Disable</b> را بزنید.',
                'این صفحه را دوباره بارگذاری کنید؛ <b>هیچ فایلی برای نصب لازم نیست</b> و وارد جلسه می‌شوید.',
            ];
        } else if (mode === 'restricted') {
            items = [
                'این آدرس را در یک <b>پنجرهٔ معمولی Chrome یا Edge</b> باز کنید (نه پنجرهٔ داخل یک نرم‌افزار).',
                'اگر افزونه‌ای مثل «<b>WebRTC Control</b>» یا VPN نصب است، موقتاً غیرفعالش کنید.',
                'مطمئن شوید آدرس با <b>https</b> باز شده و اجازهٔ دوربین/میکروفون داده شده است.',
            ];
        } else {
            items = [
                'فایل نصب‌کنندهٔ مرورگر از همین سامانه دریافت می‌شود.',
                'نصب را اجرا کنید؛ چند لحظه طول می‌کشد.',
                'به همین صفحه برگردید؛ ما خودکار وضعیت را می‌سنجیم.',
            ];
        }
        var html = '';
        for (var i = 0; i < items.length; i++) {
            html += '<li>' + items[i] + '</li>';
        }
        wrap.innerHTML = html;
        // restart entry animations
        wrap.style.display = 'none';
        void wrap.offsetHeight;
        wrap.style.display = '';
    }

    /* ------------------------------------------------------------------ *
     * the flow
     * ------------------------------------------------------------------ */

    /* Remember a completed delivery across reloads of the same tab, so pressing
     * "نصب کردم؛ بررسی کن" never streams the same installer again. */
    var DELIVERED_KEY = 'spGateDelivered';
    function markDelivered() {
        state.delivered = true;
        try {
            window.sessionStorage.setItem(DELIVERED_KEY, state.installer ? state.installer.url : '1');
        } catch (e) {
            /* private mode / old engine — in-memory flag still works */
        }
    }
    function wasDelivered() {
        if (state.delivered) return true;
        try {
            return !!window.sessionStorage.getItem(DELIVERED_KEY);
        } catch (e) {
            return false;
        }
    }
    function deliveredUrl() {
        if (state.installer && state.installer.url) return state.installer.url;
        try {
            var saved = window.sessionStorage.getItem(DELIVERED_KEY);
            if (saved && saved !== '1') return saved;
        } catch (e) {
            /* ignore */
        }
        return window.SepehrBrowserGate.installerUrl;
    }

    function start(report) {
        state.report = report || check();
        // Two situations must NOT go through the installer flow:
        // 1. 'error' — a capable browser that merely failed to join (server hiccup).
        // 2. 'restricted' — a *new enough* browser without WebRTC (embedded pane /
        //    blocking extension / plain-HTTP): re-installing the browser cannot help,
        //    it would just re-download ~160MB on every reload forever.
        if (state.mode === 'error' || state.report.restricted) {
            installerMissing();
            return;
        }
        // Already delivered in this tab (even before a reload)? Jump straight to the
        // install guidance — never stream the same ~160MB twice in one session.
        if (wasDelivered()) {
            if (!state.installer) state.installer = { url: deliveredUrl(), size: 0 };
            downloadComplete();
            return;
        }
        findInstaller(
            state.report.info,
            function (found) {
                state.installer = found;
                beginDownload();
            },
            function () {
                installerMissing();
            }
        );
    }

    function hideBar() {
        var row = el('spGateBarRow');
        if (row) row.style.display = 'none';
    }

    function installerMissing() {
        var report = state.report || {};
        var restricted = !!report.restricted;
        var ext = !!report.blockedByExtension;
        var gate = el('spBrowserGate');

        if (restricted) {
            var info = report.info || {};
            var browserLabel = info.name || 'مرورگر';
            if (info.major) browserLabel += ' ' + info.major;
            if (gate) gate.className = 'sp-gate is-warning';
            hideBar();
            setRing(1, 'نیاز به توجه');
            el('spGatePct').innerHTML = '!';
            if (ext) {
                setStatus('افزونهٔ «WebRTC Control» جلوی تماس تصویری را گرفته است');
                setMeta(
                    '<span class="sp-gate__pill">مرورگر: <b>' +
                        escapeHtml(browserLabel) +
                        '</b> — به‌روز</span>' +
                        '<span class="sp-gate__pill">افزونهٔ مسدودکننده شناسایی شد</span>'
                );
                setHint(
                    'مرورگر شما هیچ مشکلی ندارد و <b>لازم نیست چیزی نصب کنید</b>. ' +
                        'اگر افزونه را پیدا نکردید: منوی ⋮ ← Extensions ← Manage extensions. ' +
                        'راه سریع موقت: همین آدرس را در پنجرهٔ ناشناس (Ctrl+Shift+N) باز کنید.'
                );
                showSteps('extension');
            } else {
                setStatus('تماس تصویری در این پنجره در دسترس نیست');
                setMeta(
                    '<span class="sp-gate__pill">مرورگر: <b>' +
                        escapeHtml(browserLabel) +
                        '</b> — به‌روز</span>' +
                        '<span class="sp-gate__pill">محدودیت محیط اجرا</span>'
                );
                setHint('نصب دوبارهٔ مرورگر این مشکل را حل نمی‌کند؛ فقط محیط اجرا را عوض کنید.');
                showSteps('restricted');
            }
            var actionsR = el('spGateActions');
            if (actionsR) {
                actionsR.innerHTML =
                    '<button type="button" class="sp-gate__btn sp-gate__btn--primary" onclick="location.reload()">بررسی دوباره</button>' +
                    '<a class="sp-gate__btn sp-gate__btn--ghost" href="/">بازگشت به خانه</a>';
            }
            var ringR = el('spGateRing');
            if (ringR) ringR.className = 'sp-gate__ring';
            return;
        }

        if (state.mode === 'error') {
            hideBar();
            setRing(1, 'نیاز به به‌روزرسانی نیست');
            el('spGatePct').innerHTML = '↻';
            setStatus('اتصال به جلسه برقرار نشد؛ مرورگر شما مشکلی ندارد');
            setMeta(
                '<span class="sp-gate__pill">' +
                    escapeHtml(state.errorMessage || 'خطای موقت در راه‌اندازی جلسه') +
                    '</span>'
            );
            setHint('این یک خطای لحظه‌ای است، نه مشکل مرورگر شما. دکمهٔ زیر را بزنید تا دوباره تلاش کنیم.');
            showSteps('retry');
            var actionsRetry = el('spGateActions');
            if (actionsRetry) {
                actionsRetry.innerHTML =
                    '<button type="button" class="sp-gate__btn sp-gate__btn--primary" onclick="location.reload()">تلاش دوباره برای ورود</button>' +
                    '<a class="sp-gate__btn sp-gate__btn--ghost" href="/">بازگشت به خانه</a>';
            }
            var ringErr = el('spGateRing');
            if (ringErr) ringErr.className = 'sp-gate__ring';
            return;
        }

        hideBar();
        setRing(0, 'نصب‌کننده یافت نشد');
        el('spGatePct').innerHTML = '!';
        setStatus('نسخهٔ به‌روز مرورگر روی سامانه قرار نگرفته است');
        setMeta('<span class="sp-gate__pill">برای راه‌اندازی، با واحد پشتیبانی سامانه تماس بگیرید</span>');
        setHint('');
        showSteps('generic');
        var actions = el('spGateActions');
        if (actions) {
            actions.innerHTML =
                '<button type="button" class="sp-gate__btn sp-gate__btn--ghost" onclick="location.reload()">بررسی دوباره</button>' +
                '<a class="sp-gate__btn sp-gate__btn--ghost" href="/">بازگشت به خانه</a>';
        }
        var ring = el('spGateRing');
        if (ring) ring.className = 'sp-gate__ring';
    }

    function beginDownload() {
        var url = state.installer.url;
        var total = state.installer.size;
        var fileName = trimFileName(url);

        setMeta(
            '<span class="sp-gate__pill">دریافت «' +
                escapeHtml(fileName) +
                '»</span>' +
                '<span class="sp-gate__pill">حجم کل: <b>' +
                faBytes(total) +
                '</b></span>'
        );
        setHint('در حال دریافت فایل نصب…');
        setStatus('در حال دریافت نصب‌کنندهٔ مرورگر');
        state.downloadStartedAt = Date.now();
        state.lastSample = null;

        if (state.xhr) {
            try {
                state.xhr.abort();
            } catch (e) {
                /* ignore */
            }
        }

        state.xhr = xhrRequest({
            method: 'GET',
            url: url,
            responseType: 'blob',
            onProgress: function (event) {
                if (event.lengthComputable || total) {
                    var t = total || event.total;
                    var loaded = event.loaded;
                    var now = Date.now();
                    var fraction = t ? loaded / t : 0;
                    setRing(fraction, 'در حال دریافت');
                    setBar(fraction);
                    var parts = ['<span class="sp-gate__pill"><b>' + faBytes(loaded) + '</b> از ' + faBytes(t) + '</span>'];
                    if (state.lastSample && now > state.lastSample.time) {
                        var speed = ((loaded - state.lastSample.loaded) * 1000) / (now - state.lastSample.time); // B/s
                        if (speed > 0) {
                            parts.push('<span class="sp-gate__pill">سرعت: <b>' + faBytes(speed) + '/ثانیه</b></span>');
                            var remain = t - loaded;
                            parts.push('<span class="sp-gate__pill">مانده: <b>' + faDuration(remain / speed) + '</b></span>');
                        }
                    }
                    state.lastSample = { time: now, loaded: loaded };
                    setMeta(parts.join(''));
                }
            },
            onSuccess: function (xhr) {
                state.xhr = null;
                var blob = xhr.response;
                if (!blob || !blob.size) {
                    downloadFallback(url);
                    return;
                }
                saveBlob(blob, fileName);
                downloadComplete();
            },
            onError: function () {
                state.xhr = null;
                setStatus('دریافت فایل کامل نشد');
                setHint('ارتباط با سامانه قطع شد؛ دکمهٔ زیر را بزنید تا دوباره دریافت شود.');
                var actions = el('spGateActions');
                if (actions) {
                    actions.innerHTML =
                        '<button type="button" class="sp-gate__btn sp-gate__btn--primary" id="spGateRetry">دریافت دوباره</button>' +
                        '<a class="sp-gate__btn sp-gate__btn--ghost" href="/">بازگشت به خانه</a>';
                    var retry = el('spGateRetry');
                    if (retry)
                        retry.onclick = function () {
                            actions.innerHTML = '';
                            start(state.report);
                        };
                }
            },
        });
    }

    function saveBlob(blob, fileName) {
        markDelivered(); // never stream the same installer twice in this tab
        var objectUrl = '';
        try {
            objectUrl = URL.createObjectURL(blob);
        } catch (e) {
            /* very old engines */
        }
        var a = document.createElement('a');
        if (objectUrl) {
            a.href = objectUrl;
            a.download = fileName;
        } else {
            a.href = state.installer.url;
            a.setAttribute('download', '');
        }
        a.style.display = 'none';
        document.body.appendChild(a);
        try {
            a.click();
        } catch (e) {
            /* ignore */
        }
        setTimeout(function () {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            if (a.parentNode) a.parentNode.removeChild(a);
        }, 30000);
    }

    function downloadFallback(url) {
        markDelivered();
        // XHR blob failed: let the browser download it natively (no progress, but reliable).
        try {
            var f = document.createElement('iframe');
            f.style.display = 'none';
            f.src = url;
            document.body.appendChild(f);
        } catch (e) {
            window.location.href = url;
        }
        if (state.installer) downloadComplete();
    }

    function downloadComplete() {
        var gate = el('spBrowserGate');
        if (gate) gate.className = 'sp-gate is-done';

        setRing(1);
        // The green check fills the ring center; hide the inner label so nothing overlaps it.
        var ringLbl = el('spGateRingLbl');
        if (ringLbl) ringLbl.style.display = 'none';
        setBar(1);
        setStatus('فایل نصب‌کننده دریافت شد و در پوشهٔ دانلودها ذخیره شد');
        setMeta('<span class="sp-gate__pill">مرحلهٔ بعد: اجرای فایل نصب</span>');
        setHint(
            'اگر دانلود در پنجرهٔ کوچک مرورگر دیده شد، روی <b>نگه‌داشتن فایل</b> بزنید. ' +
                'پس از اجرای نصب، به همین صفحه برگردید — بقیه‌اش با ما.'
        );
        showSteps('install');

        var check = el('spGateCheck');
        var pct = el('spGatePct');
        var bar = el('spGateRingBar');
        var ring = el('spGateRing');
        if (ring) ring.className = 'sp-gate__ring';
        if (check) check.style.display = '';
        if (bar) bar.setAttribute('stroke-dashoffset', '0');
        // Only the SVG check stays visible: the percentage text (and its ✓ fallback)
        // would sit right on top of it and look like a second, blue tick.
        if (pct) pct.style.display = 'none';

        var actions = el('spGateActions');
        if (actions) {
            actions.innerHTML =
                '<a class="sp-gate__btn sp-gate__btn--ghost" href="' +
                state.installer.url +
                '" download>دریافت دوبارهٔ فایل</a>' +
                '<button type="button" class="sp-gate__btn sp-gate__btn--primary" onclick="location.reload()">نصب کردم؛ بررسی کن</button>' +
                '<a class="sp-gate__btn sp-gate__btn--ghost" href="/">بازگشت به خانه</a>';
        }

        beginWatch();
    }

    /* Auto re-check: poll while visible, and re-check instantly on focus. */
    function beginWatch() {
        if (state.pollTimer) clearInterval(state.pollTimer);
        // No ring label here: the completed ring already shows the green check mark,
        // and a second caption inside the circle would overlap it.

        function recheck() {
            if (document.hidden) return;
            var report = check();
            if (report.ok) {
                stopWatch();
                enterRoom();
            }
        }

        // Gently notify the user that the first load of the room can take a moment,
        // so nobody thinks the page froze.
        setHint(
            'نصب را اجرا کنید و به همین صفحه برگردید؛ وضعیت مرورگر را <b>خودکار می‌سنجیم</b>. ' +
                'بار اول ممکن است باز شدن جلسه چند لحظه طول بکشد — طبیعی است.'
        );

        state.pollTimer = setInterval(recheck, RECHECK_INTERVAL_MS);
        if (!state.listenersBound && document.addEventListener) {
            state.listenersBound = true;
            document.addEventListener('visibilitychange', recheck, false);
            window.addEventListener('focus', recheck, false);
        }
        state.recheckTimer = recheck;
    }

    function stopWatch() {
        if (state.pollTimer) clearInterval(state.pollTimer);
        state.pollTimer = null;
        state.recheckTimer = null;
    }

    function enterRoom() {
        var pct = el('spGatePct');
        var lbl = el('spGateRingLbl');
        var checkMark = el('spGateCheck');
        var bar = el('spGateRingBar');
        var ring = el('spGateRing');
        if (ring) ring.className = 'sp-gate__ring';
        if (bar) bar.setAttribute('stroke-dashoffset', '0');
        if (checkMark) checkMark.style.display = '';
        // Only the green SVG check; hide the percentage text so no blue ✓ overlaps it.
        if (pct) pct.style.display = 'none';
        // The green check owns the ring center now; no label underneath.
        if (lbl) lbl.style.display = 'none';
        setStatus('مرورگر شما آماده است — در حال ورود به جلسه…');
        setMeta('<span class="sp-gate__pill">لطفاً چند لحظه صبر کنید</span>');
        setTimeout(function () {
            window.location.reload();
        }, 1200);
    }

    /* ------------------------------------------------------------------ *
     * public API + boot
     * ------------------------------------------------------------------ */

    function show(report) {
        if (document.getElementById('spBrowserGate')) return;
        injectStyles();

        report = report || check();
        // An explicit failing report means "this browser is outdated" (update flow).
        // showError() calls show(null) and keeps its 'error' mode instead.
        if (report && !report.ok) state.mode = 'update';
        var info = report.info || {};
        var browserLabel = info.name || 'مرورگر';
        if (info.major) browserLabel += ' ' + info.major;

        var listItems = '';
        if (report.tooOld) {
            listItems +=
                '<li><span class="sp-gate__dot sp-gate__dot--bad">✕</span><span>نسخهٔ مرورگر قدیمی است (نسخهٔ ۱۱۱ یا جدیدتر لازم است)</span></li>';
        }
        for (var j = 0; j < report.failed.length; j++) {
            listItems +=
                '<li><span class="sp-gate__dot sp-gate__dot--bad">✕</span><span>' +
                escapeHtml(report.failed[j]) +
                '</span></li>';
        }
        if (report.extra) {
            listItems +=
                '<li><span class="sp-gate__dot sp-gate__dot--bad">✕</span><span>' +
                escapeHtml(report.extra) +
                '</span></li>';
        }
        if (!listItems) {
            listItems =
                '<li><span class="sp-gate__dot sp-gate__dot--bad">✕</span><span>این مرورگر از قابلیت‌های لازم برای تماس تصویری پشتیبانی نمی‌کند.</span></li>';
        }

        var isErrorMode = state.mode === 'error';
        var restricted = !!report.restricted;
        var blockedByExtension = !!report.blockedByExtension;
        var gateClass = 'sp-gate' + (restricted ? ' is-warning' : '');
        var html =
            '<div class="' +
            gateClass +
            '" id="spBrowserGate" role="alertdialog" aria-modal="true" aria-labelledby="spGateTitle">' +
            '<div class="sp-gate__card">' +
            crestsMarkup() +
            '<h1 id="spGateTitle">' +
            (isErrorMode
                ? 'اتصال به جلسه برقرار نشد'
                : blockedByExtension
                  ? 'یک افزونه جلوی تماس تصویری را گرفته است'
                  : restricted
                    ? 'تماس تصویری در این پنجره در دسترس نیست'
                    : 'در حال آماده‌سازی مرورگر شما') +
            '</h1>' +
            '<p class="sp-gate__sub">' +
            (isErrorMode
                ? 'مرورگر شما مناسب است؛ فقط برقراری اتصال به جلسه در همین لحظه ممکن نشد.'
                : blockedByExtension
                  ? 'مرورگر شما به‌روز است و <b>هیچ نیازی به نصب دوباره ندارد</b>. افزونه‌ای مانند «WebRTC Control» قابلیت تماس تصویری را در این مرورگر خاموش کرده است؛ با سه قدم زیر حل می‌شود.'
                  : restricted
                    ? 'مرورگر شما به‌روز است؛ اما تماس تصویری در پنجرهٔ فعلی در دسترس نیست (پنجرهٔ داخلی یک نرم‌افزار، سیاست سازمانی یا افزونهٔ مسدودکننده). نصب دوبارهٔ مرورگر کمکی نمی‌کند.'
                    : 'برای برقراری تصویر و صدا در جلسه، نسخهٔ به‌روز مرورگر لازم است. ' +
                      'همهٔ مراحل خودکار انجام می‌شود؛ فقط در یک مرحله اجرای فایل نصب با شماست.') +
            (browserLabel && !isErrorMode && !restricted
                ? ' مرورگر تشخیص‌داده‌شده: <b>' + escapeHtml(browserLabel) + '</b>.'
                : '') +
            '</p>' +
            '<div class="sp-gate__hero">' +
            ringMarkup() +
            '<div class="sp-gate__meta" id="spGateMeta"><span class="sp-gate__pill">' +
            (isErrorMode || restricted ? 'در حال بررسی وضعیت…' : 'در حال بررسی سامانه…') +
            '</span></div>' +
            '<div class="sp-gate__barRow" id="spGateBarRow"><div class="sp-gate__bar"><div class="sp-gate__barFill" id="spGateBarFill"></div></div></div>' +
            '<div class="sp-gate__status" id="spGateStatus"><span class="sp-gate__statusDot"></span>در حال بررسی</div>' +
            '<div class="sp-gate__hint" id="spGateHint"></div>' +
            '</div>' +
            '<ul class="sp-gate__list" id="spGateList" style="display:none">' +
            listItems +
            '</ul>' +
            '<ol class="sp-gate__steps" id="spGateSteps"></ol>' +
            '<div class="sp-gate__actions" id="spGateActions"></div>' +
            '</div></div>';

        var holder = document.createElement('div');
        holder.innerHTML = html;
        var node = holder.firstChild;
        document.body.appendChild(node);

        // Hide the room splash/spinner so only the updater page is visible.
        var splash = document.getElementById('loadingDiv');
        if (splash) splash.style.display = 'none';
        var banner = document.getElementById('disconnectBanner');
        if (banner) banner.style.display = 'none';

        window.__sepehrBrowserBlocked = true;
        console.warn('[browser-gate] outdated browser — self-updater started');

        start(report);
        return report;
    }

    function showError(message) {
        // If the real capability checks fail, that explanation is far more useful than
        // the generic join error (e.g. WebRTC removed by an extension). Never push a
        // healthy-but-blocked browser into the download flow though — show() handles it.
        var report = check();
        if (!report.ok) {
            show(report);
            return;
        }
        state.mode = 'error';
        state.errorMessage = message || '';
        show(null);
    }

    function guard() {
        var report = check();
        if (!report.ok) show(report);
        return report.ok;
    }

    window.SepehrBrowserGate = {
        check: check,
        show: show,
        showError: showError,
        guard: guard,
        installerUrl: (INSTALLERS.chromium[0] || '') + '',
    };

    // Run as soon as the DOM is available: if the bundle cannot run on this browser, the user
    // still gets the Persian self-updater page instead of a dead spinner or an English error.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            if (!check().ok) show();
        });
    } else if (!check().ok) {
        show();
    }
})(window, document);
