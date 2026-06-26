from datetime import datetime, timezone
import logging


logger = logging.getLogger(__name__)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def upsert_customer(
    business_id: str,
    whatsapp_number: str,
    name: str | None,
    supabase_client,
) -> dict:
    try:
        existing_response = (
            supabase_client.table("customers")
            .select("*")
            .eq("business_id", business_id)
            .eq("whatsapp_number", whatsapp_number)
            .limit(1)
            .execute()
        )
        existing = existing_response.data[0] if isinstance(existing_response.data, list) and existing_response.data else None
        now = _utc_now()

        if existing:
            update_payload = {"last_seen": now}
            if name and name != existing.get("name"):
                update_payload["name"] = name
            updated = (
                supabase_client.table("customers")
                .update(update_payload)
                .eq("id", existing["id"])
                .execute()
            )
            return updated.data[0] if updated.data else {**existing, **update_payload}

        created = (
            supabase_client.table("customers")
            .insert(
                {
                    "business_id": business_id,
                    "whatsapp_number": whatsapp_number,
                    "name": name or None,
                    "first_seen": now,
                    "last_seen": now,
                }
            )
            .execute()
        )
        return created.data[0]
    except Exception:
        logger.exception("Customer upsert failed for business_id=%s whatsapp_number=%s", business_id, whatsapp_number)
        raise
