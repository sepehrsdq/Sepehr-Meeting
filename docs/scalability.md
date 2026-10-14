# مقیاس‌پذیری افقی

سامانه دو حالت مقیاس‌پذیری دارد؛ هر دو اختیاری‌اند و به‌صورت پیش‌فرض خاموش هستند.

## ۱) چند worker برای یک اتاق

```dotenv
SCALING_MULTI_WORKER_ROOMS=true
SCALING_MAX_PEERS_PER_ROUTER=20
```

اتاق روی چند worker از mediasoup توزیع می‌شود و هر روتر تا سقفِ تعیین‌شده
شرکت‌کننده می‌گیرد. مناسب سرورهای چند‌هسته‌ای با اتاق‌های پرجمعیت.

## ۲) کلاستر چندسروری

```dotenv
SCALING_CLUSTER=true
SCALING_REDIS_URL=redis://localhost:6379
SCALING_NODE_URL=https://sfu1.example.com
SCALING_KEY_PREFIX=sepehrmeet
```

در این حالت هر اتاق روی یک نود میزبانی می‌شود و ورود شرکت‌کنندگان به همان نود
هدایت می‌شود. Redis نقش هماهنگ‌کننده را دارد و **نباید** از بیرون قابل دسترس باشد.

## سایر کلیدها

| کلید | پیش‌فرض | کاربرد |
|---|---|---|
| `SCALING_NODE_ID` | `hostname-pid` | شناسهٔ یکتای هر نود |
| `SCALING_HEARTBEAT_INTERVAL` | `5` | فاصلهٔ ضربان نود (ثانیه) |
| `SCALING_NODE_TTL` | `15` | مهلت نودِ ساکت قبل از مرگ (ثانیه) |
| `SCALING_ROOM_RESERVATION_TTL` | `600` | مدت رزرو اتاق قبل از اولین ورود (ثانیه) |
| `SCALING_MAX_PEERS_PER_NODE` | `0` | سقف شرکت‌کننده در هر نود (۰ = بی‌نهایت) |

## محل پیاده‌سازی

- ماژول عمومی: `app/src/scaling/`
- اتصال به منطق اتاق‌ها و احراز هویت میزبان: `app/src/ScalingAdapter.js`
- راه‌اندازی در استارتاپ: بخش `Horizontal scaling` در `app/src/Server.js`
