from datetime import datetime, timedelta, timezone

from utils.logger import get_logger


logger = get_logger(__name__)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        normalized = value.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except ValueError:
        logger.warning("Could not parse conversation timestamp: %s", value)
        return None


async def find_or_create_conversation(
    business_id: str,
    customer_id: str,
    supabase_client,
) -> dict:
    try:
        response = (
            supabase_client.table("conversations")
            .select("*")
            .eq("business_id", business_id)
            .eq("customer_id", customer_id)
            .eq("status", "active")
            .limit(1)
            .execute()
        )
        active = response.data[0] if isinstance(response.data, list) and response.data else None

        if active:
            last_message_at = _parse_datetime(active.get("last_message_at"))
            if last_message_at and datetime.now(timezone.utc) - last_message_at > timedelta(hours=24):
                supabase_client.table("conversations").update({"status": "closed"}).eq("id", active["id"]).execute()
                active = None

        if not active:
            any_response = (
                supabase_client.table("conversations")
                .select("*")
                .eq("business_id", business_id)
                .eq("customer_id", customer_id)
                .limit(1)
                .execute()
            )
            existing_any_status = any_response.data[0] if isinstance(any_response.data, list) and any_response.data else None
            if existing_any_status:
                reopened = (
                    supabase_client.table("conversations")
                    .update({"status": "active", "ai_enabled": existing_any_status.get("ai_enabled", True), "last_message_at": _utc_now()})
                    .eq("id", existing_any_status["id"])
                    .execute()
                )
                active = reopened.data[0] if reopened.data else existing_any_status
            else:
                created = (
                    supabase_client.table("conversations")
                    .insert({"business_id": business_id, "customer_id": customer_id, "status": "active", "ai_enabled": True})
                    .execute()
                )
                active = created.data[0]

        updated = (
            supabase_client.table("conversations")
            .update({"last_message_at": _utc_now()})
            .eq("id", active["id"])
            .execute()
        )
        return updated.data[0] if updated.data else active
    except Exception:
        logger.exception("Conversation management failed for business_id=%s customer_id=%s", business_id, customer_id)
        raise
