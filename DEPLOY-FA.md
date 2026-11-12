# استقرار «میتینگ داخلی» روی Windows Server

راهنمای کامل انتقال این نصب لوکال به سرور ویندوزی تولید (کنار دو پرتال دیگر).

---

## ۱. پیش‌نیازها روی سرور

- **Node.js ≥ 24** (نصب MSI از بسته آفلاین — سرور اینترنت ندارد، نصب‌کننده را از لپ‌تاپ منتقل کنید)
- پورت‌های آزاد:
  - `3010/TCP` — وب‌سرور (HTTPS)
  - `40000–40150/TCP+UDP` — ترافیک مدیای WebRTC
- فایروال (PowerShell ادمین):

```powershell
New-NetFirewallRule -DisplayName "SepehrMeeting Web" -Direction Inbound -Protocol TCP -LocalPort 3010 -Action Allow
New-NetFirewallRule -DisplayName "SepehrMeeting Media TCP" -Direction Inbound -Protocol TCP -LocalPort 40000-40150 -Action Allow
New-NetFirewallRule -DisplayName "SepehrMeeting Media UDP" -Direction Inbound -Protocol UDP -LocalPort 40000-40150 -Action Allow
```

## ۲. انتقال پوشه

کل پوشه `Sepehr-Meeting` را کپی کنید، **به‌جز**:

- `node_modules\` (روی سرور دوباره نصب می‌شود)
- `.git\`

```powershell
# روی سرور، داخل پوشه پروژه:
npm install --no-audit --no-fund
```

> نصب روی سرور آفلاین: پوشه `node_modules` را از لپ‌تاپ کپی کنید **یا** از npm cache آفلاین استفاده کنید. mediasoup به بیلد native نیاز دارد، پس ساده‌ترین راه کپی مستقیم `node_modules` کامل است (معماری x64 یکسان باشد).

## ۳. تنظیمات اختصاصی سرور — `.env`

فایل `.env` را باز کنید و این موارد را برای سرور نهایی ویرایش کنید:

```ini
# IP واقعی NIC سرور (مهم‌ترین تنظیم! IP لوکال سرور را بگذارید)
SFU_ANNOUNCED_IP=192.168.x.x

# تولیدی
NODE_ENV=production
SERVER_HOST_URL=https://MEETING-01:3010

# JWT_SECRET را عوض کنید! (روی سرور مقدار جدید بسازید)
JWT_SECRET=<64 hex char random>
```

## ۴. گواهی SSL معتبر داخلی

برای اینکه مرورگرها هشدار ندهند، از CA داخلی سازمان گواهی بسازید و مسیرها را در `.env` بدهید:

```ini
SERVER_SSL_CERT=../ssl/company-cert.pem
SERVER_SSL_KEY=../ssl/company-key.pem
```

(فایل‌ها را در `app/ssl/` قرار دهید. برای توسعهٔ محلی `npm run ssl:dev` یک جفت self-signed می‌سازد؛ کلید خصوصی هیچ‌وقت کامیت نمی‌شود.)

## ۵. نصب به‌عنوان Windows Service

در PowerShell **با دسترسی Administrator**:

```powershell
cd C:\path\to\Sepehr-Meeting
node service.js install
```

سرویس با نام `SepehrMeeting` ثبت و استارت می‌شود؛ در کرش خودکار ری‌استارت می‌شود و بعد از بوت سرور هم بالا می‌آید.

حذف سرویس:

```powershell
node service.js uninstall
```

## ۶. هم‌زیستی با پرتال‌های دیگر

- مصرف منابع پایه حدود **150–250MB RAM** و کمتر از ۱ هسته در حالت بیکاری است.
- سرویس به‌صورت مستقل روی پورت 3010 گوش می‌دهد؛ اگر پرتال دیگری روی IIS است، می‌توانید Reverse Proxy (ARR) بگذارید یا مستقیم پورت را expose کنید.
- ماژول **ServerProfiler** موقع استارت سخت‌افزار واقعی سرور را می‌خواند و تعداد worker/سقف شرکت‌کننده پیشنهادی را در لاگ و در `/api/v1/serverProfile` نشان می‌دهد — برای اعمال تنظیم پیشنهادی روی سرور قوی‌تر:

```ini
# مثال برای سرور ۱۶ هسته‌ای:
SFU_NUM_WORKERS=15
```

## ۷. چک‌لیست پس از نصب

| بررسی | روش |
|---|---|
| سرویس بالا آمد؟ | `Get-Service SepehrMeeting` |
| وب جواب می‌دهد؟ | `curl.exe -k https://localhost:3010/` |
| پروفایل سخت‌افزار | `curl.exe -k https://localhost:3010/api/v1/serverProfile` |
| لاگ سرویس | Event Viewer → Application → source `SepehrMeeting` |
| تست دو نفره | از دو کلاینت LAN به `https://SERVER-IP:3010/join/test?name=A&video=1&audio=1` |
| صدا/تصویر دوطرفه | در room، هر دو پیر باید thumbnail داشته باشند |
| چت (DataChannel) | ارسال پیام بین دو کلاینت |

## ۸. نکات آفلاین

- تمام کتابخانه‌های فرانت در `public/vendor/` لوکال شده‌اند (GSAP, Bootstrap, FontAwesome, فونت‌ها و...) — هیچ درخواستی به اینترنت نمی‌رود.
- Analytics غیرفعال است (`STATS_ENABLED=false`).
- IP عمومی خودکار از NIC لوکال خوانده می‌شود؛ سرویس‌های `ipify` و امثال آن فراخوانی نمی‌شوند.
