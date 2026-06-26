import os
import re
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any
from uuid import UUID

import httpx
import psycopg
from dotenv import load_dotenv
from fastapi import Header, HTTPException, status
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb


ROOT_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = ROOT_DIR.parent
load_dotenv(ROOT_DIR / ".env")

def _load_non_empty_env(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        if value.strip():
            os.environ[key.strip()] = value.strip().strip('"').strip("'")


_load_non_empty_env(ROOT_DIR / ".env")
IDENTIFIER_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")
ALLOWED_TABLES = {
    "ai_settings",
    "business_instructions",
    "businesses",
    "conversations",
    "customers",
    "dead_letter_messages",
    "faqs",
    "knowledge_base_items",
    "leads",
    "messages",
    "webhook_logs",
}


@dataclass
class QueryResponse:
    data: Any


def _quote_identifier(identifier: str) -> str:
    if not IDENTIFIER_RE.match(identifier):
        raise ValueError(f"Unsafe SQL identifier: {identifier}")
    return f'"{identifier}"'


def _normalize_value(value: Any) -> Any:
    if isinstance(value, (datetime, date, UUID)):
        return str(value)
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, list):
        return [_normalize_value(item) for item in value]
    if isinstance(value, dict):
        return {key: _normalize_value(item) for key, item in value.items()}
    return value


def _normalize_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [_normalize_value(row) for row in rows]


def _adapt_param(value: Any) -> Any:
    if isinstance(value, dict):
        return Jsonb(value)
    return value


def _read_env_file(path: Path, key: str) -> str | None:
    if not path.exists():
        return None

    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith(f"{key}="):
            return line.split("=", 1)[1].strip()

    return None


def _database_url() -> str:
    url = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")
    if not url:
        raise RuntimeError("SUPABASE_DB_URL is required in backend/.env")
    return url


def _auth_api_key() -> str:
    key = (
        os.getenv("SUPABASE_PUBLISHABLE_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        or _read_env_file(PROJECT_DIR / "frontend" / ".env.local", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
        or _read_env_file(PROJECT_DIR / "frontend" / ".env.local", "NEXT_PUBLIC_SUPABASE_ANON_KEY")
    )
    if not key:
        raise RuntimeError("SUPABASE_PUBLISHABLE_KEY is required for auth token verification.")
    return key


def _supabase_url() -> str:
    url = os.getenv("SUPABASE_URL") or _read_env_file(PROJECT_DIR / "frontend" / ".env.local", "NEXT_PUBLIC_SUPABASE_URL")
    if not url:
        raise RuntimeError("SUPABASE_URL is required in backend/.env")
    return url.rstrip("/")


class TableQuery:
    def __init__(self, table_name: str):
        if table_name not in ALLOWED_TABLES:
            raise ValueError(f"Unsupported table: {table_name}")

        self.table_name = table_name
        self._operation = "select"
        self._select_columns = "*"
        self._payload: dict[str, Any] | None = None
        self._filters: list[tuple[str, Any]] = []
        self._orders: list[tuple[str, bool]] = []
        self._limit: int | None = None
        self._maybe_single = False
        self._on_conflict: str | None = None

    def select(self, columns: str = "*") -> "TableQuery":
        self._operation = "select"
        self._select_columns = columns
        return self

    def insert(self, payload: dict[str, Any]) -> "TableQuery":
        self._operation = "insert"
        self._payload = payload
        return self

    def upsert(self, payload: dict[str, Any], on_conflict: str | None = None) -> "TableQuery":
        self._operation = "upsert"
        self._payload = payload
        self._on_conflict = on_conflict
        return self

    def update(self, payload: dict[str, Any]) -> "TableQuery":
        self._operation = "update"
        self._payload = payload
        return self

    def delete(self) -> "TableQuery":
        self._operation = "delete"
        return self

    def eq(self, column: str, value: Any) -> "TableQuery":
        self._filters.append((column, value))
        return self

    def limit(self, count: int) -> "TableQuery":
        self._limit = count
        return self

    def order(self, column: str, desc: bool = False) -> "TableQuery":
        self._orders.append((column, desc))
        return self

    def maybe_single(self) -> "TableQuery":
        self._maybe_single = True
        self._limit = 1
        return self

    def execute(self) -> QueryResponse:
        if self._operation == "select":
            rows = self._execute_select()
        elif self._operation == "insert":
            rows = self._execute_insert()
        elif self._operation == "upsert":
            rows = self._execute_upsert()
        elif self._operation == "update":
            rows = self._execute_update()
        elif self._operation == "delete":
            rows = self._execute_delete()
        else:
            raise ValueError(f"Unsupported operation: {self._operation}")

        normalized = _normalize_rows(rows)
        if self._maybe_single:
            return QueryResponse(normalized[0] if normalized else None)
        return QueryResponse(normalized)

    def _columns_sql(self) -> str:
        if self._select_columns.strip() == "*":
            return "*"
        columns = [column.strip() for column in self._select_columns.split(",") if column.strip()]
        return ", ".join(_quote_identifier(column) for column in columns)

    def _where_sql(self, params: list[Any]) -> str:
        if not self._filters:
            return ""

        clauses = []
        for column, value in self._filters:
            clauses.append(f"{_quote_identifier(column)} = %s")
            params.append(value)

        return f" where {' and '.join(clauses)}"

    def _order_sql(self) -> str:
        if not self._orders:
            return ""

        parts = [
            f"{_quote_identifier(column)} {'desc' if desc else 'asc'}"
            for column, desc in self._orders
        ]
        return f" order by {', '.join(parts)}"

    def _limit_sql(self, params: list[Any]) -> str:
        if self._limit is None:
            return ""
        params.append(self._limit)
        return " limit %s"

    def _execute(self, sql: str, params: list[Any]) -> list[dict[str, Any]]:
        with psycopg.connect(_database_url(), row_factory=dict_row) as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, params)
                rows = cursor.fetchall()
                connection.commit()
                return list(rows)

    def _execute_select(self) -> list[dict[str, Any]]:
        params: list[Any] = []
        sql = f"select {self._columns_sql()} from {_quote_identifier(self.table_name)}"
        sql += self._where_sql(params)
        sql += self._order_sql()
        sql += self._limit_sql(params)
        return self._execute(sql, params)

    def _execute_insert(self) -> list[dict[str, Any]]:
        if not self._payload:
            raise ValueError("Insert payload is required")

        columns = list(self._payload.keys())
        params = [_adapt_param(self._payload[column]) for column in columns]
        sql = (
            f"insert into {_quote_identifier(self.table_name)} "
            f"({', '.join(_quote_identifier(column) for column in columns)}) "
            f"values ({', '.join(['%s'] * len(columns))}) returning *"
        )
        return self._execute(sql, params)

    def _execute_upsert(self) -> list[dict[str, Any]]:
        if not self._payload:
            raise ValueError("Upsert payload is required")
        if not self._on_conflict:
            raise ValueError("Upsert on_conflict is required")

        conflict_columns = [column.strip() for column in self._on_conflict.split(",") if column.strip()]
        columns = list(self._payload.keys())
        update_columns = [column for column in columns if column not in conflict_columns]
        params = [_adapt_param(self._payload[column]) for column in columns]

        if update_columns:
            update_sql = ", ".join(
                f"{_quote_identifier(column)} = excluded.{_quote_identifier(column)}"
                for column in update_columns
            )
        else:
            update_sql = f"{_quote_identifier(conflict_columns[0])} = excluded.{_quote_identifier(conflict_columns[0])}"

        sql = (
            f"insert into {_quote_identifier(self.table_name)} "
            f"({', '.join(_quote_identifier(column) for column in columns)}) "
            f"values ({', '.join(['%s'] * len(columns))}) "
            f"on conflict ({', '.join(_quote_identifier(column) for column in conflict_columns)}) "
            f"do update set {update_sql} returning *"
        )
        return self._execute(sql, params)

    def _execute_update(self) -> list[dict[str, Any]]:
        if not self._payload:
            raise ValueError("Update payload is required")

        params = [_adapt_param(self._payload[column]) for column in self._payload.keys()]
        sql = (
            f"update {_quote_identifier(self.table_name)} set "
            f"{', '.join(f'{_quote_identifier(column)} = %s' for column in self._payload.keys())}"
        )
        sql += self._where_sql(params)
        sql += " returning *"
        return self._execute(sql, params)

    def _execute_delete(self) -> list[dict[str, Any]]:
        params: list[Any] = []
        sql = f"delete from {_quote_identifier(self.table_name)}"
        sql += self._where_sql(params)
        sql += " returning *"
        return self._execute(sql, params)


class SupabaseDatabaseClient:
    def table(self, table_name: str) -> TableQuery:
        return TableQuery(table_name)


def get_supabase() -> SupabaseDatabaseClient:
    return SupabaseDatabaseClient()


async def get_current_user_id(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer access token is required.",
        )

    token = authorization.split(" ", 1)[1].strip()
    try:
        response = httpx.get(
            f"{_supabase_url()}/auth/v1/user",
            headers={
                "apikey": _auth_api_key(),
                "Authorization": f"Bearer {token}",
            },
            timeout=20,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not verify Supabase session.",
        ) from exc

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
        )

    user = response.json()
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
        )

    return str(user_id)
