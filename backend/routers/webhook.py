import hashlib
import hmac
import os
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request, status
from fastapi.responses import PlainTextResponse

from services.pipeline.pipeline_monitor import get_pipeline_stats
from services.supabase import get_supabase
from services.webhook_logger import get_webhook_health, log_webhook_event
from services.webhook_processor import process_webhook_payload
from services.whatsapp_connection import verify_saved_token
from utils.logger import get_logger


logger = get_logger(__name__)
router = APIRouter()
STARTED_AT = datetime.now(timezone.utc)


def verify_whatsapp_signature(payload: bytes, signature: str | None, app_secret: str) -> bool:
    if not signature:
        return False

    expected = hmac.new(
        app_secret.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)


def _webhook_url(request: Request) -> str:
    configured_url = os.getenv("WEBHOOK_PUBLIC_URL") or os.getenv("BACKEND_PUBLIC_URL")
    if configured_url:
        return f"{configured_url.rstrip('/')}/api/v1/webhook/whatsapp"
    return str(request.url_for("receive_webhook"))


@router.get("")
async def webhook_root() -> dict[str, str]:
    return {"status": "ok", "detail": "WhatsApp webhook routes are available."}


@router.get("/whatsapp")
async def verify_webhook(
    hub_mode: str = Query(alias="hub.mode"),
    hub_verify_token: str = Query(alias="hub.verify_token"),
    hub_challenge: str = Query(alias="hub.challenge"),
) -> PlainTextResponse:
    expected_token = os.getenv("WEBHOOK_VERIFY_TOKEN")

    if hub_mode == "subscribe":
        global_match = bool(
            expected_token and hmac.compare_digest(hub_verify_token, expected_token)
        )
        try:
            business_match = verify_saved_token(hub_verify_token)
        except Exception:
            logger.exception("Could not check business webhook verify token.")
            business_match = False
        if global_match or business_match:
            return PlainTextResponse(hub_challenge, status_code=status.HTTP_200_OK)

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Verification failed. Invalid token.",
    )


@router.post("/whatsapp", name="receive_webhook")
async def receive_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
) -> dict[str, str]:
    app_secret = os.getenv("META_APP_SECRET") or os.getenv("WHATSAPP_APP_SECRET")
    if not app_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="META_APP_SECRET is not configured.",
        )

    payload_bytes = await request.body()
    signature = request.headers.get("X-Hub-Signature-256")

    if not verify_whatsapp_signature(payload_bytes, signature, app_secret):
        client_ip = request.client.host if request.client else "unknown"
        logger.warning("Invalid WhatsApp webhook signature from %s", client_ip)
        try:
            await log_webhook_event(
                phone_number_id=None,
                event_type="unknown",
                payload={"error": "invalid_signature", "client_ip": client_ip},
                processed=False,
                error_message="Invalid WhatsApp webhook signature.",
                duration_ms=0,
                supabase_client=get_supabase(),
            )
        except Exception:
            logger.exception("Could not log invalid webhook signature.")

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid webhook signature.",
        )

    try:
        payload = await request.json()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload.",
        ) from exc

    background_tasks.add_task(process_webhook_payload, payload)
    return {"status": "received"}


@router.get("/health")
async def webhook_health(request: Request) -> dict:
    return await get_webhook_health(_webhook_url(request), STARTED_AT)


@router.get("/pipeline-stats")
async def pipeline_stats() -> dict:
    return get_pipeline_stats()
