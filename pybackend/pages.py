from __future__ import annotations

from flask import Blueprint, current_app, redirect, render_template, request, session

from pybackend.auth_context import auth_template_flags
from pybackend.site import brand, navItems


pages_bp = Blueprint("pages", __name__)


def _common_template_context(page: dict) -> dict:
    settings = current_app.config["SETTINGS"]

    next_raw = request.args.get("next", "")
    login_next = next_raw if next_raw.startswith("/") and not next_raw.startswith("//") else ""

    return {
        "page": page,
        "navItems": navItems,
        "brand": brand,
        "year": __import__("datetime").datetime.utcnow().year,
        **auth_template_flags(),
        "authError": request.args.get("error", ""),
        "loginNext": login_next,
        "googleLoginEnabled": bool(settings.google_client_id and settings.google_client_secret),
        "githubLoginEnabled": bool(settings.github_client_id and settings.github_client_secret),
        "microsoftLoginEnabled": bool(settings.microsoft_client_id and settings.microsoft_client_secret),
        "recaptchaSiteKey": settings.recaptcha_site_key,
        "paymentAdvancePercent": settings.payment_advance_percent,
    }


@pages_bp.get("/")
def home():
    return render_template("pages/index.html", **_common_template_context({"key": "home", "title": "#TechWithAman"}))


@pages_bp.get("/pricing")
def pricing():
    return render_template(
        "pages/pricing.html",
        **_common_template_context({"key": "pricing", "title": "Pricing | #TechWithAman"}),
    )


@pages_bp.get("/services")
def services():
    return render_template(
        "pages/services.html",
        **_common_template_context({"key": "services", "title": "Services | #TechWithAman"}),
    )


@pages_bp.get("/portfolio")
def portfolio():
    return render_template(
        "pages/portfolio.html",
        **_common_template_context({"key": "portfolio", "title": "Portfolio | #TechWithAman"}),
    )


@pages_bp.get("/about")
def about():
    return render_template(
        "pages/about.html",
        **_common_template_context({"key": "about", "title": "About | #TechWithAman"}),
    )


@pages_bp.get("/contact")
def contact_page():
    return render_template(
        "pages/contact.html",
        **_common_template_context({"key": "contact", "title": "Contact | #TechWithAman"}),
    )


@pages_bp.get("/work")
def work_page():
    return render_template(
        "pages/work.html",
        **_common_template_context({"key": "work", "title": "Work With Us | #TechWithAman"}),
    )


@pages_bp.get("/login")
def login_page():
    if session.get("user_id"):
        return redirect("/")
    # preserve ?next=... like Node
    next_raw = request.args.get("next", "")
    if next_raw.startswith("/") and not next_raw.startswith("//"):
        session["after_login_redirect"] = next_raw
    else:
        session.pop("after_login_redirect", None)
    return render_template(
        "pages/login.html",
        **_common_template_context({"key": "login", "title": "Login | #TechWithAman"}),
    )


@pages_bp.get("/signup")
def signup_page():
    if session.get("user_id"):
        return redirect("/")
    return render_template(
        "pages/signup.html",
        **_common_template_context({"key": "signup", "title": "Signup | #TechWithAman"}),
    )

