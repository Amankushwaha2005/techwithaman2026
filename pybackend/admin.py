from __future__ import annotations

from datetime import date, datetime, timedelta

from flask import Blueprint, current_app, redirect, render_template, request, session

from pybackend.authz import require_admin
from pybackend.db import query, query_one
from pybackend.site import brand


admin_bp = Blueprint("admin", __name__)


@admin_bp.get("/admin")
@require_admin
def dashboard():
    stats = {}

    stats["users"] = int(query_one("SELECT COUNT(*) AS c FROM users")["c"])
    stats["usersWeek"] = int(
        query_one(
            "SELECT COUNT(*) AS c FROM users WHERE created_at >= NOW() - INTERVAL '7 days'"
        )["c"]
    )

    stats["contacts"] = int(query_one("SELECT COUNT(*) AS c FROM contact_submissions")["c"])
    stats["contactsNew"] = int(
        query_one("SELECT COUNT(*) AS c FROM contact_submissions WHERE status = 'new'")["c"]
    )

    stats["work"] = int(query_one("SELECT COUNT(*) AS c FROM work_submissions")["c"])
    stats["workNew"] = int(query_one("SELECT COUNT(*) AS c FROM work_submissions WHERE status = 'new'")["c"])

    stats["chats"] = int(query_one("SELECT COUNT(*) AS c FROM chat_messages")["c"])
    stats["chatsNew"] = int(query_one("SELECT COUNT(*) AS c FROM chat_messages WHERE status = 'new'")["c"])

    stats["orders"] = int(query_one("SELECT COUNT(*) AS c FROM orders")["c"])
    stats["ordersAdvancePaid"] = int(
        query_one(
            "SELECT COUNT(*) AS c FROM orders WHERE status IN ('advance_paid','completed','paid')"
        )["c"]
    )
    stats["ordersCompleted"] = int(query_one("SELECT COUNT(*) AS c FROM orders WHERE status='completed'")["c"])

    revenue = query_one(
        "SELECT COALESCE(SUM(COALESCE(advance_paid_inr,0) + COALESCE(balance_paid_inr,0)),0) AS s FROM orders"
    )["s"]
    stats["revenuePaid"] = int(revenue or 0)

    stats["ordersBalanceDue"] = int(
        query_one(
            """
            SELECT COUNT(*) AS c
            FROM orders
            WHERE status IN ('advance_paid','completed')
              AND (COALESCE(total_inr,0) - COALESCE(advance_paid_inr, amount_inr, 0) - COALESCE(balance_paid_inr,0)) > 0
            """
        )["c"]
    )

    orders = query(
        """
        SELECT id, public_id, name, email, service, plan, status,
               total_inr, amount_inr, advance_paid_inr, balance_paid_inr,
               created_at
        FROM orders
        ORDER BY created_at DESC
        LIMIT 50
        """
    )
    users = query(
        """
        SELECT id, name, email, role
        FROM users
        ORDER BY created_at DESC
        LIMIT 50
        """
    )

    # Chart data: last 14 days (including today)
    start = date.today() - timedelta(days=13)
    labels = [(start + timedelta(days=i)).isoformat() for i in range(14)]

    def series(table: str, col: str) -> dict[str, int]:
        rows = query(
            f"""
            SELECT to_char(date_trunc('day', {col}), 'YYYY-MM-DD') AS d, COUNT(*) AS c
            FROM {table}
            WHERE {col} >= NOW() - INTERVAL '14 days'
            GROUP BY 1
            ORDER BY 1
            """
        )
        return {r["d"]: int(r["c"]) for r in rows}

    contact_s = series("contact_submissions", "created_at")
    work_s = series("work_submissions", "created_at")
    chat_s = series("chat_messages", "created_at")

    chart = {
        "labels": labels,
        "contact": [contact_s.get(d, 0) for d in labels],
        "work": [work_s.get(d, 0) for d in labels],
        "chat": [chat_s.get(d, 0) for d in labels],
    }

    return render_template(
        "admin/dashboard.html",
        title=f"Admin | {brand}",
        brand=brand,
        authUser=session.get("user"),
        stats=stats,
        orders=orders,
        users=users,
        chart=chart,
    )


@admin_bp.get("/admin/connect")
def connect():
    secret = current_app.config["SETTINGS"].admin_bootstrap_secret
    if not secret or str(request.args.get("secret") or "") != secret:
        return "Page not found", 404

    row = query_one("SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1")
    if not row:
        first = query_one("SELECT id FROM users ORDER BY id LIMIT 1")
        if not first:
            return redirect("/signup")
        query("UPDATE users SET role='admin', updated_at=NOW() WHERE id=%s", (first["id"],))
        row = first

    session["user_id"] = row["id"]
    u = query_one("SELECT id, provider, name, email, picture, role FROM users WHERE id=%s", (row["id"],))
    session["user"] = u
    return redirect("/admin")

