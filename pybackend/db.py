from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Iterable, Mapping, Optional

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool


@dataclass(frozen=True)
class DbConfig:
    conninfo: str
    max_size: int = 10
    sslmode: Optional[str] = None


def _build_conninfo() -> DbConfig:
    """
    Prefer DATABASE_URL. Fallback to PG* vars for local development parity.
    """
    database_url = (os.getenv("DATABASE_URL") or "").strip()
    max_size = int(os.getenv("DB_POOL_LIMIT") or "10")

    if database_url:
        # Respect sslmode in URL or enforce in Render-like environments via PGSSL.
        sslmode = None
        if (os.getenv("PGSSL") or "").strip().lower() in ("1", "true", "yes", "on"):
            sslmode = "require"
        return DbConfig(conninfo=database_url, max_size=max_size, sslmode=sslmode)

    host = (os.getenv("PGHOST") or os.getenv("DB_HOST") or "127.0.0.1").strip()
    port = int((os.getenv("PGPORT") or os.getenv("DB_PORT") or "5432").strip())
    user = (os.getenv("PGUSER") or os.getenv("DB_USER") or "postgres").strip()
    password = os.getenv("PGPASSWORD") or os.getenv("DB_PASSWORD") or ""
    dbname = (os.getenv("PGDATABASE") or os.getenv("DB_NAME") or "web_project").strip()
    sslmode = "require" if (os.getenv("PGSSL") or "").strip().lower() in ("1", "true", "yes", "on") else None

    conninfo = f"host={host} port={port} dbname={dbname} user={user} password={password}"
    return DbConfig(conninfo=conninfo, max_size=max_size, sslmode=sslmode)


_pool: ConnectionPool | None = None


def get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        cfg = _build_conninfo()
        kwargs: dict[str, Any] = {"autocommit": True, "row_factory": dict_row}
        if cfg.sslmode:
            kwargs["sslmode"] = cfg.sslmode
        _pool = ConnectionPool(
            conninfo=cfg.conninfo,
            max_size=cfg.max_size,
            kwargs=kwargs,
            timeout=10,
        )
    return _pool


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


def execute(sql: str, params: Iterable[Any] | Mapping[str, Any] | None = None) -> None:
    """Run SQL that does not return rows (DDL, DO blocks, etc.)."""
    with get_pool().connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)


def query(sql: str, params: Iterable[Any] | Mapping[str, Any] | None = None) -> list[dict[str, Any]]:
    with get_pool().connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            if cur.description is None:
                return []
            return list(cur.fetchall() or [])


def query_one(sql: str, params: Iterable[Any] | Mapping[str, Any] | None = None) -> Optional[dict[str, Any]]:
    rows = query(sql, params)
    return rows[0] if rows else None

