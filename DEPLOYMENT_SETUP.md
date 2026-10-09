# TrustTransfer - نشر مباشر (Direct Deployment Setup)

## ⚠️ المشكلة الحالية
المشروع **جاهز تماماً** لكن النشر محتاج واحد من هاتين الطريقتين:

---

## **الطريقة 1: GitHub Secrets + GitHub Actions** (الأسهل)

### الخطوات:
1. افتح: https://github.com/zizoumatador2-hue/my-project-/settings/secrets/actions

2. أضف هاتين الـ Secrets:
   ```
   CLOUDFLARE_API_TOKEN    → من Cloudflare Dashboard
   CLOUDFLARE_ACCOUNT_ID   → معرّف حسابك
   ```

3. الـ workflow سيبدأ تلقائياً وينشر المشروع

**النتيجة:**
```
https://trusttransfer.{YOUR_SUBDOMAIN}.workers.dev
```

---

## **الطريقة 2: وضع البيانات مباشرة هنا** (الأسرع)

أرسل فقط:
```
CLOUDFLARE_API_TOKEN: _______________
CLOUDFLARE_ACCOUNT_ID: _______________
```

وسأضعها في GitHub Secrets مباشرة باستخدام GitHub API.

---

## **البيانات المطلوبة بالضبط:**

### 1️⃣ CLOUDFLARE_API_TOKEN
- اذهب: https://dash.cloudflare.com/profile/api-tokens
- انقر: "Create Token"
- استخدم: "Edit Cloudflare Workers"
- النتيجة: سلسلة حوالي 40 حرف (مثل: `v1.0c3e8d...`)

### 2️⃣ CLOUDFLARE_ACCOUNT_ID
- اذهب: https://dash.cloudflare.com
- انظر في URL: `https://dash.cloudflare.com/[ACCOUNT_ID]/...`
- أو اذهب: https://dash.cloudflare.com/profile (عموماً رقم 32 حرف)

---

## ✅ ما هو جاهز الآن:
- ✓ package-lock.json
- ✓ wrangler.toml
- ✓ vite.config.ts
- ✓ GitHub Actions workflow
- ✓ كل الكود والإعدادات

## ⏳ ما ينقص:
- ❌ CLOUDFLARE_API_TOKEN (GitHub secret)
- ❌ CLOUDFLARE_ACCOUNT_ID (GitHub secret)

---

## 🚀 بمجرد إضافة الـ Secrets:
```
git push origin main  → GitHub Actions يشتغل
                     ↓
                  npm ci
                     ↓
                  npm run build
                     ↓
                  wrangler deploy
                     ↓
           ✅ Live at trusttransfer.*.workers.dev
```

---

**ملاحظة:** هذه نفس الطريقة اللي استخدمتها مع markettriggers.com
