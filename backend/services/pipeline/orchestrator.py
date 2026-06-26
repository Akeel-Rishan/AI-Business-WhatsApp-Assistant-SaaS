import time
from dataclasses import dataclass, field
from enum import Enum

from services.business_lookup import get_business_by_phone_id
from services.customer_service import upsert_customer
from services.pipeline.conversation_manager import find_or_create_conversation
from services.pipeline.lead_detector import create_lead_if_needed, detect_lead_signals
from services.pipeline.pipeline_monitor import emit_pipeline_event, log_pipeline_result
from services.pipeline.rules_checker import check_business_rules
from services.webhook_parser import ParsedMessage
from utils.logger import get_logger


logger = get_logger(__name__)

_dedup_cache: dict[str, float] = {}


class PipelineStage(Enum):
    DEDUPLICATION = "deduplication"
    BUSINESS_LOOKUP = "business_lookup"
    CUSTOMER_UPSERT = "customer_upsert"
    CONVERSATION_MANAGEMENT = "conversation_management"
    MESSAGE_STORAGE = "message_storage"
    BUSINESS_RULES = "business_rules"
    LEAD_DETECTION = "lead_detection"
    AI_TRIGGER = "ai_trigger"


@dataclass
class PipelineContext:
    parsed_message: ParsedMessage
    business: dict | None = None
    customer: dict | None = None
    conversation: dict | None = None
    stored_message: dict | None = None
    ai_settings: dict | None = None
    instructions: dict | None = None
    is_duplicate: bool = False
    should_respond: bool = True
    skip_ai: bool = False
    skip_reason: str | None = None
    override_response: str | None = None
    is_potential_lead: bool = False
    lead_signals: list[str] = field(default_factory=list)
    stages_completed: list[str] = field(default_factory=list)
    stages_failed: list[str] = field(default_factory=list)
    errors: dict[str, str] = field(default_factory=dict)
    started_at: float = field(default_factory=time.time)


def _clean_dedup_cache() -> None:
    now = time.time()
    expired = [key for key, value in _dedup_cache.items() if now - value > 300]
    for key in expired:
        del _dedup_cache[key]


def is_recently_seen(wa_message_id: str) -> bool:
    now = time.time()
    seen_at = _dedup_cache.get(wa_message_id)
    if seen_at and now - seen_at < 60:
        return True
    _dedup_cache[wa_message_id] = now
    _clean_dedup_cache()
    return False


class MessagePipeline:
    def __init__(self, supabase_client, raw_payload: dict | None = None):
        self.supabase = supabase_client
        self.raw_payload = raw_payload or {}
        self.stages = [
            self._stage_deduplicate,
            self._stage_lookup_business,
            self._stage_upsert_customer,
            self._stage_manage_conversation,
            self._stage_store_message,
            self._stage_check_business_rules,
            self._stage_detect_lead,
            self._stage_trigger_ai,
        ]
        self.stage_names = {
            self._stage_deduplicate.__name__: PipelineStage.DEDUPLICATION.value,
            self._stage_lookup_business.__name__: PipelineStage.BUSINESS_LOOKUP.value,
            self._stage_upsert_customer.__name__: PipelineStage.CUSTOMER_UPSERT.value,
            self._stage_manage_conversation.__name__: PipelineStage.CONVERSATION_MANAGEMENT.value,
            self._stage_store_message.__name__: PipelineStage.MESSAGE_STORAGE.value,
            self._stage_check_business_rules.__name__: PipelineStage.BUSINESS_RULES.value,
            self._stage_detect_lead.__name__: PipelineStage.LEAD_DETECTION.value,
            self._stage_trigger_ai.__name__: PipelineStage.AI_TRIGGER.value,
        }
        self.critical_stages = {
            PipelineStage.BUSINESS_LOOKUP.value,
            PipelineStage.CUSTOMER_UPSERT.value,
            PipelineStage.CONVERSATION_MANAGEMENT.value,
            PipelineStage.MESSAGE_STORAGE.value,
        }

    async def run(self, parsed_message: ParsedMessage) -> PipelineContext:
        ctx = PipelineContext(parsed_message=parsed_message)

        for stage_fn in self.stages:
            stage_name = self.stage_names[stage_fn.__name__]
            stage_started = time.time()
            try:
                emit_pipeline_event(stage_name, "start", ctx)
                ctx = await stage_fn(ctx)
                ctx.stages_completed.append(stage_name)
                emit_pipeline_event(stage_name, "success", ctx, int((time.time() - stage_started) * 1000))

                if ctx.is_duplicate:
                    break
                if stage_name == PipelineStage.BUSINESS_LOOKUP.value and not ctx.business:
                    break
            except Exception as exc:
                ctx.stages_failed.append(stage_name)
                ctx.errors[stage_name] = str(exc)
                emit_pipeline_event(stage_name, "failed", ctx, int((time.time() - stage_started) * 1000))
                logger.exception("Pipeline stage %s failed: %s", stage_name, exc)
                if stage_name in self.critical_stages:
                    break

        await self._finalize(ctx)
        return ctx

    async def _finalize(self, ctx: PipelineContext) -> None:
        duration_ms = int((time.time() - ctx.started_at) * 1000)
        await log_pipeline_result(ctx, duration_ms, self.supabase)

    async def _stage_deduplicate(self, ctx: PipelineContext) -> PipelineContext:
        if is_recently_seen(ctx.parsed_message.wa_message_id):
            ctx.is_duplicate = True
            logger.info("Duplicate skipped from in-memory cache: %s", ctx.parsed_message.wa_message_id)
            return ctx

        response = (
            self.supabase.table("messages")
            .select("id,wa_message_id")
            .eq("wa_message_id", ctx.parsed_message.wa_message_id)
            .limit(1)
            .execute()
        )
        if response.data:
            ctx.is_duplicate = True
            logger.info("Duplicate skipped from database: %s", ctx.parsed_message.wa_message_id)
        return ctx

    async def _stage_lookup_business(self, ctx: PipelineContext) -> PipelineContext:
        business = await get_business_by_phone_id(ctx.parsed_message.phone_number_id, self.supabase)
        if not business:
            return ctx

        ctx.business = business
        business_id = str(business["id"])

        ai_response = (
            self.supabase.table("ai_settings")
            .select("*")
            .eq("business_id", business_id)
            .limit(1)
            .execute()
        )
        ctx.ai_settings = ai_response.data[0] if ai_response.data else {"is_enabled": True}

        instructions_response = (
            self.supabase.table("business_instructions")
            .select("*")
            .eq("business_id", business_id)
            .limit(1)
            .execute()
        )
        ctx.instructions = instructions_response.data[0] if instructions_response.data else {}
        return ctx

    async def _stage_upsert_customer(self, ctx: PipelineContext) -> PipelineContext:
        if not ctx.business:
            return ctx
        ctx.customer = await upsert_customer(
            business_id=str(ctx.business["id"]),
            whatsapp_number=ctx.parsed_message.from_number,
            name=ctx.parsed_message.customer_name or None,
            supabase_client=self.supabase,
        )
        if ctx.customer.get("is_blocked"):
            ctx.skip_ai = True
            ctx.skip_reason = "customer_blocked"
        return ctx

    async def _stage_manage_conversation(self, ctx: PipelineContext) -> PipelineContext:
        if not ctx.business or not ctx.customer:
            return ctx
        ctx.conversation = await find_or_create_conversation(
            business_id=str(ctx.business["id"]),
            customer_id=str(ctx.customer["id"]),
            supabase_client=self.supabase,
        )
        if ctx.conversation.get("ai_enabled") is False:
            ctx.skip_ai = True
            ctx.skip_reason = "ai_disabled_for_conversation"
        return ctx

    async def _stage_store_message(self, ctx: PipelineContext) -> PipelineContext:
        if not ctx.business or not ctx.conversation:
            return ctx

        message_type = ctx.parsed_message.message_type
        if message_type == "text":
            content = ctx.parsed_message.text_content or ""
            stored_type = "text"
        elif message_type == "image":
            content = "[Image received]"
            stored_type = "image"
        elif message_type == "audio":
            content = "[Voice message received]"
            stored_type = "audio"
        elif message_type == "document":
            content = "[Document received]"
            stored_type = "document"
        else:
            content = f"[{message_type} received]"
            stored_type = "other"

        created = (
            self.supabase.table("messages")
            .insert(
                {
                    "conversation_id": ctx.conversation["id"],
                    "business_id": ctx.business["id"],
                    "direction": "inbound",
                    "content": content,
                    "message_type": stored_type,
                    "wa_message_id": ctx.parsed_message.wa_message_id,
                    "sent_by_ai": False,
                    "is_read": False,
                }
            )
            .execute()
        )
        ctx.stored_message = created.data[0]
        return ctx

    async def _stage_check_business_rules(self, ctx: PipelineContext) -> PipelineContext:
        result = await check_business_rules(ctx, self.supabase)
        ctx.should_respond = result.should_respond
        ctx.skip_ai = result.skip_ai
        ctx.skip_reason = result.skip_reason
        ctx.override_response = result.response_override
        return ctx

    async def _stage_detect_lead(self, ctx: PipelineContext) -> PipelineContext:
        if not ctx.business or not ctx.customer or not ctx.conversation:
            return ctx

        message_text = ctx.parsed_message.text_content or ""
        is_lead, signals = await detect_lead_signals(message_text, ctx.customer, ctx.business)
        ctx.is_potential_lead = is_lead
        ctx.lead_signals = signals

        if is_lead:
            await create_lead_if_needed(
                business_id=str(ctx.business["id"]),
                customer_id=str(ctx.customer["id"]),
                conversation_id=str(ctx.conversation["id"]),
                message_text=message_text,
                signals=signals,
                supabase_client=self.supabase,
            )
        return ctx

    async def _stage_trigger_ai(self, ctx: PipelineContext) -> PipelineContext:
        if ctx.skip_ai and ctx.override_response:
            logger.info("Sent rule-based response placeholder: %s", ctx.skip_reason)
            return ctx
        if ctx.skip_ai:
            logger.info("Skipping AI response. Reason: %s", ctx.skip_reason)
            return ctx

        logger.info("AI trigger placeholder - Phase 4 will handle this")
        # TODO: Phase 4 - call AI response service here.
        return ctx
