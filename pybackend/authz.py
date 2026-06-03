from __future__ import annotations

from functools import wraps
from typing import Any, Callable, TypeVar

from flask import current_app, redirect, render_template, session

from pybackend.auth_context import refresh_session_user
from pybackend.site import brand
from pybackend.user_roles import is_admin_user

F = TypeVar("F", bound=Callable[..., Any])


def require_login(fn: F) -> F:
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get("user_id"):
            return redirect("/login?error=Please login first.")
        return fn(*args, **kwargs)

    return wrapper  # type: ignore[misc]


def require_admin(fn: F) -> F:
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get("user_id"):
            return redirect("/login?next=/admin")

        settings = current_app.config["SETTINGS"]
        user = refresh_session_user()
        if not is_admin_user(user, settings.admin_emails):
            login_email = (user or {}).get("email") or ""
            return (
                render_template(
                    "admin/forbidden.html",
                    brand=brand,
                    loginEmail=login_email,
                    adminEmailsConfigured=bool(settings.admin_emails),
                ),
                403,
            )
        return fn(*args, **kwargs)

    return wrapper  # type: ignore[misc]

