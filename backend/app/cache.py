"""SQLite-backed JSON cache with optional TTL.

Historical data (past seasons) never changes -> cached forever (expires NULL).
Current-season data changes at most once per race -> short TTL.

On Render's free tier the disk is ephemeral, so the cache rebuilds after each
deploy/restart — acceptable, it just re-warms on demand.
"""
import json
import os
import sqlite3
import threading
import time

DB_PATH = os.environ.get("CACHE_DB_PATH", "cache.db")

_lock = threading.Lock()
_conn: sqlite3.Connection | None = None


def _get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _conn.execute(
            "CREATE TABLE IF NOT EXISTS cache ("
            "key TEXT PRIMARY KEY, value TEXT NOT NULL, expires_at REAL)"
        )
        _conn.commit()
    return _conn


def get(key: str):
    with _lock:
        row = _get_conn().execute(
            "SELECT value, expires_at FROM cache WHERE key = ?", (key,)
        ).fetchone()
    if row is None:
        return None
    value, expires_at = row
    if expires_at is not None and expires_at < time.time():
        with _lock:
            _get_conn().execute("DELETE FROM cache WHERE key = ?", (key,))
            _get_conn().commit()
        return None
    return json.loads(value)


def set(key: str, value, ttl: float | None = None):
    expires_at = time.time() + ttl if ttl is not None else None
    with _lock:
        _get_conn().execute(
            "INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)",
            (key, json.dumps(value), expires_at),
        )
        _get_conn().commit()
