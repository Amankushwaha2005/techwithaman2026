# Deploy on Render (TechWithAman)

Live URL example: `https://techwithaman-website.onrender.com`

## Fix: "Suspended by you" / site nahi khul rahi

Render par ye message **matlab service band (suspend) hai** — aksar galti se **Suspend** dabne se ya purani paused service resume ke baad.

### Step A — Resume (sabse pehle)

1. https://dashboard.render.com → apni service **`techwithaman-website`** kholo  
2. Upar status **Suspended** dikhe to → **Resume** (ya **Resume service**) dabao  
3. 1–2 min wait → **Manual Deploy** → **Deploy latest commit**  
4. **Logs** tab → build **Succeeded** aur start mein `Server running` dikhe  

### Step B — Agar Resume ka button nahi hai

1. **Settings** → scroll → **Delete Web Service** (sirf Render wali copy delete)  
2. **New +** → **Web Service** (Blueprint dubara)  
3. Repo: `techwithaman-website`, branch `main`  
4. Build: `npm install && npm rebuild better-sqlite3`  
5. Start: `npm start`  
6. Health check: `/health`  

### Step C — Build fail ho to Logs dekho

Common fixes:

- **better-sqlite3 error** → Build command mein `npm rebuild better-sqlite3` hona chahiye  
- **Port** → Start command `npm start` (Render `PORT` khud deta hai)  
- **Env** → `BASE_URL` = `https://YOUR-NAME.onrender.com` (apna exact URL)  

### Step D — Free plan limit

Free par **limited web services**. Purani unused services **Suspend/Delete** karo, phir nayi deploy karo.

## 1) Push code (already on GitHub)

Repo: **https://github.com/Amankushwaha2005/techwithaman-website**

## 2) Create Render service (one time)

1. Open **https://dashboard.render.com** → sign up / log in  
2. **New +** → **Blueprint**  
3. Connect **GitHub** → select repo `techwithaman-website`  
4. Render reads `render.yaml` → click **Apply**  
5. Wait for build (5–10 min first time). Status **Live** = deployed  

**Or manual Web Service:**

| Setting | Value |
|---------|--------|
| Runtime | Node |
| Build Command | `npm install && npm rebuild better-sqlite3` |
| Start Command | `npm start` |
| Health Check | `/health` |

## 3) Environment variables (Render → your service → Environment)

Add these (copy from local `.env` where needed):

| Key | Required | Notes |
|-----|----------|--------|
| `SESSION_SECRET` | Yes | Auto-generated if using Blueprint |
| `BASE_URL` | Yes | `https://YOUR-SERVICE.onrender.com` (no trailing slash) |
| `RAZORPAY_KEY_ID` | For payments | Live keys on production |
| `RAZORPAY_KEY_SECRET` | For payments | |
| `PAYMENT_ADVANCE_PERCENT` | Optional | Default `50` |
| `OPENAI_API_KEY` | For AI chat | Optional |
| `GOOGLE_CLIENT_ID` | For Google login | Optional |
| `GOOGLE_CLIENT_SECRET` | Optional | |
| `GOOGLE_REDIRECT_URI` | Optional | `https://YOUR-SERVICE.onrender.com/auth/google/callback` |
| `ADMIN_EMAILS` | Optional | Your admin email |

After saving env vars → **Manual Deploy** → **Deploy latest commit**.

## 4) Razorpay / Google (production)

- **Razorpay:** Dashboard → use **Live** keys; allow your Render domain  
- **Google OAuth:** Authorized redirect URI = `https://YOUR-SERVICE.onrender.com/auth/google/callback`

## 5) SQLite on Render (important)

Free tier disk is **ephemeral** — database may reset when the service redeploys. For serious production, later use Render **Persistent Disk** or PostgreSQL.

## 6) Custom domain (optional)

Render → service → **Settings** → **Custom Domains** → add `techwithaman.com` and update DNS.
