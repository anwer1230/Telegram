# 🚀 دليل النشر الشامل والنهائي على منصة ريندر (Render.com)

تم تجهيز وضبط جميع ملفات المشروع وإعداداته ليعمل بنجاح 100% على منصة **Render.com** سواء كنظام تشغيل **Node.js Web Service** أو عبر **Render Blueprint (`render.yaml`)** أو عبر **حاوية Docker**.

---

## 📦 1. ملفات النشر الجاهزة في المشروع

| الملف | الوظيفة والدور |
| :--- | :--- |
| **`render.yaml`** | ملف Blueprint لأتمتة إنشاء الخدمة على ريندر بنقرة واحدة وضبط المتغيرات ومسار الفحص الصحي |
| **`package.json`** | يحتوي على أوامر البناء والتشغيل (`build`, `start`) وتحديد بيئة `engines` (Node 20+) |
| **`.node-version`** | يحدد إصدار Node.js (20.18.0) لبيئة بناء ريندر |
| **`Procfile`** | ملف إضافي لتحديد أمر تشغيل الخادم (`web: npm start`) |
| **`Dockerfile`** | ملف بناء الحاوية متعدد المراحل (Multi-stage) فائق الخفة (Alpine) |
| **`.dockerignore`** | يتجاهل الملفات غير الضرورية أثناء بناء الدوكر لتسريع العملية |
| **`.gitignore`** | مهيأ لرفع كافة ملفات الكود والمصادر دون رفع ملفات البناء المؤقتة أو الأسرار |
| **`.env.example`** | يوثق جميع المتغيرات المطلوبة واختياراتها |

---

## 💻 2. خطوات رفع المشروع بالكامل إلى GitHub / GitLab (الأوامر النهائية)

إذا كنت ترغب في رفع كافة ملفات المشروع إلى مستودعك الجديد:

```bash
# 1. التأكد من التهيئة الأولية للجيت
git init

# 2. إضافة كافة ملفات المشروع المُجهزة
git add .

# 3. حفظ التغييرات (Commit)
git commit -m "feat: complete Telegram_Anwer project setup for Render production deploy"

# 4. تحديد الفرع الرئيسي
git branch -M main

# 5. ربط المستودع البعيد (استبدل بالرابط الخاص بمستودعك)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git

# 6. دفع المشروع كاملاً بشكل نهائي
git push -u origin main --force
```

---

## ⚡ 3. خيارات النشر على منصة Render

### الخيار (أ): النشر التلقائي بنقرة واحدة عبر Blueprint (موصى به ⭐)
1. افتح حسابك في **[لوحة تحكم ريندر (Render Dashboard)](https://dashboard.render.com)**.
2. اضغط على زر **New +** ثم اختر **Blueprint**.
3. قم بتوصيل مستودع GitHub الخاص بك.
4. سيتعرف ريندر فوراً على ملف `render.yaml` ويقوم بضبط كل شيء (المتغيرات، مسار الفحص، أمر البناء، وأمر التشغيل) تلقائياً!
5. اضغط **Apply** وانتظر بضع دقائق حتى يكتمل النشر وتصبح حالتك **Live**.

---

### الخيار (ب): النشر اليدوي كـ Web Service (Manual Web Service)
إذا اخترت إنشاء خدمة يدوية (**New + Web Service**):

* **Name:** `telegram-anwer-web`
* **Runtime:** `Node`
* **Region:** `Frankfurt (EU)` أو أي منطقة قريبة
* **Branch:** `main`
* **Build Command:**
  ```bash
  npm install && npm run build
  ```
* **Start Command:**
  ```bash
  npm start
  ```
* **Health Check Path:**
  ```text
  /api/health
  ```
* **Plan:** `Free`

#### متغيرات البيئة (Environment Variables) في ريندر:
أضف المتغيرات التالية في تبويب **Environment**:

| اسم المتغير (Key) | القيمة الافتراضية (Value) |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `TELEGRAM_API_ID` | `22043994` |
| `TELEGRAM_API_HASH` | `56f64582b363d367280db96586b97801` |
| `API_ID` | `22043994` |
| `API_HASH` | `56f64582b363d367280db96586b97801` |
| `TDLIB_API_HASH` | `56f64582b363d367280db96586b97801` |
| `RENDER_DEPLOY_HOOK_URL` | `https://api.render.com/deploy/srv-d8rb0avavr4c73ebc2pg?key=1_fvBe3GPP8` |
| `SESSION_SECRET` | `tg_session_anwer_foud_secure_key_2026` |
| `VAPID_PUBLIC_KEY` | `BE36BmheMRx2GxzjWpp_4bmXq_hZg55bP_M_vNVysfnjTxns9VCI0hiCHgnRBx0URe_LoxWaAgrS9G9QZbQhOh8` |
| `VAPID_PRIVATE_KEY`| `13NU1_GmeL7bDQcVtlFyuKqsnnsX3XkOyE--2rAQJw4` |
| `VAPID_SUBJECT` | `mailto:admin@telegram-anwer.app` |
| `GEMINI_API_KEY` | *(مفتاح اختياري للذكاء الاصطناعي)* |
| `GROQ_API_KEY` | *(مفتاح اختياري لـ Groq)* |

*(ملاحظة: متغير `PORT` يتم تعيينه تلقائياً بواسطة ريندر ويستجيب له خادمنا تلقائياً).*

---

### الخيار (ج): النشر كحاوية Docker
إذا أردت النشر عبر Docker:
* اختر بيئة التشغيل **Docker** في ريندر.
* سيقوم ريندر تلقائياً باستخدام ملف `Dockerfile` متعدد المراحل الجاهز داخل المشروع.

---

## 🔍 4. روابط التأكد والفحص بعد انتهاء النشر (Health & Status)

بمجرد أن يصبح الرابط المباشر لتطبيقك نشطاً (`https://your-app.onrender.com`)، يمكنك التأكد من عمل جميع الأنظمة:

* **فحص سلامة الخادم والاستجابة:**
  `https://your-app.onrender.com/api/health`
* **فحص حالة محرك تيليجرام و MTProto:**
  `https://your-app.onrender.com/api/telegram/status`
* **فحص معلومات البيئة المشفرة:**
  `https://your-app.onrender.com/api/env/info`
* **فحص مفاتيح إشعارات Web Push:**
  `https://your-app.onrender.com/api/web-push/vapid-public-key`
