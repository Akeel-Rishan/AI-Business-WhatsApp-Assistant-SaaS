from fastapi import APIRouter, Query

router = APIRouter()


@router.get("")
async def webhook_placeholder() -> dict[str, str]:
    return {"message": "coming soon"}


@router.get("/whatsapp")
async def verify_whatsapp_webhook(
    hub_mode: str | None = Query(default=None, alias="hub.mode"),
    hub_challenge: str | None = Query(default=None, alias="hub.challenge"),
    hub_verify_token: str | None = Query(default=None, alias="hub.verify_token"),
) -> dict[str, str] | str:
    if hub_mode == "subscribe" and hub_challenge and hub_verify_token:
        return hub_challenge

    return {
        "status": "ok",
        "detail": "WhatsApp webhook endpoint is ready for verification.",
    }


@router.post("/whatsapp")
async def receive_whatsapp_webhook(payload: dict) -> dict[str, str]:
    return {
        "status": "received",
        "detail": "Message processing will be connected when WhatsApp credentials are configured.",
    }
