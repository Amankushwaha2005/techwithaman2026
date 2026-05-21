import sqlite3
from pathlib import Path

from flask import Blueprint, current_app, redirect, request, session
from werkzeug.security import check_password_hash, generate_password_hash


bp = Blueprint("auth", __name__)


def _db_path() -> Path:
    configured = current_app.config.get("AUTH_DB_PATH")
    if configured:
        return Path(configured)
    return Path(current_app.config["PROJECT_ROOT"]) / "data" / "auth.sqlite3"


def _ensure_users_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()


@bp.post("/auth/login")
def login():
    email = (request.form.get("email") or "").strip().lower()
    password = request.form.get("password") or ""
    if not email or not password:
        return redirect("/login?error=missing")

    db_path = _db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        _ensure_users_table(conn)
        row = conn.execute(
            "SELECT id, name, email, password_hash FROM users WHERE email = ?",
            (email,),
        ).fetchone()

    if not row or not check_password_hash(row[3], password):
        return redirect("/login?error=invalid")

    session["user"] = {"id": row[0], "name": row[1], "email": row[2]}
    return redirect("/")


@bp.post("/auth/signup")
def signup():
    name = (request.form.get("name") or "").strip()
    email = (request.form.get("email") or "").strip().lower()
    password = request.form.get("password") or ""
    if not name or not email or not password:
        return redirect("/signup?error=missing")
    if len(password) < 6:
        return redirect("/signup?error=weak")

    db_path = _db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    password_hash = generate_password_hash(password)

    try:
        with sqlite3.connect(db_path) as conn:
            _ensure_users_table(conn)
            conn.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                (name, email, password_hash),
            )
            conn.commit()
    except sqlite3.IntegrityError:
        return redirect("/signup?error=exists")

    return redirect("/login?msg=signup-success")

