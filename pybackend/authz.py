from __future__ import annotations

from functools import wraps
from typing import Any, Callable, TypeVar

from flask import Response, redirect, render_template, session

from pybackend.site import brand

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
        user = session.get("user")
        if not user or user.get("role") != "admin":
            return render_template("admin/forbidden.html", brand=brand), 403
        return fn(*args, **kwargs)

    return wrapper  # type: ignore[misc]

