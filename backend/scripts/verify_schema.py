from pathlib import Path
import os

import psycopg
from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[2]

EXPECTED_TABLES = [
    "businesses",
    "customers",
    "conversations",
    "messages",
    "faqs",
    "knowledge_base_items",
    "business_instructions",
    "leads",
    "ai_settings",
]

EXPECTED_BACKEND_TABLES = [
    "webhook_logs",
]

EXPECTED_PUBLIC_TRIGGERS = [
    "update_businesses_updated_at",
    "update_faqs_updated_at",
    "update_knowledge_base_items_updated_at",
    "update_business_instructions_updated_at",
    "update_leads_updated_at",
    "update_ai_settings_updated_at",
    "create_business_ai_settings",
    "auto_create_instructions",
    "update_message_conversation_last_message_at",
    "update_inbound_message_customer_stats",
]

EXPECTED_AUTH_TRIGGERS = [
    "create_business_for_new_auth_user",
]

EXPECTED_BUSINESS_COLUMNS = [
    "business_type",
    "website_url",
    "timezone",
    "after_hours_message",
]


def main() -> None:
    load_dotenv(ROOT_DIR / "backend" / ".env")
    database_url = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")
    if not database_url:
        raise RuntimeError("SUPABASE_DB_URL is required in backend/.env")

    with psycopg.connect(database_url, autocommit=True) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                select relname
                from pg_class
                where relnamespace = 'public'::regnamespace
                  and relrowsecurity
                  and relname = any(%s)
                order by relname;
                """,
                (EXPECTED_TABLES,),
            )
            rls_tables = [row[0] for row in cursor.fetchall()]

            cursor.execute(
                """
                select table_name
                from information_schema.tables
                where table_schema = 'public'
                  and table_name = any(%s)
                order by table_name;
                """,
                (EXPECTED_BACKEND_TABLES,),
            )
            backend_tables = [row[0] for row in cursor.fetchall()]

            cursor.execute(
                """
                select tgname
                from pg_trigger
                join pg_class on pg_class.oid = pg_trigger.tgrelid
                join pg_namespace on pg_namespace.oid = pg_class.relnamespace
                where not tgisinternal
                  and pg_namespace.nspname = 'public'
                  and tgname = any(%s)
                order by tgname;
                """,
                (EXPECTED_PUBLIC_TRIGGERS,),
            )
            public_triggers = [row[0] for row in cursor.fetchall()]

            cursor.execute(
                """
                select tgname
                from pg_trigger
                join pg_class on pg_class.oid = pg_trigger.tgrelid
                join pg_namespace on pg_namespace.oid = pg_class.relnamespace
                where not tgisinternal
                  and pg_namespace.nspname = 'auth'
                  and tgname = any(%s)
                order by tgname;
                """,
                (EXPECTED_AUTH_TRIGGERS,),
            )
            auth_triggers = [row[0] for row in cursor.fetchall()]

            cursor.execute(
                """
                select column_name
                from information_schema.columns
                where table_schema = 'public'
                  and table_name = 'businesses'
                  and column_name = any(%s)
                order by column_name;
                """,
                (EXPECTED_BUSINESS_COLUMNS,),
            )
            business_columns = [row[0] for row in cursor.fetchall()]

    missing_rls = sorted(set(EXPECTED_TABLES) - set(rls_tables))
    missing_backend_tables = sorted(set(EXPECTED_BACKEND_TABLES) - set(backend_tables))
    missing_public_triggers = sorted(set(EXPECTED_PUBLIC_TRIGGERS) - set(public_triggers))
    missing_auth_triggers = sorted(set(EXPECTED_AUTH_TRIGGERS) - set(auth_triggers))
    missing_business_columns = sorted(set(EXPECTED_BUSINESS_COLUMNS) - set(business_columns))

    if missing_rls:
        raise RuntimeError(f"RLS is missing on: {', '.join(missing_rls)}")
    if missing_backend_tables:
        raise RuntimeError(f"Backend-only tables are missing: {', '.join(missing_backend_tables)}")
    if missing_public_triggers:
        raise RuntimeError(f"Public triggers are missing: {', '.join(missing_public_triggers)}")
    if missing_auth_triggers:
        raise RuntimeError(f"Auth triggers are missing: {', '.join(missing_auth_triggers)}")
    if missing_business_columns:
        raise RuntimeError(f"Business columns are missing: {', '.join(missing_business_columns)}")

    print("Schema verification successful.")
    print("RLS enabled tables:")
    for table in rls_tables:
        print(f"- {table}")
    print("Verified triggers:")
    for trigger in public_triggers + auth_triggers:
        print(f"- {trigger}")
    print("Verified business onboarding columns:")
    for column in business_columns:
        print(f"- {column}")
    print("Verified backend-only tables:")
    for table in backend_tables:
        print(f"- {table}")


if __name__ == "__main__":
    main()
