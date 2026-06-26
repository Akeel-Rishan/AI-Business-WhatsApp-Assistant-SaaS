from datetime import datetime, timedelta, timezone

import psycopg
from psycopg.rows import dict_row

from services.supabase import _database_url
from utils.logger import get_logger


logger = get_logger(__name__)


async def log_webhook_event(
    phone_number_id: str | None,
    event_type: str,
    payload: dict,
    processed: bool,
    error_message: str | None,
    duration_ms: int,
    supabase_client,
) -> None:
    try:
        supabase_client.table("webhook_logs").insert(
            {
                "phone_number_id": phone_number_id,
                "event_type": event_type,
                "payload": payload,
                "processed": processed,
                "error_message": error_message,
                "processing_duration_ms": duration_ms,
            }
        ).execute()
    except Exception:
        logger.exception("Webhook event logging failed for event_type=%s phone_number_id=%s", event_type, phone_number_id)
        raise


async def get_webhook_health(webhook_url: str, started_at: datetime) -> dict:
    since = datetime.now(timezone.utc) - timedelta(hours=24)

    try:
        with psycopg.connect(_database_url(), row_factory=dict_row) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    select
                      count(*)::int as recent_events,
                      count(*) filter (where error_message is not null)::int as failed_events,
                      max(received_at) as last_event_at
                    from webhook_logs
                    where received_at >= %s
                    """,
                    (since,),
                )
                row = cursor.fetchone() or {}
    except Exception:
        logger.exception("Webhook health query failed.")
        raise

    last_event_at = row.get("last_event_at")
    return {
        "status": "ok",
        "webhook_url": webhook_url,
        "recent_events": row.get("recent_events") or 0,
        "last_event_at": last_event_at.isoformat() if last_event_at else None,
        "failed_events": row.get("failed_events") or 0,
        "uptime_seconds": int((datetime.now(timezone.utc) - started_at).total_seconds()),
    }
