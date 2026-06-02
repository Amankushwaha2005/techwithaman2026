from __future__ import annotations

from pybackend.db import query_one


def _admin_email_set(admin_emails: str | None) -> set[str]:
    if not admin_emails:
        return set()
    return {e.strip().lower() for e in admin_emails.split(",") if e.strip()}


def role_for_email(email: str, current_role: str, admin_emails: str | None) -> str:
    if current_role == "admin":
        return "admin"
    em = (email or "").strip().lower()
    if em and em in _admin_email_set(admin_emails):
        return "admin"
    return current_role or "user"


def sync_admin_role(user: dict | None, admin_emails: str | None) -> dict | None:
    if not user or not user.get("id"):
        return user
    next_role = role_for_email(user.get("email", ""), user.get("role", "user"), admin_emails)
    if next_role == user.get("role"):
        return user
    updated = query_one(
        "UPDATE users SET role = %s, updated_at = NOW() WHERE id = %s RETURNING id, provider, name, email, picture, role",
        (next_role, user["id"]),
    )
    return updated or user

