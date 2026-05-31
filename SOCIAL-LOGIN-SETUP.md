# Social Login — Google, GitHub, Microsoft

Login & signup support three OAuth providers. Each needs **Client ID + Secret** on Render.

**Live site:** `https://techwithaman-website-2026.onrender.com`

Check status: `/api/site-info` → `googleLoginEnabled`, `githubLoginEnabled`, `microsoftLoginEnabled`

---

## 1) Google (Gmail)

1. https://console.cloud.google.com/ → **Credentials** → **OAuth client ID** → Web application  
2. **Redirect URI:**
   ```
   https://techwithaman-website-2026.onrender.com/auth/google/callback
   ```
3. Render env:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` = URL above

---

## 2) GitHub

1. https://github.com/settings/developers → **New OAuth App**  
2. **Homepage URL:** `https://techwithaman-website-2026.onrender.com`  
3. **Authorization callback URL:**
   ```
   https://techwithaman-website-2026.onrender.com/auth/github/callback
   ```
4. Render env:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `GITHUB_REDIRECT_URI` = URL above  

**Note:** User must have a **verified email** on GitHub (Settings → Emails).

---

## 3) Microsoft

1. https://portal.azure.com/ → **Microsoft Entra ID** → **App registrations** → **New registration**  
2. **Redirect URI** (Web):
   ```
   https://techwithaman-website-2026.onrender.com/auth/microsoft/callback
   ```
3. **Certificates & secrets** → New client secret  
4. **API permissions** → Add `Microsoft Graph` → `User.Read`, `email`, `openid`, `profile`  
5. Render env:
   - `MICROSOFT_CLIENT_ID` (Application client ID)
   - `MICROSOFT_CLIENT_SECRET`
   - `MICROSOFT_REDIRECT_URI` = URL above  

Works with personal Microsoft (@outlook, @hotmail) and work/school accounts.

---

## Render — all variables

| Key | Provider |
|-----|----------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | Microsoft |
| `BASE_URL` | `https://techwithaman-website-2026.onrender.com` |

Save → **Manual Deploy**.

---

## Local `.env` example

```env
BASE_URL=http://127.0.0.1:3000

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://127.0.0.1:3000/auth/google/callback

GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_REDIRECT_URI=http://127.0.0.1:3000/auth/github/callback

MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_REDIRECT_URI=http://127.0.0.1:3000/auth/microsoft/callback
```

---

## Routes

| Button | Start | Callback |
|--------|-------|----------|
| Google | `/auth/google` | `/auth/google/callback` |
| GitHub | `/auth/github` | `/auth/github/callback` |
| Microsoft | `/auth/microsoft` | `/auth/microsoft/callback` |
