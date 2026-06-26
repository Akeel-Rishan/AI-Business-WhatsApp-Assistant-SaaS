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
                select
                  users.id::text,
                  users.email,
                  users.email_confirmed_at is not null as confirmed,
                  exists (
                    select 1
                    from public.businesses
                    where businesses.user_id = users.id
                  ) as has_business,
                  users.email_confirmed_at is null as email_confirmed_at_null,
                  users.confirmed_at is null as confirmed_at_null,
                  users.confirmation_sent_at is null as confirmation_sent_at_null,
                  users.created_at
                from auth.users
                order by users.created_at desc
                limit 10;
                """
            )
            rows = cursor.fetchall()

    print(f"AUTH_USERS={len(rows)}")
    for (
        _user_id,
        email,
        confirmed,
        has_business,
        email_confirmed_at_null,
        confirmed_at_null,
        confirmation_sent_at_null,
        created_at,
    ) in rows:
        print(
            f"{mask_email(email)}|confirmed={confirmed}|has_business={has_business}|"
            f"email_confirmed_at_null={email_confirmed_at_null}|"
            f"confirmed_at_null={confirmed_at_null}|"
            f"confirmation_sent_at_null={confirmation_sent_at_null}|created={created_at}"
        )


if __name__ == "__main__":
    main()
