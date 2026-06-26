from utils.logger import get_logger


logger = get_logger(__name__)

LEAD_SIGNALS = {
    "purchase_intent": [
        "want to buy",
        "i want",
        "how much",
        "price",
        "cost",
        "order",
        "purchase",
        "interested in",
        "can i get",
        "do you sell",
        "available",
        "how to order",
        "where to buy",
    ],
    "booking_intent": [
        "appointment",
        "book",
        "reserve",
        "schedule",
        "slot",
        "available date",
        "when can i",
        "visit",
        "come in",
    ],
    "urgent_need": [
        "urgent",
        "asap",
        "today",
        "now",
        "immediately",
        "emergency",
        "as soon as",
    ],
    "contact_request": [
        "phone number",
        "call me",
        "whatsapp",
        "contact",
        "reach you",
        "speak to someone",
    ],
}


async def detect_lead_signals(message_text: str, customer: dict, business: dict) -> tuple[bool, list[str]]:
    normalized = (message_text or "").lower()
    detected = [
        signal
        for signal, keywords in LEAD_SIGNALS.items()
        if any(keyword in normalized for keyword in keywords)
    ]
    return len(detected) > 0, detected


async def create_lead_if_needed(
    business_id: str,
    customer_id: str,
    conversation_id: str,
    message_text: str,
    signals: list[str],
    supabase_client,
) -> dict | None:
    if not signals:
        return None

    try:
        response = (
            supabase_client.table("leads")
            .select("*")
            .eq("business_id", business_id)
            .eq("customer_id", customer_id)
            .limit(10)
            .execute()
        )
        active = [
            lead for lead in (response.data or [])
            if lead.get("status") in {"new", "contacted"}
        ]
        if active:
            return active[0]

        created = (
            supabase_client.table("leads")
            .insert(
                {
                    "business_id": business_id,
                    "customer_id": customer_id,
                    "conversation_id": conversation_id,
                    "inquiry_type": signals[0],
                    "summary": (message_text or "")[:200],
                    "status": "new",
                    "priority": "high" if "urgent_need" in signals else "medium",
                }
            )
            .execute()
        )
        return created.data[0] if created.data else None
    except Exception:
        logger.exception("Lead detection persistence failed for customer_id=%s", customer_id)
        raise
