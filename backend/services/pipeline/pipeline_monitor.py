from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any

from utils.logger import get_logger


logger = get_logger(__name__)


@dataclass
class PipelineStats:
    total_processed: int = 0
    total_duplicates: int = 0
    total_skipped: int = 0
    total_errors: int = 0
    total_leads_detected: int = 0
    avg_duration_ms: float = 0.0
    last_processed_at: str | None = None


_stats = PipelineStats()


def _business_name(ctx: Any) -> str:
    return str((ctx.business or {}).get("name") or "unknown")


def _customer_number(ctx: Any) -> str:
    return str((ctx.customer or {}).get("whatsapp_number") or ctx.parsed_message.from_number)


def emit_pipeline_event(stage: str, status: str, ctx: Any, duration_ms: int | None = None) -> None:
    duration_text = f" | duration={duration_ms}ms" if duration_ms is not None else ""
    logger.info(
        "[PIPELINE] %s:%s | business=%s | customer=%s | msg_id=%s%s",
        stage,
        status,
        _business_name(ctx),
        _customer_number(ctx),
        ctx.parsed_message.wa_message_id,
        duration_text,
    )


async def log_pipeline_result(ctx: Any, duration_ms: int, supabase_client) -> None:
    _stats.total_processed += 1
    if ctx.is_duplicate:
        _stats.total_duplicates += 1
    if ctx.skip_ai or not ctx.should_respond:
        _stats.total_skipped += 1
    if ctx.errors:
        _stats.total_errors += 1
    if ctx.is_potential_lead:
        _stats.total_leads_detected += 1

    previous_count = max(0, _stats.total_processed - 1)
    _stats.avg_duration_ms = ((_stats.avg_duration_ms * previous_count) + duration_ms) / _stats.total_processed
    _stats.last_processed_at = datetime.now(timezone.utc).isoformat()

    try:
        supabase_client.table("webhook_logs").insert(
            {
                "phone_number_id": ctx.parsed_message.phone_number_id,
                "event_type": "message",
                "payload": {
                    "wa_message_id": ctx.parsed_message.wa_message_id,
                    "pipeline": {
                        "stages_completed": ctx.stages_completed,
                        "stages_failed": ctx.stages_failed,
                        "errors": ctx.errors,
                        "is_duplicate": ctx.is_duplicate,
                        "skip_ai": ctx.skip_ai,
                        "skip_reason": ctx.skip_reason,
                        "lead_signals": ctx.lead_signals,
                    },
                },
                "processed": not bool(ctx.stages_failed),
                "error_message": str(ctx.errors) if ctx.errors else None,
                "processing_duration_ms": duration_ms,
            }
        ).execute()
    except Exception:
        logger.exception("Pipeline result logging failed for msg_id=%s", ctx.parsed_message.wa_message_id)


def get_pipeline_stats() -> dict:
    return asdict(_stats)
