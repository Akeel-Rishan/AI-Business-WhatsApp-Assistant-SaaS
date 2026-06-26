from pathlib import Path
import os

import psycopg
from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[2]


def mask_email(email: str | None) -> str:
    if not email:
        return "(no email)"
    local, _, domain = email.partition("@")
    return f"{local[:2]}***@{domain}" if domain else f"{local[:2]}***"


def main() -> None:
    load_dotenv(ROOT_DIR / "backend" / ".env")
    database_url = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")
    if not database_url:
        raise RuntimeError("SUPABASE_DB_URL is required in backend/.env")

    with psycopg.connect(database_url, autocommit=True) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                update auth.users
                set
                  email_confirmed_at = coalesce(email_confirmed_at, now()),
                  updated_at = now()
                where email_confirmed_at is null
                returning email;
                """
            )
            rows = cursor.fetchall()

    print(f"CONFIRMED_USERS={len(rows)}")
    for (email,) in rows:
        print(mask_email(email))


if __name__ == "__main__":
    main()
