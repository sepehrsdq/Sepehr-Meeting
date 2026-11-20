این پوشه برای نصب‌کنندهٔ آفلاین مرورگرها است.

هدف: در شبکهٔ سازمان، کاربری که مرورگرش قدیمی است، صفحهٔ «آماده‌سازی مرورگر» باز می‌شود،
فایل نصب‌کنندهٔ همان مرورگر را با نوار پیشرفت از همین سامانه دریافت می‌کند و پس از نصب،
خودکار دوباره بررسی و وارد جلسه می‌شود.

نام فایل‌ها (ترتیب بررسی از بالا به پایین؛ اولین فایل موجود برنده است):

مرورگرهای کرومیومی (Chrome / Edge / Opera):
    GoogleChromeStandaloneEnterprise64.msi   ← پیشنهادی؛ نصب آفلاین کامل و پایدار
    ChromeStandaloneSetup64.exe              ← متا-نصب‌کننده؛ روی برخی سیستم‌ها خطای INVALID_OPTION می‌دهد
    MicrosoftEdgeEnterpriseX64.msi
    ChromeStandaloneSetup.exe

فایرفاکس:
    FirefoxSetup-win64.exe
    FirefoxSetup.exe
    Firefox-Setup.exe

منبع پیشنهادی (روی رایانه‌ای که اینترنت دارد):
    Chrome  : https://www.google.com/chrome/ → «Chrome Standalone (Offline installer)» Windows 64-bit
              یا نسخهٔ Enterprise MSI از https://chromeenterprise.google/intl/fa/download/
    Edge    : https://www.microsoft.com/edge/download/enterprise → «Microsoft Edge for Business» MSI x64
    Firefox : https://www.mozilla.org/fa/firefox/all/ → نسخهٔ کامل نصب آفلاین Windows 64-bit (فارسی)

نکته‌ها:
- فایل را با «دقیقاً همین نام» در همین پوشه بگذارید؛ هیچ تغییری در کد لازم نیست.
- صفحهٔ به‌روزرسانی مرورگر به‌طور خودکار نوع مرورگر کاربر (کروم/اج یا فایرفاکس) را تشخیص
  می‌دهد و نصب‌کنندهٔ همان خانواده را دریافت می‌کند.
- MSI سازمانی (GoogleChromeStandaloneEnterprise64.msi) به‌جای EXE پیشنهاد می‌شود؛
  EXE معمولی در برخی رایانه‌های سازمانی با خطای «INVALID_OPTION» متوقف می‌شود.
- فایل‌های EXE/MSI به‌خاطر حجم و باینری‌بودن در .gitignore هستند و کامیت نمی‌شوند.

عیب‌یابی رایج (مهم برای پشتیبانی):
- اگر مرورگر کاربر «جدید» است ولی صفحهٔ راهنما می‌گوید افزونه‌ای جلوی تماس تصویری را گرفته
  (یا پیام «تماس تصویری در این پنجره در دسترس نیست»)، هیچ نصب‌کننده‌ای دانلود نمی‌شود و
  مشکل از نصب مرورگر نیست. افزونه‌هایی مثل «WebRTC Control» تابع تماس تصویری (RTCPeerConnection)
  را از صفحه حذف می‌کنند. راه‌حل: افزونه را Remove/Disable کنند و صفحه را دوباره بارگذاری کنند.
  راه سریع موقت: باز کردن همان آدرس در پنجرهٔ ناشناس (Ctrl+Shift+N).
- این حالت را با فایل‌های نصب اشتباه نگیرید؛ نصب دوبارهٔ مرورگر آن را حل نمی‌کند.
