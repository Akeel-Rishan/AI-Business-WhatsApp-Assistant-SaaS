import time

from services.pipeline.dead_letter import send_to_dead_letter
from services.pipeline.orchestrator import MessagePipeline, PipelineStage
from services.supabase import get_supabase
from services.webhook_logger import log_webhook_event
from services.webhook_parser import ParsedMessage, ParsedStatusUpdate, parse_webhook_payload
from utils.logger import get_logger


logger = get_logger(__name__)
DEAD_LETTER_STAGES = {
    PipelineStage.BUSINESS_LOOKUP.value,
    PipelineStage.CUSTOMER_UPSERT.value,
    PipelineStage.CONVERSATION_MANAGEMENT.value,
    PipelineStage.MESSAGE_STORAGE.value,
}


async def process_webhook_message(
    parsed_message: ParsedMessage,
    raw_payload: dict,
    supabase_client,
) -> None:
    pipeline = MessagePipeline(supabase_client, raw_payload=raw_payload)
    try:
        ctx = await pipeline.run(parsed_message)
        if ctx.stages_failed and DEAD_LETTER_STAGES.intersection(ctx.stages_failed):
            await send_to_dead_letter(
                parsed_message=parsed_message,
                raw_payload=raw_payload,
                failure_stage=ctx.stages_failed[0],
                error_message=str(ctx.errors),
                supabase_client=supabase_client,
            )
    except Exception as exc:
        logger.exception("Pipeline crashed: %s", exc)
        await send_to_dead_letter(
            parsed_message=parsed_message,
            raw_payload=raw_payload,
            failure_stage="orchestrator",
            error_message=str(exc),
            supabase_client=supabase_client,
        )


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
            await process_webhook_message(message, payload, supabase_client)
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
