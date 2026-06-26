from pathlib import Path
import os

import psycopg
from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[2]
MIGRATIONS_DIR = ROOT_DIR / "supabase" / "migrations"


def main() -> None:
    load_dotenv(ROOT_DIR / "backend" / ".env")

    database_url = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")
    if not database_url:
        raise RuntimeError("SUPABASE_DB_URL is required in backend/.env")

    migration_paths = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not migration_paths:
        raise RuntimeError(f"No migration files found in: {MIGRATIONS_DIR}")

    with psycopg.connect(database_url, autocommit=True) as connection:
        with connection.cursor() as cursor:
            for migration_path in migration_paths:
                sql = migration_path.read_text(encoding="utf-8")
                if not sql.strip():
                    raise RuntimeError(f"Migration file is empty: {migration_path}")
                cursor.execute(sql)
                print(f"Applied {migration_path.name}")

            cursor.execute(
                """
                select table_name
                from information_schema.tables
                where table_schema = 'public'
                  and table_name in (
                    'businesses',
                    'customers',
                    'conversations',
                    'messages',
                    'faqs',
                    'knowledge_base_items',
                    'business_instructions',
                    'leads',
                    'ai_settings'
                  )
                order by table_name;
                """
            )
            tables = [row[0] for row in cursor.fetchall()]

    expected = {
        "businesses",
        "customers",
        "conversations",
        "messages",
        "faqs",
        "knowledge_base_items",
        "business_instructions",
        "leads",
        "ai_settings",
    }
    missing = sorted(expected - set(tables))
    if missing:
        raise RuntimeError(f"Migration ran, but these tables are missing: {', '.join(missing)}")

    print("Migrations applied successfully.")
    print("Verified tables:")
    for table in tables:
        print(f"- {table}")


if __name__ == "__main__":
    main()
