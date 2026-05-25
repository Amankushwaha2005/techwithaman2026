# Razorpay on Render — quick fix

If the order page shows **only WhatsApp** and *"Online payment is not configured yet"*:

## 1. Add keys on Render (most important)

GitHub **does not** include `.env`. You must add keys manually:

1. https://dashboard.render.com → your **techwithaman-website** service  
2. **Environment** → **Add Environment Variable**

| Key | Value |
|-----|--------|
| `RAZORPAY_KEY_ID` | `rzp_live_xxxx` (from Razorpay Dashboard → Live keys) |
| `RAZORPAY_KEY_SECRET` | your live secret |
| `BASE_URL` | `https://YOUR-SERVICE.onrender.com` (exact URL, no trailing `/`) |
| `PAYMENT_ADVANCE_PERCENT` | `50` |

3. **Save Changes** → Render will **redeploy** automatically.

## 2. Deploy latest code (important)

Render is often still running **old code** even after GitHub push.

1. **Settings** → **Build & Deploy** → confirm:
   - Branch: `main`
   - Build: `npm install && npm rebuild better-sqlite3`
   - Start: `npm start`
2. **Manual Deploy** → **Clear build cache & deploy**
3. **Logs** → wait for **Build succeeded** + `Server running`
4. Test in browser:

   `https://YOUR-SERVICE.onrender.com/api/site-info`

   You must see JSON like:

   ```json
   { "version": "payments-v2", "paymentEnabled": true, "hasRazorpayKey": true }
   ```

   - If **404** → old deploy still live; repeat step 2  
   - If `paymentEnabled: false` → add Razorpay env vars (step 1)  
5. Open `/order` — must **not** be 404

## 3. Razorpay Dashboard

- **Live mode** ON  
- **Website & app settings** → add your Render URL:  
  `https://techwithaman-website.onrender.com`  
- (If you use a custom domain, add that too.)

## 4. Test

1. `https://YOUR-SERVICE.onrender.com/pricing`  
2. **Book & Pay Advance**  
3. You should see **Pay online (Razorpay)** + WhatsApp  
