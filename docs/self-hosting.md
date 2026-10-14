# نصب روی سرور شخصی

## پیش‌نیازها

- Node.js **24.x** و npm 11
- دسترسی ورودی به پورت `3010` (وب و سیگنالینگ) و `40000–40100` (رسانه، TCP و UDP)
- دامنه یا IP ثابت برای شبکهٔ داخلی/اینترنت

## مراحل

```bash
git clone https://github.com/sepehrsdq/Sepehr-Meeting.git
cd Sepehr-Meeting
npm install

cp .env.template .env
cp app/src/config.template.js app/src/config.js

npm start
```

سپس در `.env` این مقادیر را تنظیم کنید:

| کلید | نمونه | توضیح |
|---|---|---|
| `SERVER_HOST_URL` | `https://meet.example.com` | آدرس عمومی سامانه |
| `ANNOUNCED_IP` | `192.168.1.10` | آدرسی که mediasoup به کلاینت اعلام می‌کند |
| `JWT_SECRET` | مقدار تصادفی بلند | کلید امضای توکن‌ها |
| `UI_LANGUAGE` | `fa` | زبان پیش‌فرض رابط |

راهنمای کامل ویندوز در [`README-LOCAL-FA.md`](../README-LOCAL-FA.md) و استقرار
به‌صورت سرویس ویندوز در [`DEPLOY-FA.md`](../DEPLOY-FA.md) آمده است.

## اجرا با Docker

```bash
npm run docker:build
npm run docker:run
```

## بخش‌های صفحهٔ معرفی

صفحهٔ معرفی یک طرح فارسی ثابت دارد و بخش‌های «امکانات»، «چطور کار می‌کند» و
«امنیت» همیشه نمایش داده می‌شوند. بخش امکانات را می‌توان از `.env` پنهان کرد:

```dotenv
SHOW_FEATURES=true # false بخش امکانات را پنهان می‌کند
```

این کلید به `ui.brand.html.features` در [`app/src/config.js`](../app/src/config.js)
نگاشت می‌شود؛ با `false` شدن، بخش امکانات و لینک ناوبری آن حذف می‌شود. کلیدهای
قدیمی‌تر `SHOW_LANDING_ABOUT` و `SHOW_FAQ` بی‌اثرند و فقط برای سازگاری با
فایل‌های پیکربندی قبلی پذیرفته می‌شوند.

این تنظیمات به فعال بودن `ui.brand.htmlInjection` وابسته‌اند؛ بعد از تغییر،
سرور را ریاستارت کنید.
