from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime
from typing import Any

import requests
from flask import Blueprint, current_app, render_template, request

from pybackend.db import query, query_one
from pybackend.site import brand, company, navItems


payments_bp = Blueprint("payments", __name__)


def _payment_enabled() -> bool:
    s = current_app.config["SETTINGS"]
    return bool(s.razorpay_key_id and s.razorpay_key_secret)


def _advance_percent() -> int:
    return int(current_app.config["SETTINGS"].payment_advance_percent or 50)


def _compute_advance_inr(total_inr: int) -> int:
    t = max(0, int(total_inr or 0))
    if t <= 0:
        return 0
    return max(1, round((t * _advance_percent()) / 100))


def _public_id() -> str:
    return secrets.token_hex(4) + "-" + secrets.token_hex(4)


def _rzp_auth() -> tuple[str, str]:
    s = current_app.config["SETTINGS"]
    return (s.razorpay_key_id or "", s.razorpay_key_secret or "")


def _rzp_create_order(amount_paise: int, receipt: str, notes: dict[str, Any] | None = None) -> str:
    auth = _rzp_auth()
    payload = {
        "amount": int(amount_paise),
        "currency": "INR",
        "receipt": receipt,
        "payment_capture": 1,
        "notes": notes or {},
    }
    r = requests.post("https://api.razorpay.com/v1/orders", auth=auth, json=payload, timeout=20)
    if not r.ok:
        raise RuntimeError("Could not create Razorpay order.")
    data = r.json()
    order_id = data.get("id")
    if not order_id:
        raise RuntimeError("Razorpay order id missing.")
    return str(order_id)


def _rzp_verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    s = current_app.config["SETTINGS"]
    secret = (s.razorpay_key_secret or "").encode("utf-8")
    msg = f"{order_id}|{payment_id}".encode("utf-8")
    expected = hmac.new(secret, msg, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature or "")


@payments_bp.get("/order")
def show_order():
    settings = current_app.config["SETTINGS"]
    q = request.args
    total = int(q.get("total") or 0)
    amount = int(q.get("amount") or 0)
    amount_inr = amount if amount > 0 else 0
    if total > 0 and amount_inr == 0:
        amount_inr = _compute_advance_inr(total)
    return render_template(
        "pages/order.html",
        page={"key": "order", "title": "Place Order & Pay | #TechWithAman"},
        navItems=navItems,
        brand=brand,
        year=__import__("datetime").datetime.utcnow().year,
        authUser=None,
        isAdmin=False,
        googleLoginEnabled=bool(settings.google_client_id and settings.google_client_secret),
        githubLoginEnabled=bool(settings.github_client_id and settings.github_client_secret),
        microsoftLoginEnabled=bool(settings.microsoft_client_id and settings.microsoft_client_secret),
        recaptchaSiteKey=settings.recaptcha_site_key,
        paymentEnabled=_payment_enabled(),
        paymentAdvancePercent=settings.payment_advance_percent,
        razorpayKeyId=settings.razorpay_key_id,
        paymentLiveOnLocalhost=False,
        orderPrefill={
            "service": q.get("service") or "",
            "plan": q.get("plan") or "",
            "total_inr": total,
            "amount_inr": amount_inr,
        },
    )


@payments_bp.get("/order/success")
def show_order_success():
    public_id = (request.args.get("id") or "").strip()
    order = (
        query_one("SELECT * FROM orders WHERE public_id = %s", (public_id,)) if public_id else None
    )
    status = (order.get("status") if order else "") or ""
    advance_ok = bool(order and status in ("paid", "advance_paid", "completed"))
    balance_due = 0
    if order:
        paid = int(order.get("advance_paid_inr") or order.get("amount_inr") or 0)
        balance_due = max(0, int(order.get("total_inr") or 0) - paid)

    receipt = None
    if order and status in ("advance_paid", "completed"):
        receipt = {
            "paymentDate": (order.get("paid_at") or order.get("created_at") or "")[:19],
            "gateway": "Razorpay",
            "paymentId": order.get("razorpay_payment_id") or "—",
        }

    return render_template(
        "pages/order-success.html",
        page={"key": "order-success", "title": "Order Confirmed | #TechWithAman"},
        navItems=navItems,
        brand=brand,
        year=datetime.utcnow().year,
        authUser=None,
        isAdmin=False,
        googleLoginEnabled=bool(settings.google_client_id and settings.google_client_secret),
        githubLoginEnabled=bool(settings.github_client_id and settings.github_client_secret),
        microsoftLoginEnabled=bool(settings.microsoft_client_id and settings.microsoft_client_secret),
        recaptchaSiteKey=settings.recaptcha_site_key,
        paymentEnabled=_payment_enabled(),
        paymentAdvancePercent=settings.payment_advance_percent,
        razorpayKeyId=settings.razorpay_key_id,
        paymentLiveOnLocalhost=False,
        order=order,
        receipt=receipt,
        balanceDue=balance_due,
        advanceOk=advance_ok,
    )


@payments_bp.get("/order/receipt")
def show_order_receipt():
    public_id = (request.args.get("id") or "").strip()
    phase = "balance" if request.args.get("phase") == "balance" else "advance"
    order = query_one("SELECT * FROM orders WHERE public_id = %s", (public_id,)) if public_id else None
    if not order:
        return "Receipt not found. Complete payment first or check your order ID.", 404

    status = (order.get("status") or "").strip()
    if phase == "balance" and status != "completed":
        return "Balance receipt not available yet.", 404
    if phase != "balance" and status == "pending":
        return "Receipt not found. Complete payment first or check your order ID.", 404

    amount = int(order.get("advance_paid_inr") or order.get("amount_inr") or 0) if phase == "advance" else int(order.get("balance_paid_inr") or 0)
    receipt = {
        "phase": phase,
        "receiptTitle": "Balance Payment Receipt" if phase == "balance" else "Advance Payment Receipt",
        "payeeName": order.get("name") or "—",
        "status": "PAID",
        "paymentDate": (order.get("paid_at") or order.get("balance_paid_at") or order.get("created_at") or "")[:19],
        "transactionNo": order.get("razorpay_payment_id") or order.get("razorpay_balance_payment_id") or "—",
        "gateway": "Razorpay",
        "paymentId": order.get("razorpay_payment_id") if phase == "advance" else order.get("razorpay_balance_payment_id"),
        "amountFormatted": f"₹{amount}",
        "orderId": order.get("public_id"),
        "service": order.get("service") or "—",
        "plan": order.get("plan") or "—",
        "totalFormatted": f"₹{int(order.get('total_inr') or 0)}",
        "email": order.get("email") or "—",
    }

    return render_template(
        "pages/order-receipt.html",
        page={"title": f"Receipt {order.get('public_id')} | {brand}"},
        receipt=receipt,
        company=company,
        order=order,
        brand=brand,
        year=datetime.utcnow().year,
    )


@payments_bp.post("/api/payments/create-order")
def api_create_order():
    try:
        payload = request.get_json(silent=True) or {}
        name = str(payload.get("name") or "").strip()
        email = str(payload.get("email") or "").strip().lower()
        phone = str(payload.get("phone") or "").strip() or None
        service = str(payload.get("service") or "").strip()
        plan = str(payload.get("plan") or "").strip()
        notes = str(payload.get("notes") or "").strip() or None
        total_inr = int(float(payload.get("total_inr") or 0))

        if not name or not email:
            return {"ok": False, "error": "Name and email are required."}, 400
        if not service or not plan:
            return {"ok": False, "error": "Service and plan are required."}, 400
        if total_inr < 1:
            return {"ok": False, "error": "Total amount is required."}, 400

        advance_percent = _advance_percent()
        amount_inr = _compute_advance_inr(total_inr)
        public_id = _public_id()

        order = query_one(
            """
            INSERT INTO orders (public_id, name, email, phone, service, plan, notes, total_inr, amount_inr, advance_percent, status)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'pending')
            RETURNING *
            """,
            (public_id, name, email, phone, service, plan, notes, total_inr, amount_inr, advance_percent),
        )

        if not _payment_enabled():
            return {
                "ok": False,
                "error": "Online payment is not configured yet.",
                "publicId": public_id,
                "amountInr": amount_inr,
            }, 503

        razorpay_order_id = _rzp_create_order(amount_inr * 100, receipt=public_id, notes={"public_id": public_id})
        query(
            "UPDATE orders SET razorpay_order_id=%s WHERE id=%s",
            (razorpay_order_id, order["id"]),
        )

        return {
            "ok": True,
            "publicId": public_id,
            "razorpayOrderId": razorpay_order_id,
            "amountPaise": amount_inr * 100,
            "amountInr": amount_inr,
            "keyId": current_app.config["SETTINGS"].razorpay_key_id,
            "customer": {"name": name, "email": email, "contact": phone or ""},
            "description": f"{service} — {plan} (advance)",
        }
    except Exception as e:
        return {"ok": False, "error": str(e) or "Could not create order."}, 500


@payments_bp.post("/api/payments/verify")
def api_verify_payment():
    body = request.get_json(silent=True) or {}
    order_id = str(body.get("razorpay_order_id") or "")
    payment_id = str(body.get("razorpay_payment_id") or "")
    signature = str(body.get("razorpay_signature") or "")
    if not order_id or not payment_id or not signature:
        return {"ok": False, "error": "Missing verification fields."}, 400
    if not _rzp_verify_signature(order_id, payment_id, signature):
        return {"ok": False, "error": "Invalid signature."}, 400

    order = query_one("SELECT * FROM orders WHERE razorpay_order_id=%s", (order_id,))
    if not order:
        return {"ok": False, "error": "Order not found."}, 404

    query(
        """
        UPDATE orders
        SET status='advance_paid',
            razorpay_payment_id=%s,
            paid_at=NOW(),
            advance_paid_inr=amount_inr
        WHERE id=%s
        """,
        (payment_id, order["id"]),
    )
    return {"ok": True, "redirectUrl": f"/order/success?id={order['public_id']}"}


@payments_bp.get("/api/payments/status")
@payments_bp.post("/api/payments/status")
def api_payment_status():
    public_id = (request.args.get("publicId") or (request.get_json(silent=True) or {}).get("publicId") or "").strip()
    if not public_id:
        return {"ok": False, "error": "publicId is required."}, 400
    order = query_one("SELECT status FROM orders WHERE public_id=%s", (public_id,))
    if not order:
        return {"ok": False, "error": "Order not found."}, 404
    st = order.get("status") or ""
    if st in ("advance_paid", "completed", "paid"):
        return {"ok": True, "status": "paid", "redirectUrl": f"/order/success?id={public_id}"}
    return {"ok": True, "status": st}


@payments_bp.post("/api/payments/resume-advance")
def api_resume_advance():
    body = request.get_json(silent=True) or {}
    public_id = str(body.get("publicId") or "").strip()
    if not public_id:
        return {"ok": False, "error": "Order ID is required."}, 400
    order = query_one("SELECT * FROM orders WHERE public_id=%s", (public_id,))
    if not order:
        return {"ok": False, "error": "Order not found."}, 404
    if not _payment_enabled():
        return {"ok": False, "error": "Online payment is not available."}, 503
    if (order.get("status") or "") in ("advance_paid", "completed"):
        return {"ok": True, "redirectUrl": f"/order/success?id={public_id}"}

    razorpay_order_id = order.get("razorpay_order_id")
    if not razorpay_order_id:
        razorpay_order_id = _rzp_create_order(int(order["amount_inr"]) * 100, receipt=public_id, notes={"public_id": public_id})
        query("UPDATE orders SET razorpay_order_id=%s WHERE id=%s", (razorpay_order_id, order["id"]))

    return {
        "ok": True,
        "publicId": public_id,
        "razorpayOrderId": razorpay_order_id,
        "amountPaise": int(order["amount_inr"]) * 100,
        "amountInr": int(order["amount_inr"]),
        "keyId": current_app.config["SETTINGS"].razorpay_key_id,
        "description": f"{order.get('service')} — {order.get('plan')} (advance)",
    }


@payments_bp.get("/order/pay-advance")
def show_pay_advance():
    settings = current_app.config["SETTINGS"]
    public_id = (request.args.get("id") or "").strip()
    order = query_one("SELECT * FROM orders WHERE public_id=%s", (public_id,)) if public_id else None
    st = (order.get("status") if order else "") or ""
    can_pay = st == "pending"
    already_paid = st in ("advance_paid", "completed", "paid")
    advance_due = int(order.get("amount_inr") or 0) if order else 0
    return render_template(
        "pages/order-pay-advance.html",
        page={"key": "order-pay-advance", "title": "Pay Advance | #TechWithAman"},
        navItems=navItems,
        brand=brand,
        year=datetime.utcnow().year,
        authUser=None,
        isAdmin=False,
        googleLoginEnabled=bool(settings.google_client_id and settings.google_client_secret),
        githubLoginEnabled=bool(settings.github_client_id and settings.github_client_secret),
        microsoftLoginEnabled=bool(settings.microsoft_client_id and settings.microsoft_client_secret),
        recaptchaSiteKey=settings.recaptcha_site_key,
        paymentEnabled=_payment_enabled(),
        paymentAdvancePercent=settings.payment_advance_percent,
        razorpayKeyId=settings.razorpay_key_id,
        paymentLiveOnLocalhost=False,
        order=order,
        canPay=can_pay,
        alreadyPaid=already_paid,
        advanceDue=advance_due,
    )


def _balance_due(order: dict) -> int:
    total = int(order.get("total_inr") or 0)
    adv = int(order.get("advance_paid_inr") or order.get("amount_inr") or 0)
    bal_paid = int(order.get("balance_paid_inr") or 0)
    return max(0, total - adv - bal_paid)


@payments_bp.get("/order/pay-balance")
def show_pay_balance():
    settings = current_app.config["SETTINGS"]
    public_id = (request.args.get("id") or "").strip()
    order = query_one("SELECT * FROM orders WHERE public_id=%s", (public_id,)) if public_id else None
    st = (order.get("status") if order else "") or ""
    already_complete = st == "completed"
    balance_due = _balance_due(order) if order else 0
    can_pay = bool(order and st in ("advance_paid", "completed") and order.get("delivered_at") is not None and balance_due > 0 and not already_complete)
    advance_paid = int(order.get("advance_paid_inr") or order.get("amount_inr") or 0) if order else 0
    order_status_label = "Advance paid" if st in ("advance_paid", "completed") else (st or "Pending")
    return render_template(
        "pages/order-pay-balance.html",
        page={"key": "order-pay-balance", "title": "Pay Balance | #TechWithAman"},
        navItems=navItems,
        brand=brand,
        year=datetime.utcnow().year,
        authUser=None,
        isAdmin=False,
        googleLoginEnabled=bool(settings.google_client_id and settings.google_client_secret),
        githubLoginEnabled=bool(settings.github_client_id and settings.github_client_secret),
        microsoftLoginEnabled=bool(settings.microsoft_client_id and settings.microsoft_client_secret),
        recaptchaSiteKey=settings.recaptcha_site_key,
        paymentEnabled=_payment_enabled(),
        paymentAdvancePercent=settings.payment_advance_percent,
        razorpayKeyId=settings.razorpay_key_id,
        paymentLiveOnLocalhost=False,
        order=order,
        alreadyComplete=already_complete,
        canPay=can_pay,
        balanceDue=balance_due,
        advancePaid=advance_paid,
        orderStatusLabel=order_status_label,
    )


@payments_bp.post("/api/payments/create-balance-order")
def api_create_balance_order():
    body = request.get_json(silent=True) or {}
    public_id = str(body.get("publicId") or "").strip()
    if not public_id:
        return {"ok": False, "error": "Order ID is required."}, 400
    order = query_one("SELECT * FROM orders WHERE public_id=%s", (public_id,))
    if not order:
        return {"ok": False, "error": "Order not found."}, 404
    if not _payment_enabled():
        return {"ok": False, "error": "Online payment is not available."}, 503

    due = _balance_due(order)
    if due <= 0:
        return {"ok": False, "error": "No remaining balance due."}, 400

    razorpay_order_id = order.get("razorpay_balance_order_id")
    if not razorpay_order_id:
        razorpay_order_id = _rzp_create_order(due * 100, receipt=public_id + "-bal", notes={"public_id": public_id, "phase": "balance"})
        query("UPDATE orders SET razorpay_balance_order_id=%s WHERE id=%s", (razorpay_order_id, order["id"]))

    return {
        "ok": True,
        "publicId": public_id,
        "razorpayOrderId": razorpay_order_id,
        "amountPaise": due * 100,
        "amountInr": due,
        "keyId": current_app.config["SETTINGS"].razorpay_key_id,
        "description": f"{order.get('service')} — {order.get('plan')} (balance)",
    }


@payments_bp.post("/api/payments/verify-balance")
def api_verify_balance():
    body = request.get_json(silent=True) or {}
    order_id = str(body.get("razorpay_order_id") or "")
    payment_id = str(body.get("razorpay_payment_id") or "")
    signature = str(body.get("razorpay_signature") or "")
    if not order_id or not payment_id or not signature:
        return {"ok": False, "error": "Missing verification fields."}, 400
    if not _rzp_verify_signature(order_id, payment_id, signature):
        return {"ok": False, "error": "Invalid signature."}, 400

    order = query_one("SELECT * FROM orders WHERE razorpay_balance_order_id=%s", (order_id,))
    if not order:
        return {"ok": False, "error": "Order not found."}, 404

    due = _balance_due(order)
    query(
        """
        UPDATE orders
        SET status='completed',
            razorpay_balance_payment_id=%s,
            balance_paid_inr=%s,
            balance_paid_at=NOW(),
            completed_at=NOW()
        WHERE id=%s
        """,
        (payment_id, due, order["id"]),
    )
    return {"ok": True, "redirectUrl": f"/order/balance-success?id={order['public_id']}"}


@payments_bp.get("/api/payments/balance-status")
@payments_bp.post("/api/payments/balance-status")
def api_balance_status():
    public_id = (request.args.get("publicId") or (request.get_json(silent=True) or {}).get("publicId") or "").strip()
    if not public_id:
        return {"ok": False, "error": "publicId is required."}, 400
    order = query_one("SELECT status FROM orders WHERE public_id=%s", (public_id,))
    if not order:
        return {"ok": False, "error": "Order not found."}, 404
    st = order.get("status") or ""
    if st == "completed":
        return {"ok": True, "status": "paid", "redirectUrl": f"/order/balance-success?id={public_id}"}
    return {"ok": True, "status": st}


@payments_bp.get("/order/balance-success")
def show_balance_success():
    settings = current_app.config["SETTINGS"]
    public_id = (request.args.get("id") or "").strip()
    order = query_one("SELECT * FROM orders WHERE public_id=%s", (public_id,)) if public_id else None
    receipt = None
    if order and order.get("status") == "completed":
        receipt = {
            "paymentDate": (order.get("balance_paid_at") or "")[:19],
            "gateway": "Razorpay",
            "paymentId": order.get("razorpay_balance_payment_id") or "—",
        }
    return render_template(
        "pages/order-balance-success.html",
        page={"key": "order-balance-success", "title": "Payment Complete | #TechWithAman"},
        navItems=navItems,
        brand=brand,
        year=datetime.utcnow().year,
        authUser=None,
        isAdmin=False,
        googleLoginEnabled=bool(settings.google_client_id and settings.google_client_secret),
        githubLoginEnabled=bool(settings.github_client_id and settings.github_client_secret),
        microsoftLoginEnabled=bool(settings.microsoft_client_id and settings.microsoft_client_secret),
        recaptchaSiteKey=settings.recaptcha_site_key,
        paymentEnabled=_payment_enabled(),
        paymentAdvancePercent=settings.payment_advance_percent,
        razorpayKeyId=settings.razorpay_key_id,
        paymentLiveOnLocalhost=False,
        order=order,
        receipt=receipt,
    )


