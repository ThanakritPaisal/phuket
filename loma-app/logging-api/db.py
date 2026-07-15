"""
PostgreSQL connection + schema for the LOMA logging API.

Reads POSTGRESQL_CONNECTING_STRING from the repo-root .env, targets the `loma`
database, and owns the `log` table schema. `init_schema()` is safe to call on every
startup (CREATE ... IF NOT EXISTS).
"""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Iterator
from urllib.parse import urlparse, urlunparse

import psycopg
from psycopg.rows import dict_row

try:
    from dotenv import load_dotenv
except ImportError:  # dotenv optional at runtime if the env var is already set
    load_dotenv = None

# Load the repo-root .env (…/phuket/.env) so POSTGRESQL_CONNECTING_STRING is available.
_ROOT_ENV = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
if load_dotenv is not None:
    load_dotenv(_ROOT_ENV)

DB_NAME = os.environ.get("LOMA_DB_NAME", "loma")
LOG_TABLE = "log"


def _base_conn_string() -> str:
    raw = os.environ.get("POSTGRESQL_CONNECTING_STRING")
    if not raw:
        raise RuntimeError(
            "POSTGRESQL_CONNECTING_STRING is not set. Add it to the repo-root .env."
        )
    return raw.strip()


def _with_dbname(conn_string: str, dbname: str) -> str:
    """Return the connection string with its database path set to `dbname` and SSL on
    (DigitalOcean managed Postgres requires sslmode=require)."""
    parsed = urlparse(conn_string)
    query = parsed.query
    if "sslmode" not in query:
        query = (query + "&" if query else "") + "sslmode=require"
    return urlunparse(parsed._replace(path="/" + dbname, query=query))


def admin_conn_string() -> str:
    """Connection to a pre-existing database (defaultdb) for admin work like CREATE DATABASE."""
    return _with_dbname(_base_conn_string(), os.environ.get("LOMA_ADMIN_DB", "defaultdb"))


def loma_conn_string() -> str:
    """Connection to the application database (`loma`)."""
    return _with_dbname(_base_conn_string(), DB_NAME)


@contextmanager
def get_conn() -> Iterator[psycopg.Connection]:
    conn = psycopg.connect(loma_conn_string(), row_factory=dict_row)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def ensure_database() -> bool:
    """Create the `loma` database if it does not exist. Returns True if it was created.
    CREATE DATABASE cannot run inside a transaction, so we use autocommit."""
    with psycopg.connect(admin_conn_string(), autocommit=True) as conn:
        exists = conn.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,)
        ).fetchone()
        if exists:
            return False
        conn.execute(f'CREATE DATABASE "{DB_NAME}"')
        return True


def init_schema() -> None:
    """Create the `log` table and its indexes in the `loma` database."""
    with get_conn() as conn:
        conn.execute(
            f"""
            CREATE TABLE IF NOT EXISTS {LOG_TABLE} (
                row_id                 BIGSERIAL PRIMARY KEY,
                event_id               TEXT,
                event_type             TEXT NOT NULL,
                hotel_id               TEXT,
                staff_id               TEXT,
                provider_id            TEXT,
                community_id           TEXT,
                recommendation_list_id TEXT,
                tourist_session_id     TEXT,
                channel                TEXT,
                credits                INTEGER,
                counted                BOOLEAN,
                flagged                BOOLEAN,
                client_ts              TEXT,
                server_ts              TIMESTAMPTZ NOT NULL DEFAULT now(),
                metadata               JSONB
            )
            """
        )
        for col in ("event_type", "hotel_id", "provider_id", "tourist_session_id", "recommendation_list_id"):
            conn.execute(
                f"CREATE INDEX IF NOT EXISTS idx_{LOG_TABLE}_{col} ON {LOG_TABLE} ({col})"
            )


PROVIDER_TABLE = "provider"


def init_provider_schema() -> None:
    """Create the `provider` table (LOMA catalog). Key columns for querying + a full
    JSONB record the web app consumes as-is."""
    with get_conn() as conn:
        conn.execute(
            f"""
            CREATE TABLE IF NOT EXISTS {PROVIDER_TABLE} (
                id             TEXT PRIMARY KEY,
                name           TEXT,
                category       TEXT,
                area           TEXT,
                lat            DOUBLE PRECISION,
                lng            DOUBLE PRECISION,
                source         TEXT,
                community_slug TEXT,
                confidence     TEXT,
                data           JSONB NOT NULL,
                updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
        for col in ("category", "area", "community_slug", "source"):
            conn.execute(
                f"CREATE INDEX IF NOT EXISTS idx_{PROVIDER_TABLE}_{col} ON {PROVIDER_TABLE} ({col})"
            )


def setup() -> None:
    """One-shot: create the database (if needed) then the schema."""
    created = ensure_database()
    init_schema()
    init_provider_schema()
    print(f"database '{DB_NAME}': {'created' if created else 'already existed'}; tables '{LOG_TABLE}', '{PROVIDER_TABLE}' ready")


if __name__ == "__main__":
    setup()
