# 🚀 دليل النشر الشامل على منصة ريندر (Render.com)

تم تحديث وضبط إعدادات المشروع للفرع الرئيسي `main` في المستودع:
`https://github.com/anwer1230/Documents`

---

## 📦 1. ملفات الإعداد المهيأة في المشروع

| الملف | الوظيفة والدور في منصة Render |
| :--- | :--- |
| **`render.yaml`** | ملف Blueprint لأتمتة إنشاء الخدمة على ريندر بنقرة واحدة وضبط المتغيرات ومسار الفحص الصحي |
| **`.npmrc`** | يفعّل `legacy-peer-deps=true` تلقائياً لمنع أخطاء ERESOLVE أثناء تثبيت الحزم على ريندر |
| **`package.json`** | يحتوي على `react-is` وأوامر البناء والتشغيل (`build`, `start`) والاعتماديات الكاملة |
| **`server.ts`** | تم تعديل منفذ الاستماع ليكون ديناميكياً `process.env.PORT || 3000` ليتوافق تماماً مع ريندر |
| **`Dockerfile`** | يدعم البناء السريع متعدد المراحل بحاوية Node 20 مع منفذ ريندر التلقائي |
| **`.node-version`** | يحدد إصدار Node.js (20.x) لبيئة بناء ريندر الرسمية |

---

## ⚡ 2. طرق النشر على منصة Render

### الطريقة الأولى: النشر التلقائي عبر Blueprint (موصى بها ⭐)
1. ادخل إلى حسابك في **[Render Dashboard](https://dashboard.render.com)**.
2. انقر على **New +** ثم اختر **Blueprint**.
3. اختر مستودعك: `anwer1230/Documents` (فرع `main`).
4. سيقرأ ريندر ملف `render.yaml` تلقائياً ويقوم بتهيئة الخدمة والمتغيرات.
5. انقر **Apply** وسيبدأ البناء والنشر تلقائياً.

### الطريقة الثانية: النشر اليدوي كـ Web Service
1. في لوحة تحكم Render، اختر **New +** ثم **Web Service**.
2. اختر مستودع `anwer1230/Documents` والفرع `main`.
3. اضبط الإعدادات التالية بدقة:
   - **Name:** `telegram-anwer-web`
   - **Runtime:** `Node`
   - **Region:** `Frankfurt (EU)` أو الأقرب إليك
   - **Build Command:**
     ```bash
     npm install --legacy-peer-deps && npm run build
     ```
   - **Start Command:**
     ```bash
     npm start
     ```
   - **Health Check Path:**
     ```text
     /api/health
     ```

#### متغيرات البيئة (Environment Variables):
| المفتاح (Key) | القيمة (Value) |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `NODE_OPTIONS` | `--max-old-space-size=460` |
| `API_ID` | `22043994` |
| `API_HASH` | `56f64582b363d367280db96586b97801` |
| `TDLIB_API_HASH` | `56f64582b363d367280db96586b97801` |
| `SESSION_SECRET` | `tg_session_anwer_foud_secure_key_2026` |
| `VAPID_PUBLIC_KEY` | `BE36BmheMRx2GxzjWpp_4bmXq_hZg55bP_M_vNVysfnjTxns9VCI0hiCHgnRBx0URe_LoxWaAgrS9G9QZbQhOh8` |
| `VAPID_PRIVATE_KEY` | `13NU1_GmeL7bDQcVtlFyuKqsnnsX3XkOyE--2rAQJw4` |
| `VAPID_SUBJECT` | `mailto:anwrsaifanwr@gmail.com` |

---

## 🔍 3. التحقق من سلامة النشر (Health Check)
بمجرد اكتمال النشر وتحول الحالة إلى **Live**، يمكنك زيارة:
- `https://your-service.onrender.com/api/health`

---

## ⚡ 4. رابط النشر التلقائي المباشر (Deploy Hook)
تم تثبيت رابط النشر الخاص في كود المشروع وأتمتة إطلاقه:
- **Deploy Hook URL:** `https://api.render.com/deploy/srv-d9acni5aeets73dk554g?key=BULyDDcebf8`
- **GitHub Actions:** تم تفعيل سير عمل `.github/workflows/deploy.yml` ليقوم بطلب الرابط تلقائياً عند أي دفع للفرع `master`.
- **أمر التشغيل السريع:** `npm run deploy:render`

