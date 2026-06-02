from __future__ import annotations

from flask import Blueprint, redirect, request

from pybackend.db import query
from pybackend.recaptcha import validate_form_recaptcha


forms_bp = Blueprint("forms", __name__)


@forms_bp.post("/contact")
def contact_submit():
    captcha = validate_form_recaptcha()
    if not captcha.ok:
        return redirect("/contact?error=" + __import__("urllib.parse").parse.quote(captcha.error))

    name = (request.form.get("name") or "").strip()
    email = (request.form.get("email") or "").strip().lower()
    phone = (request.form.get("phone") or "").strip() or None
    message = (request.form.get("message") or "").strip()

    if not name or not email or not message:
        return redirect("/contact?error=" + __import__("urllib.parse").parse.quote("Please fill name, email, and message."))

    query(
        "INSERT INTO contact_submissions (name, email, phone, message) VALUES (%s, %s, %s, %s)",
        (name, email, phone, message),
    )

    return redirect("/contact?sent=1")


@forms_bp.post("/work")
def work_submit():
    captcha = validate_form_recaptcha()
    if not captcha.ok:
        return redirect("/work?error=" + __import__("urllib.parse").parse.quote(captcha.error))

    full_name = (request.form.get("fullName") or "").strip()
    email = (request.form.get("email") or "").strip().lower()
    phone = (request.form.get("phone") or "").strip() or None
    resume = (request.form.get("resume") or "").strip() or None
    category = (request.form.get("category") or "").strip()
    skill = (request.form.get("skill") or "").strip()

    if not full_name or not email:
        return redirect("/work?error=" + __import__("urllib.parse").parse.quote("Name and email are required."))
    if not category or not skill:
        return redirect("/work?error=" + __import__("urllib.parse").parse.quote("Please select category and role."))

    skill_label = f"{category} — {skill}"

    query(
        "INSERT INTO work_submissions (full_name, email, phone, resume, skill) VALUES (%s, %s, %s, %s, %s)",
        (full_name, email, phone, resume, skill_label),
    )

    return redirect("/work?sent=1")


@forms_bp.post("/chatbot/message")
def chatbot_message():
    body = request.get_json(silent=True) or {}
    msg = str(body.get("message") or "").strip()
    if not msg:
        return {"ok": False, "error": "Message is required."}, 400

    page_url = str(body.get("page") or request.headers.get("referer") or "").strip()[:500] or None
    query("INSERT INTO chat_messages (message, page_url) VALUES (%s, %s)", (msg, page_url))
    return {"ok": True}

