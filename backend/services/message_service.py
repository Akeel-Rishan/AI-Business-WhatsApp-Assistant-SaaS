from datetime import datetime, timezone

from utils.logger import get_logger

SUPPORTED_MESSAGE_TYPES = {"text", "image", "audio", "document", "video", "reaction", "button", "interactive", "unknown"}
logger = get_logger(__name__)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _message_content(content: str | None, message_type: str) -> str:
    if content:
        return content
    if message_type == "image":
        return "[Image message]"
    if message_type == "audio":
        return "[Audio message]"
    if message_type == "video":
        return "[Video message]"
    if message_type == "document":
        return "[Document message]"
    if message_type == "reaction":
        return "[Reaction message]"
    return "[Unsupported message type]"


async def _get_or_create_conversation(business_id: str, customer_id: str, supabase_client) -> dict:
    try:
        existing_response = (
            supabase_client.table("conversations")
            .select("*")
            .eq("business_id", business_id)
            .eq("customer_id", customer_id)
            .eq("status", "active")
            .limit(1)
            .execute()
        )
        existing = existing_response.data[0] if isinstance(existing_response.data, list) and existing_response.data else None
        if existing:
            return existing

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
                .update({"status": "active", "last_message_at": _utc_now()})
                .eq("id", existing_any_status["id"])
                .execute()
            )
            return reopened.data[0] if reopened.data else existing_any_status

        created = (
            supabase_client.table("conversations")
            .insert({"business_id": business_id, "customer_id": customer_id, "status": "active", "ai_enabled": True})
            .execute()
        )
        return created.data[0]
    except Exception:
        logger.exception("Conversation lookup/create failed for business_id=%s customer_id=%s", business_id, customer_id)
        raise


async def store_inbound_message(
    business_id: str,
    customer_id: str,
    wa_message_id: str,
    content: str | None,
    message_type: str,
    supabase_client,
) -> dict:
    try:
        duplicate_response = (
            supabase_client.table("messages")
            .select("*")
            .eq("wa_message_id", wa_message_id)
            .limit(1)
            .execute()
        )
        duplicate = duplicate_response.data[0] if isinstance(duplicate_response.data, list) and duplicate_response.data else None
        if duplicate:
            logger.info("Skipping duplicate WhatsApp message: %s", wa_message_id)
            return duplicate

        conversation = await _get_or_create_conversation(business_id, customer_id, supabase_client)
        now = _utc_now()
        normalized_type = message_type if message_type in SUPPORTED_MESSAGE_TYPES else "unknown"

        created = (
            supabase_client.table("messages")
            .insert(
                {
                    "conversation_id": conversation["id"],
                    "business_id": business_id,
                    "direction": "inbound",
                    "content": _message_content(content, normalized_type),
                    "message_type": normalized_type,
                    "wa_message_id": wa_message_id,
                    "sent_by_ai": False,
                    "is_read": False,
                }
            )
            .execute()
        )

        supabase_client.table("conversations").update({"last_message_at": now}).eq("id", conversation["id"]).execute()
        return created.data[0]
    except Exception:
        logger.exception("Inbound message storage failed for wa_message_id=%s", wa_message_id)
        raise
