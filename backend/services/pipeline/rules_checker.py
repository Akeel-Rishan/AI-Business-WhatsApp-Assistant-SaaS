import re
from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo

from utils.logger import get_logger


logger = get_logger(__name__)


@dataclass
class RulesCheckResult:
    should_respond: bool
    skip_ai: bool
    skip_reason: str | None
    response_override: str | None = None


NON_TEXT_RESPONSE = (
    "Thanks for your message! I can only respond to text messages right now. "
    "Please type your question and I'll be happy to help!"
)


def _is_enabled(ai_settings: dict | None) -> bool:
    if not ai_settings:
        return True
    return bool(ai_settings.get("is_enabled", True))


def _safe_text(value: object) -> str:
    return str(value or "").strip()


def _current_business_time(business: dict) -> datetime:
    timezone_name = business.get("timezone") or "UTC"
    try:
        return datetime.now(ZoneInfo(str(timezone_name)))
    except Exception:
        return datetime.now(ZoneInfo("UTC"))


def _parse_time(value: str, current: datetime) -> datetime | None:
    value = value.strip().upper().replace(".", "")
    formats = ["%I:%M %p", "%I %p", "%H:%M"]
    for time_format in formats:
        try:
            parsed = datetime.strptime(value, time_format)
            return current.replace(hour=parsed.hour, minute=parsed.minute, second=0, microsecond=0)
        except ValueError:
            continue
    return None


def _is_after_hours(business: dict) -> bool:
    opening_hours = _safe_text(business.get("opening_hours"))
    if not opening_hours:
        return False

    current = _current_business_time(business)
    pattern = re.compile(
        r"(?P<start>\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\s*[-–]\s*(?P<end>\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)"
    )
    match = pattern.search(opening_hours)
    if not match:
        return False

    start = _parse_time(match.group("start"), current)
    end = _parse_time(match.group("end"), current)
    if not start or not end:
        return False

    if end <= start:
        return not (current >= start or current <= end)
    return not (start <= current <= end)


async def check_business_rules(ctx, supabase_client) -> RulesCheckResult:
    try:
        if not _is_enabled(ctx.ai_settings):
            return RulesCheckResult(False, True, "ai_globally_disabled")

        if ctx.customer and ctx.customer.get("is_blocked"):
            return RulesCheckResult(False, True, "customer_blocked")

        if ctx.conversation and ctx.conversation.get("status") == "human_handoff":
            return RulesCheckResult(False, True, "conversation_in_handoff")

        if ctx.parsed_message.message_type != "text":
            return RulesCheckResult(True, True, "non_text_message", NON_TEXT_RESPONSE)

        message_text = _safe_text(ctx.parsed_message.text_content).lower()
        escalation_keyword = _safe_text((ctx.instructions or {}).get("escalation_keyword")) or "human"
        if escalation_keyword.lower() in message_text:
            if ctx.conversation:
                supabase_client.table("conversations").update({"status": "human_handoff"}).eq("id", ctx.conversation["id"]).execute()
                ctx.conversation["status"] = "human_handoff"
            return RulesCheckResult(
                True,
                True,
                "human_handoff_requested",
                _safe_text((ctx.instructions or {}).get("escalation_message"))
                or "I'm connecting you with our team right away. Please hold on!",
            )

        after_hours_message = _safe_text((ctx.instructions or {}).get("after_hours_message"))
        if after_hours_message and _is_after_hours(ctx.business or {}):
            return RulesCheckResult(
                True,
                True,
                "after_hours",
                after_hours_message.replace("[opening_hours]", _safe_text((ctx.business or {}).get("opening_hours"))),
            )

        return RulesCheckResult(True, False, None)
    except Exception:
        logger.exception("Business rules check failed for msg_id=%s", ctx.parsed_message.wa_message_id)
        raise
