import asyncio
from dataclasses import asdict
from datetime import datetime, timedelta, timezone

from services.supabase import get_supabase
from services.webhook_parser import ParsedMessage
from utils.logger import get_logger


logger = get_logger(__name__)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _next_retry_at(retry_count: int) -> str:
    delay_minutes = 2 ** max(0, retry_count)
    return (_utc_now() + timedelta(minutes=delay_minutes)).isoformat()


async def send_to_dead_letter(
    parsed_message: ParsedMessage,
    raw_payload: dict,
    failure_stage: str,
    error_message: str,
    supabase_client,
) -> None:
    try:
        existing = (
            supabase_client.table("dead_letter_messages")
            .select("*")
            .eq("wa_message_id", parsed_message.wa_message_id)
            .limit(1)
            .execute()
        )
        row = existing.data[0] if isinstance(existing.data, list) and existing.data else None
        if row:
            retry_count = int(row.get("retry_count") or 0) + 1
            resolved = retry_count >= int(row.get("max_retries") or 3)
            supabase_client.table("dead_letter_messages").update(
                {
                    "failure_stage": failure_stage,
                    "error_message": error_message,
                    "retry_count": retry_count,
                    "next_retry_at": None if resolved else _next_retry_at(retry_count),
                    "resolved": resolved,
                    "last_attempted_at": _utc_now().isoformat(),
                }
            ).eq("id", row["id"]).execute()
            return

        supabase_client.table("dead_letter_messages").insert(
            {
                "wa_message_id": parsed_message.wa_message_id,
                "phone_number_id": parsed_message.phone_number_id,
                "raw_payload": raw_payload,
                "parsed_message": asdict(parsed_message),
                "failure_stage": failure_stage,
                "error_message": error_message,
                "retry_count": 0,
                "max_retries": 3,
                "next_retry_at": _next_retry_at(0),
                "resolved": False,
                "last_attempted_at": _utc_now().isoformat(),
            }
        ).execute()
    except Exception:
        logger.exception("Dead-letter write failed for msg_id=%s", parsed_message.wa_message_id)


def _to_parsed_message(data: dict) -> ParsedMessage:
    return ParsedMessage(
        phone_number_id=str(data.get("phone_number_id") or ""),
        from_number=str(data.get("from_number") or ""),
        customer_name=str(data.get("customer_name") or ""),
        wa_message_id=str(data.get("wa_message_id") or ""),
        message_type=str(data.get("message_type") or "unknown"),
        text_content=data.get("text_content"),
        timestamp=int(data.get("timestamp") or 0),
    )


async def retry_dead_letter_messages() -> None:
    from services.pipeline.orchestrator import MessagePipeline

    supabase_client = get_supabase()
    response = (
        supabase_client.table("dead_letter_messages")
        .select("*")
        .eq("resolved", False)
        .limit(25)
        .execute()
    )
    now = _utc_now()
    due_rows = []
    for row in response.data or []:
        next_retry_at = row.get("next_retry_at")
        if not next_retry_at:
            continue
        try:
            due_at = datetime.fromisoformat(str(next_retry_at).replace("Z", "+00:00"))
            if due_at <= now and int(row.get("retry_count") or 0) < int(row.get("max_retries") or 3):
                due_rows.append(row)
        except ValueError:
            due_rows.append(row)

    for row in due_rows:
        parsed_data = row.get("parsed_message") or {}
        parsed_message = _to_parsed_message(parsed_data)
        pipeline = MessagePipeline(supabase_client, raw_payload=row.get("raw_payload") or {})
        ctx = await pipeline.run(parsed_message)
        if not ctx.stages_failed:
            supabase_client.table("dead_letter_messages").update(
                {"resolved": True, "last_attempted_at": _utc_now().isoformat()}
            ).eq("id", row["id"]).execute()
        else:
            retry_count = int(row.get("retry_count") or 0) + 1
            resolved = retry_count >= int(row.get("max_retries") or 3)
            supabase_client.table("dead_letter_messages").update(
                {
                    "retry_count": retry_count,
                    "failure_stage": ctx.stages_failed[0],
                    "error_message": str(ctx.errors),
                    "resolved": resolved,
                    "next_retry_at": None if resolved else _next_retry_at(retry_count),
                    "last_attempted_at": _utc_now().isoformat(),
                }
            ).eq("id", row["id"]).execute()


async def dead_letter_retry_worker(interval_seconds: int = 300) -> None:
    while True:
        try:
            await retry_dead_letter_messages()
        except Exception:
            logger.exception("Dead-letter retry worker failed.")
        await asyncio.sleep(interval_seconds)
