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

## 2. Deploy latest code

After pushing to GitHub:

- **Manual Deploy** → **Deploy latest commit**
- Check **Logs** for `Server running`
- Open `https://YOUR-SERVICE.onrender.com/order` — should **not** be 404

## 3. Razorpay Dashboard

- **Live mode** ON  
- **Website & app settings** → add your Render URL:  
  `https://techwithaman-website.onrender.com`  
- (If you use a custom domain, add that too.)

## 4. Test

1. `https://YOUR-SERVICE.onrender.com/pricing`  
2. **Book & Pay Advance**  
3. You should see **Pay online (Razorpay)** + WhatsApp  
