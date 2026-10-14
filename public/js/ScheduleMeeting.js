'use strict';

// ####################################################
// SCHEDULE MEETING (landing, newroom & login pages)
// ####################################################

let scheduleMeetingTemplateHtml = null;

function showScheduleSwal(options) {
    return Swal.fire({
        background: '#ffffff',
        color: '#14142b',
        confirmButtonColor: '#6366f1',
        cancelButtonColor: '#8a90a8',
        customClass: { popup: 'sch-popup', confirmButton: 'sch-btn', cancelButton: 'sch-btn' },
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
        ...options,
    });
}

function loadScheduleMeetingAssets() {
    const assets = [
        { tag: 'link', rel: 'stylesheet', href: '../css/ScheduleMeeting.css' },
        { tag: 'link', rel: 'stylesheet', href: '../vendor/flatpickr/flatpickr.min.css' },
    ];
    assets.forEach(({ tag, rel, href }) => {
        const el = document.createElement(tag);
        el.rel = rel;
        el.href = href;
        document.head.appendChild(el);
    });
    if (typeof flatpickr === 'undefined') {
        const script = document.createElement('script');
        script.src = '../vendor/flatpickr/flatpickr.min.js';
        document.head.appendChild(script);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const scheduleBtn = document.getElementById('scheduleMeetingBtn');
    if (!scheduleBtn) return;

    fetch('/isScheduleMeetingEnabled')
        .then((res) => res.json())
        .then((data) => {
            if (data.enabled) {
                scheduleBtn.hidden = false;
                const divider = document.getElementById('scheduleMeetingDivider');
                if (divider) divider.hidden = false;
                // Load CSS/JS dependencies and pre-fetch template
                loadScheduleMeetingAssets();
                fetch('../views/scheduleMeeting.html')
                    .then((res) => res.text())
                    .then((html) => (scheduleMeetingTemplateHtml = html))
                    .catch((err) => console.error('Failed to load schedule meeting template', err));
            }
        })
        .catch((err) => console.error('Failed to load feature flags', err));

    scheduleBtn.addEventListener('click', () => {
        openScheduleModal();
    });
});

function openScheduleModal() {
    if (!scheduleMeetingTemplateHtml) {
        console.error('Schedule meeting template not loaded');
        return;
    }

    // Get room name from landing/newroom (#roomName) or login page (#customRoomInput / #selectRoom)
    const customRoomInput = document.getElementById('customRoomInput');
    const roomEl =
        document.getElementById('roomName') ||
        (customRoomInput && customRoomInput.offsetParent !== null ? customRoomInput : null) ||
        document.getElementById('selectRoom');
    const roomName = roomEl ? filterXSS(roomEl.value.trim()) : '';

    const container = document.createElement('div');
    container.innerHTML = scheduleMeetingTemplateHtml;

    if (roomName) {
        container.querySelector('#schRoomName').setAttribute('value', roomName);
    }

    showScheduleSwal({
        allowOutsideClick: false,
        allowEscapeKey: true,
        position: 'center',
        title: '<i class="fas fa-calendar-check" style="margin-inline-end:8px;color:#6366f1"></i> زمان‌بندی جلسه',
        html: container.innerHTML,
        confirmButtonText: '<i class="fas fa-paper-plane"></i> ارسال دعوت‌نامه‌ها',
        showCancelButton: true,
        cancelButtonText: 'انصراف',
        didOpen: () => {
            flatpickr('#schDateTime', {
                enableTime: true,
                dateFormat: 'Y-m-d H:i',
                time_24hr: true,
                minDate: 'today',
                locale: {
                    weekdays: {
                        shorthand: ['یک', 'دو', 'سه', 'چهار', 'پنج', 'جمعه', 'شنبه'],
                        longhand: ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'],
                    },
                    months: {
                        shorthand: ['فرو', 'ارد', 'خرد', 'تیر', 'مرد', 'شهر', 'مهر', 'آبا', 'آذر', 'دی', 'بهم', 'اسف'],
                        longhand: [
                            'فروردین',
                            'اردیبهشت',
                            'خرداد',
                            'تیر',
                            'مرداد',
                            'شهریور',
                            'مهر',
                            'آبان',
                            'آذر',
                            'دی',
                            'بهمن',
                            'اسفند',
                        ],
                    },
                    firstDayOfWeek: 6,
                    weekAbbreviation: 'هفته',
                    scrollTitle: 'برای تغییر اسکرول کنید',
                    toggleTitle: 'برای باز و بسته کردن کلیک کنید',
                    amPM: ['ق.ظ', 'ب.ظ'],
                    ordinal: () => '',
                },
            });
        },
        preConfirm: () => {
            const title = document.getElementById('schTitle').value.trim();
            const description = document.getElementById('schDescription').value.trim();
            const schRoomName = document.getElementById('schRoomName').value.trim();
            const dateTime = document.getElementById('schDateTime').value.trim();
            const duration = document.getElementById('schDuration').value.trim();
            const recipients = document.getElementById('schRecipients').value.trim();

            if (!title) {
                Swal.showValidationMessage('عنوان جلسه الزامی است');
                return false;
            }
            if (!schRoomName) {
                Swal.showValidationMessage('نام اتاق الزامی است');
                return false;
            }
            if (!dateTime) {
                Swal.showValidationMessage('تاریخ و ساعت الزامی است');
                return false;
            }
            if (!duration || parseInt(duration) < 5) {
                Swal.showValidationMessage('مدت جلسه باید حداقل ۵ دقیقه باشد');
                return false;
            }
            if (!recipients) {
                Swal.showValidationMessage('حداقل یک نشانی ایمیل لازم است');
                return false;
            }

            return { title, description, roomName: schRoomName, dateTime, duration, recipients };
        },
    }).then(async (result) => {
        if (result.isConfirmed && result.value) {
            await sendScheduleMeeting(result.value);
        }
    });
}

async function sendScheduleMeeting(data) {
    try {
        showScheduleSwal({
            title: 'در حال ارسال دعوت‌نامه‌ها...',
            allowOutsideClick: false,
            showClass: {},
            hideClass: {},
            didOpen: () => Swal.showLoading(),
        });

        const res = await fetch('/scheduleMeeting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        const result = await res.json();

        if (res.ok) {
            showScheduleSwal({
                icon: 'success',
                title: 'دعوت‌نامه‌ها ارسال شد',
                text: result.message,
            });
        } else {
            showScheduleSwal({
                icon: 'error',
                title: 'ارسال انجام نشد',
                text: result.message || 'ارسال دعوت‌نامه‌ها ممکن نشد',
            });
        }
    } catch (err) {
        console.error('Schedule meeting error', err);
        showScheduleSwal({
            icon: 'error',
            title: 'خطا',
            text: 'ارسال دعوت‌نامه‌های جلسه ممکن نشد',
        });
    }
}
