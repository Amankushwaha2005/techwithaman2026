from __future__ import annotations

import secrets
from urllib.parse import urlencode

import bcrypt
import requests
from flask import Blueprint, current_app, redirect, request, session

from pybackend.db import query, query_one
from pybackend.recaptcha import validate_form_recaptcha
from pybackend.user_roles import role_for_email, sync_admin_role


auth_bp = Blueprint("auth", __name__)


def _auth_error(message: str, return_to: str = "login"):
    base = "/signup" if return_to == "signup" else "/login"
    return redirect(f"{base}?error={urlencode({'': message})[1:]}")


def _finish_oauth_redirect(return_to: str):
    next_url = session.pop("after_login_redirect", None)
    toast = "signup" if return_to == "signup" else "login"
    if isinstance(next_url, str) and next_url.startswith("/") and not next_url.startswith("//"):
        sep = "&" if "?" in next_url else "?"
        return redirect(f"{next_url}{sep}toast={toast}")
    return redirect(f"/?toast={toast}")


@auth_bp.post("/auth/login")
def login():
    captcha = validate_form_recaptcha()
    if not captcha.ok:
        return _auth_error(captcha.error, "login")

    email = (request.form.get("email") or "").strip().lower()
    password = request.form.get("password") or ""
    if not email or not password:
        return _auth_error("Email and password are required.", "login")

    user = query_one(
        "SELECT id, provider, name, email, password_hash, picture, role FROM users WHERE email = %s",
        (email,),
    )
    if not user or not user.get("password_hash"):
        return _auth_error("Invalid email or password.", "login")

    ok = bcrypt.checkpw(password.encode("utf-8"), str(user["password_hash"]).encode("utf-8"))
    if not ok:
        return _auth_error("Invalid email or password.", "login")

    settings = current_app.config["SETTINGS"]
    user = sync_admin_role(user, settings.admin_emails)
    session["user_id"] = user["id"]
    session["user"] = user

    next_url = request.form.get("next")
    if isinstance(next_url, str) and next_url.startswith("/") and not next_url.startswith("//"):
        sep = "&" if "?" in next_url else "?"
        return redirect(f"{next_url}{sep}toast=login")
    return redirect("/?toast=login")


@auth_bp.post("/auth/signup")
def signup():
    captcha = validate_form_recaptcha()
    if not captcha.ok:
        return _auth_error(captcha.error, "signup")

    name = (request.form.get("name") or "").strip()
    email = (request.form.get("email") or "").strip().lower()
    password = request.form.get("password") or ""
    if not name or not email or not password:
        return _auth_error("Name, email and password are required.", "signup")

    exists = query_one("SELECT id FROM users WHERE email = %s", (email,))
    if exists:
        return _auth_error("Email already exists. Please login.", "signup")

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")
    settings = current_app.config["SETTINGS"]
    role = role_for_email(email, "user", settings.admin_emails)

    inserted = query_one(
        """
        INSERT INTO users (provider, name, email, password_hash, role)
        VALUES ('local', %s, %s, %s, %s)
        RETURNING id
        """,
        (name, email, password_hash, role),
    )
    session["user_id"] = inserted["id"]
    session["user"] = {"id": inserted["id"], "provider": "local", "name": name, "email": email, "role": role}

    next_url = request.form.get("next")
    if isinstance(next_url, str) and next_url.startswith("/") and not next_url.startswith("//"):
        sep = "&" if "?" in next_url else "?"
        return redirect(f"{next_url}{sep}toast=signup")
    return redirect("/?toast=signup")


@auth_bp.get("/auth/logout")
@auth_bp.post("/auth/logout")
def logout():
    session.clear()
    return redirect("/")


def _oauth_config(provider: str) -> dict | None:
    settings = current_app.config["SETTINGS"]
    base_url = settings.base_url or f"{request.scheme}://{request.host}"
    base_url = base_url.rstrip("/")

    if provider == "google":
        if not (settings.google_client_id and settings.google_client_secret):
            return None
        return {
            "label": "Google",
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": settings.google_redirect_uri or f"{base_url}/auth/google/callback",
            "scope": "openid email profile",
            "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
            "token_url": "https://oauth2.googleapis.com/token",
        }
    if provider == "github":
        if not (settings.github_client_id and settings.github_client_secret):
            return None
        return {
            "label": "GitHub",
            "client_id": settings.github_client_id,
            "client_secret": settings.github_client_secret,
            "redirect_uri": settings.github_redirect_uri or f"{base_url}/auth/github/callback",
            "scope": "user:email",
            "auth_url": "https://github.com/login/oauth/authorize",
            "token_url": "https://github.com/login/oauth/access_token",
            "token_accept_json": True,
        }
    if provider == "microsoft":
        if not (settings.microsoft_client_id and settings.microsoft_client_secret):
            return None
        return {
            "label": "Microsoft",
            "client_id": settings.microsoft_client_id,
            "client_secret": settings.microsoft_client_secret,
            "redirect_uri": settings.microsoft_redirect_uri or f"{base_url}/auth/microsoft/callback",
            "scope": "openid profile email User.Read",
            "auth_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        }
    return None


def _oauth_start(provider: str):
    return_to = "signup" if request.args.get("from") == "signup" else "login"
    session["oauth_return_to"] = return_to
    session["oauth_provider"] = provider

    cfg = _oauth_config(provider)
    if not cfg:
        hint = (
            "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"
            if provider == "google"
            else "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET"
            if provider == "github"
            else "MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET"
        )
        return _auth_error(f"{provider.title()} login is not configured. Add {hint} on Render.", return_to)

    state = secrets.token_hex(24)
    session["oauth_state"] = state

    params = {
        "client_id": cfg["client_id"],
        "redirect_uri": cfg["redirect_uri"],
        "response_type": "code",
        "scope": cfg["scope"],
        "state": state,
    }
    if provider == "google":
        params.update({"access_type": "online", "prompt": "select_account"})
    if provider == "microsoft":
        params.update({"response_mode": "query"})

    return redirect(cfg["auth_url"] + "?" + urlencode(params))


def _oauth_exchange(provider: str, code: str, cfg: dict) -> str:
    data = {
        "client_id": cfg["client_id"],
        "client_secret": cfg["client_secret"],
        "code": code,
        "redirect_uri": cfg["redirect_uri"],
        "grant_type": "authorization_code",
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    if cfg.get("token_accept_json"):
        headers["Accept"] = "application/json"

    resp = requests.post(cfg["token_url"], data=data, headers=headers, timeout=15)
    text = resp.text
    if not resp.ok:
        raise RuntimeError(f"{cfg['label']} token exchange failed.")
    try:
        payload = resp.json()
    except Exception:
        payload = dict([p.split("=", 1) for p in text.split("&") if "=" in p])
    token = payload.get("access_token")
    if not token:
        raise RuntimeError(f"{cfg['label']} access token missing.")
    return token


def _oauth_fetch_profile(provider: str, access_token: str) -> dict:
    if provider == "google":
        r = requests.get(
            "https://openidconnect.googleapis.com/v1/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        )
        if not r.ok:
            raise RuntimeError("Could not fetch Google profile.")
        p = r.json()
        email = str(p.get("email") or "").strip().lower()
        if not email:
            raise RuntimeError("Google account email not available.")
        return {
            "providerId": str(p.get("sub") or ""),
            "name": p.get("name") or p.get("given_name") or "User",
            "email": email,
            "picture": p.get("picture") or "",
        }
    if provider == "github":
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "TechWithAman-Website",
        }
        user_resp = requests.get("https://api.github.com/user", headers=headers, timeout=15)
        if not user_resp.ok:
            raise RuntimeError("Could not fetch GitHub profile.")
        user = user_resp.json()
        email = str(user.get("email") or "").strip().lower()
        if not email:
            emails_resp = requests.get("https://api.github.com/user/emails", headers=headers, timeout=15)
            if emails_resp.ok:
                emails = emails_resp.json()
                primary = next((e for e in emails if e.get("primary") and e.get("verified")), None) or next(
                    (e for e in emails if e.get("verified")), None
                )
                email = str((primary or {}).get("email") or (emails[0].get("email") if emails else "")).strip().lower()
        if not email:
            raise RuntimeError(
                "GitHub email not available. In GitHub → Settings → Emails, add a verified email or make it public."
            )
        return {
            "providerId": str(user.get("id") or ""),
            "name": user.get("name") or user.get("login") or "GitHub User",
            "email": email,
            "picture": user.get("avatar_url") or "",
        }
    if provider == "microsoft":
        r = requests.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        )
        if not r.ok:
            raise RuntimeError("Could not fetch Microsoft profile.")
        p = r.json()
        email = str(p.get("mail") or p.get("userPrincipalName") or "").strip().lower()
        if not email:
            raise RuntimeError("Microsoft account email not available.")
        return {
            "providerId": str(p.get("id") or ""),
            "name": p.get("displayName") or p.get("givenName") or "Microsoft User",
            "email": email,
            "picture": "",
        }
    raise RuntimeError("Unknown provider.")


def _oauth_upsert_user(provider: str, profile: dict) -> int:
    settings = current_app.config["SETTINGS"]
    provider_id = profile.get("providerId") or None
    name = profile.get("name") or "User"
    email = profile.get("email") or ""
    picture = profile.get("picture") or None

    user = query_one("SELECT id, provider, provider_id, email, role FROM users WHERE email = %s", (email,))
    role = role_for_email(email, (user.get("role") if user else "user") or "user", settings.admin_emails)

    if not user:
        inserted = query_one(
            """
            INSERT INTO users (provider, provider_id, name, email, picture, role)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (provider, provider_id, name, email, picture, role),
        )
        return int(inserted["id"])

    query(
        """
        UPDATE users
        SET provider = %s,
            provider_id = COALESCE(%s, provider_id),
            name = %s,
            picture = COALESCE(NULLIF(%s, ''), picture),
            role = %s,
            updated_at = NOW()
        WHERE id = %s
        """,
        (provider, provider_id, name, picture or "", role, user["id"]),
    )
    return int(user["id"])


def _oauth_callback(provider: str):
    return_to = "signup" if session.get("oauth_return_to") == "signup" else "login"
    code = request.args.get("code", "")
    state = request.args.get("state", "")

    if not code or not state or state != session.get("oauth_state"):
        return _auth_error(f"{provider} login failed. Please try again.", return_to)
    if session.get("oauth_provider") and session.get("oauth_provider") != provider:
        return _auth_error("Login session mismatch. Please try again.", return_to)

    session.pop("oauth_state", None)
    session.pop("oauth_return_to", None)
    session.pop("oauth_provider", None)

    cfg = _oauth_config(provider)
    if not cfg:
        return _auth_error(f"{provider.title()} login is not configured yet.", return_to)

    try:
        token = _oauth_exchange(provider, code, cfg)
        profile = _oauth_fetch_profile(provider, token)
        user_id = _oauth_upsert_user(provider, profile)
        session["user_id"] = user_id
        u = query_one("SELECT id, provider, name, email, picture, role FROM users WHERE id = %s", (user_id,))
        u = sync_admin_role(u, current_app.config["SETTINGS"].admin_emails)
        session["user"] = u
        return _finish_oauth_redirect(return_to)
    except Exception as e:
        return _auth_error(str(e) or f"{provider.title()} login failed.", return_to)


@auth_bp.get("/auth/google")
def google_auth():
    return _oauth_start("google")


@auth_bp.get("/auth/google/callback")
def google_callback():
    return _oauth_callback("google")


@auth_bp.get("/auth/github")
def github_auth():
    return _oauth_start("github")


@auth_bp.get("/auth/github/callback")
def github_callback():
    return _oauth_callback("github")


@auth_bp.get("/auth/microsoft")
def microsoft_auth():
    return _oauth_start("microsoft")


@auth_bp.get("/auth/microsoft/callback")
def microsoft_callback():
    return _oauth_callback("microsoft")

