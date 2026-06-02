from __future__ import annotations

from dataclasses import dataclass

import requests
from flask import current_app, request


@dataclass(frozen=True)
class CaptchaResult:
    ok: bool
    error: str = ""


def validate_form_recaptcha() -> CaptchaResult:
    settings = current_app.config["SETTINGS"]

    # If site has a key configured, we expect g-recaptcha-response.
    if settings.recaptcha_site_key and settings.recaptcha_secret_key:
        token = (request.form.get("g-recaptcha-response") or "").strip()
        if not token:
            return CaptchaResult(False, "Please complete the reCAPTCHA.")
        try:
            resp = requests.post(
                "https://www.google.com/recaptcha/api/siteverify",
                data={"secret": settings.recaptcha_secret_key, "response": token},
                timeout=10,
            )
            data = resp.json()
            if data.get("success") is True:
                return CaptchaResult(True, "")
            return CaptchaResult(False, "reCAPTCHA failed. Please try again.")
        except Exception:
            return CaptchaResult(False, "reCAPTCHA check failed. Please try again.")

    # Fallback checkbox mode
    if request.form.get("humanCheck") == "1":
        return CaptchaResult(True, "")
    return CaptchaResult(False, "Please confirm you are not a robot.")

