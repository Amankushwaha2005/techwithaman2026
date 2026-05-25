# Online payment setup (Razorpay)

Clients can **book a package and pay advance** from:

1. **Pricing** — each package has **Book & Pay Advance** (best place; they already see price).
2. **`/order`** — order form + Razorpay checkout.
3. **Contact** — banner links to pricing and order.

## 1. Razorpay account

1. Sign up at [https://razorpay.com](https://razorpay.com)
2. Dashboard → **Settings → API Keys** → generate **Test** keys for local dev
3. For live site: complete KYC and use **Live** keys

## 2. Add keys to `.env`

Copy from `.env.example`:

```env
RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=your_secret
PAYMENT_ADVANCE_PERCENT=50
```

- `PAYMENT_ADVANCE_PERCENT` — how much of package price is charged now (default **50%**).
- Restart server after changing `.env`: `npm start`

## 3. Test flow

1. Open `http://127.0.0.1:3000/pricing`
2. Open any category → click **Book & Pay Advance** on a package
3. Fill name, email, phone → **Pay advance online**
4. Razorpay test mode: use [test cards](https://razorpay.com/docs/payments/payments/test-card-details/)

## 4. Where money / orders are stored

- Paid orders: SQLite table `orders` in `data/app.sqlite`
- Fields: service, plan, amount, Razorpay IDs, status `paid`

## 5. Without Razorpay keys

Site still works; **Book & Pay** opens order form but checkout shows a message and WhatsApp link for manual payment.
