# دليل النشر الرسمي لتطبيق تيليجرام ويب على Render.com

تم تجهيز هذا المشروع للنشر الفوري والمباشر على منصة **Render** (سواء كخدمة مجانية Free Plan أو خطة مدفوعة)، مع تشغيل الخادم الكامل (Full-Stack Express + MTProto Gateway + Vite Static Production Build).

---

## 🚀 الطريقة الأولى: النشر التلقائي عبر ملف `render.yaml` (Blueprint)

1. سجل الدخول إلى حسابك في موقع [Render.com](https://render.com).
2. انقر على زر **New +** في أعلى الصفحة واختر **Blueprint**.
3. اربط مستودع GitHub الخاص بك: `https://github.com/anwer1230/Telegram`.
4. حدد الفرع: `telegram-web-plus`.
5. سيقرأ Render ملف `render.yaml` المرفق تلقائياً ويهيئ جميع الإعدادات والمتغيرات.
6. انقر على **Apply** وسيبدأ البناء والنشر فوراً!

---

## 🛠️ الطريقة الثانية: النشر اليدوي (Manual Web Service)

إذا أردت إنشاء الخدمة يدوياً عبر لوحة التحكم:

1. من لوحة التحكم في Render، انقر على **New +** ثم اختر **Web Service**.
2. اختر مستودعك: `https://github.com/anwer1230/Telegram`.
3. قم بملء الحقول كما يلي:
   - **Name:** `telegram-web-plus` (أو أي اسم تفضله)
   - **Region:** `Frankfurt (EU Central)` (موصى بها لقربها من سيرفرات تيليجرام DC4 أمستردام)
   - **Branch:** `telegram-web-plus`
   - **Root Directory:** اتركه فارغاً (الجذر)
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Plan:** `Free` (أو Starter)

4. في قسم **Environment Variables** (المتغيرات البيئية)، أضف المتغيرات التالية:
   - `NODE_ENV` = `production`
   - `PORT` = `10000`
   - `TELEGRAM_API_ID` = `34773007`
   - `TELEGRAM_API_HASH` = `2a6b16abed75c3f6898ee79e9237fd25`

5. في قسم **Health Check Path** (اختياري لكن موصى به):
   - اكتب: `/api/telegram/status`

6. انقر على **Create Web Service**.

---

## 📡 بعد اكتمال النشر:
سيعطيك Render رابطاً عاماً بصيغة:
`https://telegram-web-plus-xxxx.onrender.com`

سيكون التطبيق متصلاً بسحابة تيليجرام الرسمية ويعمل بكافة ميزاته:
- التشفير الكامل MTProto 2.0.
- الرسائل الصوتية الحقيقية (MediaRecorder).
- إرفاق وتنزيل الملفات والمستندات.
- إنشاء المجموعات والقنوات وجهات الاتصال.
- المكالمات الصوتية المشفرة.
- فحص وسرعة مراكز البيانات السحابية (DC1 - DC5).
