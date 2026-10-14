const fs = require('fs');

// Persian translations for user-facing strings missing from the dict.
const additions = {
    // Toasts / notifications (userLog)
    'No valid background paths found': 'مسیر معتبری برای پس‌زمینه پیدا نشد',
    'The room has no time limit': 'این اتاق محدودیت زمانی ندارد',
    'Already connected to a room': 'هم‌اکنون به یک اتاق متصل هستید',
    'Stop the current stream first': 'ابتدا جریان فعلی را متوقف کنید',
    'Check for speaker changes': 'بررسی تغییرات بلندگو',
    'Permission denied in browser': 'دسترسی در مرورگر رد شد',
    'User cancelled the screen sharing prompt': 'کاربر درخواست اشتراک صفحه را لغو کرد',
    'Noise suppression default': 'حذف نویز پیش‌فرض',
    'Saving recording before leaving the room': 'ذخیره ضبط قبل از ترک اتاق',
    'The whiteboard is unlocked. \n The participants can interact with it.':
        'وایت‌برد باز شد.\nشرکت‌کنندگان می‌توانند با آن تعامل کنند.',
    'Enable noise suppression for all': 'فعال‌سازی حذف نویز برای همه',
    'Disable noise suppression for all': 'غیرفعال‌سازی حذف نویز برای همه',
    'Actions for all participants': 'اقدامات برای همه شرکت‌کنندگان',
    'Video effects preview unavailable': 'پیش‌نمایش جلوه‌های ویدئویی در دسترس نیست',
    'This will remove every breakout room.': 'این کار همه اتاق‌های گروهی را حذف می‌کند.',
    'Participants will no longer be able to join these rooms until you create them again.':
        'تا زمانی که دوباره این اتاق‌ها را بسازید، شرکت‌کنندگان نمی‌توانند به آن‌ها بپیوندند.',
    'All breakout rooms deleted': 'همه اتاق‌های گروهی حذف شدند',
    'Message broadcast to all breakout rooms': 'پیام به همه اتاق‌های گروهی ارسال شد',
    'Retry media access failed': 'تلاش مجدد برای دسترس رسانه ناموفق بود',
    'Required track is missing': 'ترک موردنیاز یافت نشد',
    'Constraints cannot be satisfied by available devices': 'این تنظیمات توسط دستگاه‌های موجود قابل تأمین نیست',
};

// "Room event: X" toasts - generate Persian for each
const roomEvents = {
    'Client start recoding': 'شروع ضبط توسط کاربر',
    'Client pause recoding': 'توقف موقت ضبط توسط کاربر',
    'Client resume recoding': 'ادامه ضبط توسط کاربر',
    'Client stop recoding': 'توقف ضبط توسط کاربر',
    'Client raise hand': 'بلند کردن دست',
    'Client lower hand': 'پایین آوردن دست',
    'Client start audio': 'روشن کردن میکروفون',
    'Client pause audio': 'خاموش کردن میکروفون',
    'Client start video': 'روشن کردن دوربین',
    'Client pause video': 'خاموش کردن دوربین',
    'Client start screen': 'شروع اشتراک صفحه',
    'Client pause screen': 'توقف اشتراک صفحه',
    'Client lock room': 'قفل شدن اتاق',
    'Client unlock room': 'باز شدن اتاق',
    'Client room lobby enabled': 'اتاق انتظار فعال شد',
    'Client room lobby disabled': 'اتاق انتظار غیرفعال شد',
    'Client room locked for new participants': 'اتاق برای شرکت‌کنندگان جدید قفل شد',
    'Client room unlocked for new participants': 'اتاق برای شرکت‌کنندگان جدید باز شد',
    'host only recording enabled': 'ضبط فقط برای میزبان فعال شد',
    'host only recording enabled, going to stop recording': 'ضبط فقط برای میزبان فعال شد؛ ضبط متوقف می‌شود',
    'host only recording disabled': 'ضبط فقط برای میزبان غیرفعال شد',
    'RTMP from URL started': 'پخش RTMP از URL شروع شد',
    'RTMP from URL stopped': 'پخش RTMP از URL متوقف شد',
    'RTMP from URL ended': 'پخش RTMP از URL پایان یافت',
    'Client leave room': 'خروج از اتاق',
};
for (const [ev, fa] of Object.entries(roomEvents)) {
    additions[`Room event: ${ev}`] = fa;
}

const faPath = './public/lang/fa.json';
const fa = JSON.parse(fs.readFileSync(faPath, 'utf8'));
fa.toasts = fa.toasts || {};
fa.dialogs = fa.dialogs || {};
fa.labels = fa.labels || {};

let added = 0, updated = 0;
for (const [k, v] of Object.entries(additions)) {
    // Put toasts into 'toasts', others try to keep namespaces tidy
    if (k.startsWith('Room event:') || /toast|resume|paused|started|stopped/i.test(k)) {
        if (fa.toasts[k] && fa.toasts[k] !== v) { updated++; }
        else if (!fa.toasts[k]) { added++; }
        fa.toasts[k] = v;
    } else {
        if (!fa.labels[k]) added++;
        fa.labels[k] = v;
    }
}

fs.writeFileSync(faPath, JSON.stringify(fa, null, 4));
console.log(`added: ${added}, updated: ${updated}`);
