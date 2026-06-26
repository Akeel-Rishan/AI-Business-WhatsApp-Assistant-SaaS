import logging
import time

from services.business_lookup import get_business_by_phone_id
from services.customer_service import upsert_customer
from services.message_service import store_inbound_message
from services.supabase import get_supabase
from services.webhook_logger import log_webhook_event
from services.webhook_parser import ParsedMessage, ParsedStatusUpdate, parse_webhook_payload


logger = logging.getLogger(__name__)


async def process_webhook_message(parsed_message: ParsedMessage, supabase_client) -> None:
    business = await get_business_by_phone_id(parsed_message.phone_number_id, supabase_client)
    if not business:
        return

    customer = await upsert_customer(
        business_id=str(business["id"]),
        whatsapp_number=parsed_message.from_number,
        name=parsed_message.customer_name or None,
        supabase_client=supabase_client,
    )
    stored_message = await store_inbound_message(
        business_id=str(business["id"]),
        customer_id=str(customer["id"]),
        wa_message_id=parsed_message.wa_message_id,
        content=parsed_message.text_content,
        message_type=parsed_message.message_type,
        supabase_client=supabase_client,
    )
    logger.info(
        "Message stored: %s for business %s",
        stored_message.get("wa_message_id"),
        business.get("name"),
    )
    # TODO: Phase 4 - trigger AI response here.
    logger.info("AI response placeholder for %s", parsed_message.wa_message_id)


async def process_status_update(status_update: ParsedStatusUpdate, supabase_client) -> None:
    logger.info(
        "WhatsApp status update received: %s status=%s recipient=%s",
        status_update.wa_message_id,
        status_update.status,
        status_update.recipient_number,
    )


async def process_webhook_payload(payload: dict) -> None:
    started = time.perf_counter()
    supabase_client = get_supabase()
    messages: list[ParsedMessage] = []
    statuses: list[ParsedStatusUpdate] = []
    phone_number_id: str | None = None
    event_type = "unknown"
    error_message: str | None = None
    processed = False

    try:
        messages, statuses = parse_webhook_payload(payload)
        if messages:
            phone_number_id = messages[0].phone_number_id
            event_type = "message"
        elif statuses:
            phone_number_id = statuses[0].phone_number_id
            event_type = "status"

        for message in messages:
            await process_webhook_message(message, supabase_client)
        for status_update in statuses:
            await process_status_update(status_update, supabase_client)

        processed = True
    except Exception as exc:
        logger.exception("WhatsApp webhook background processing failed.")
        error_message = str(exc)
    finally:
        duration_ms = int((time.perf_counter() - started) * 1000)
        try:
            await log_webhook_event(
                phone_number_id=phone_number_id,
                event_type=event_type,
                payload=payload,
                processed=processed,
                error_message=error_message,
                duration_ms=duration_ms,
                supabase_client=supabase_client,
            )
        except Exception:
            logger.exception("Could not write webhook log.")
