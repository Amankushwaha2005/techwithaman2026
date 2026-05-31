# Render fix — 2 minute setup (one time)

GitHub par code push ho chuka hai. Render par **tumhe sirf ye 2 cheezein** karni hain:

## Option A — Sabse aasaan (Deploy Hook)

1. https://dashboard.render.com → **techwithaman-website** → **Settings** → **Deploy Hook** → **Copy URL**
2. https://github.com/Amankushwaha2005/techwithaman-website → **Settings** → **Secrets and variables** → **Actions** → **New secret**
   - Name: `RENDER_DEPLOY_HOOK_URL`
   - Value: (paste deploy hook URL)
3. GitHub → **Actions** → **Deploy to Render** → **Run workflow** (ya koi bhi commit push karo)

## Option B — API script (PowerShell)

1. Render → **Account Settings** → **API Keys** → Create → copy key
2. Terminal:

```powershell
cd "H:\Web Project"
$env:RENDER_API_KEY = "rnd_your_key_here"
.\scripts\configure-render.ps1
```

## Render Environment (zaroori)

**Environment** tab mein ye add karo (`.env` se copy):

```
RAZORPAY_KEY_ID=rzp_live_StbQRH4F0mPGpy
RAZORPAY_KEY_SECRET=(your secret)
BASE_URL=https://techwithaman-website.onrender.com
PAYMENT_ADVANCE_PERCENT=50
```

## Test

Deploy ke baad kholo:

https://techwithaman-website.onrender.com/api/site-info

Sahi JSON:

```json
{"version":"payments-v2","paymentEnabled":true}
```

Phir: https://techwithaman-website.onrender.com/order → **Pay online (Razorpay)** dikhega.
