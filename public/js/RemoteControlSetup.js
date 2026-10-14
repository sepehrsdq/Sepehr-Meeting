'use strict';

const status = document.getElementById('copy-status');

async function copy(btn) {
    // Copy an explicit value (data-copy-text) or the content of another element (data-copy-target)
    const el = btn.dataset.copyTarget ? document.getElementById(btn.dataset.copyTarget) : null;
    const text = btn.dataset.copyText ?? el?.value ?? el?.textContent ?? '';

    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    }
    // Fallback for non-secure contexts (plain http)
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    if (!ok) throw new Error('copy failed');
}

document.querySelectorAll('[data-copy-target], [data-copy-text]').forEach((btn) => {
    const label = btn.textContent;
    let timer;
    btn.addEventListener('click', async () => {
        clearTimeout(timer);
        try {
            await copy(btn);
            btn.textContent = '✓ کپی شد';
            btn.classList.add('copied');
            status.textContent = 'در حافظه کپی شد';
        } catch {
            btn.textContent = 'Ctrl+C را بزنید';
            status.textContent = 'کپی نشد؛ متن را انتخاب کنید و Ctrl+C را بزنید';
        }
        timer = setTimeout(() => {
            btn.textContent = label;
            btn.classList.remove('copied');
            status.textContent = '';
        }, 1800);
    });
});

// Show the macOS permissions note only to Mac users
const platform = navigator.userAgentData?.platform || navigator.platform || '';
if (/mac/i.test(platform) && !/iphone|ipad/i.test(navigator.userAgent)) {
    document.querySelectorAll('.mac-only').forEach((el) => (el.hidden = false));
}

// Tell visitors which RustDesk file to pick for their system
const ua = navigator.userAgent;
const hints = [
    [
        /android/i,
        'اندروید شناسایی شد: راست‌دسک را از',
        'گوگل‌پلی',
        'https://play.google.com/store/apps/details?id=com.carriez.flutter_hbb',
    ],
    [
        /iphone|ipad/i,
        'آیفون یا آیپد شناسایی شد: راست‌دسک را از',
        'اپ‌استور',
        'https://apps.apple.com/app/rustdesk-remote-desktop/id1581225015',
    ],
    [/windows/i, 'ویندوز شناسایی شد: در صفحه دریافت، نصب‌کننده با پسوند .exe (x86_64) را انتخاب کنید.'],
    [/mac/i, 'مک شناسایی شد: فایل با پسوند .dmg را انتخاب کنید (aarch64 برای تراشه اپل و x86_64 برای اینتل).'],
    [/linux/i, 'لینوکس شناسایی شد: فایل .deb (دبیان/اوبونتو)، .rpm (فدورا) یا .AppImage را انتخاب کنید.'],
];
const hint = hints.find(([re]) => re.test(ua));
const hintEl = document.getElementById('os-hint');
if (hint && hintEl) {
    const [, text, linkText, href] = hint;
    hintEl.textContent = text;
    if (href) {
        const a = document.createElement('a');
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = linkText;
        hintEl.append(' ', a, '.');
    }
    hintEl.hidden = false;
}

