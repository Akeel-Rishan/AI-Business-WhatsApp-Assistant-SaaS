from fastapi import APIRouter, Depends, HTTPException, Query, status

from models.schemas import (
    AIEnabledInput,
    ConnectionTestInput,
    ConnectionTestResult,
    WhatsAppCredentialsInput,
    WhatsAppCredentialsResponse,
    WhatsAppStatus,
)
from services.supabase import get_current_user_id
from services.whatsapp_connection import (
    WhatsAppConnectionNotFoundError,
    disconnect,
    get_connection_status,
    save_credentials,
    set_ai_enabled,
    test_connection,
)
from utils.logger import get_logger


logger = get_logger(__name__)
router = APIRouter()


def _not_found(exc: WhatsAppConnectionNotFoundError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/status", response_model=WhatsAppStatus)
async def connection_status(
    business_id: str = Query(min_length=1),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    try:
        return get_connection_status(business_id, user_id)
    except WhatsAppConnectionNotFoundError as exc:
        raise _not_found(exc) from exc


@router.post("/credentials", response_model=WhatsAppCredentialsResponse)
async def create_credentials(
    payload: WhatsAppCredentialsInput,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    try:
        return save_credentials(payload.model_dump(), user_id)
    except WhatsAppConnectionNotFoundError as exc:
        raise _not_found(exc) from exc


@router.post("/test-connection", response_model=ConnectionTestResult)
async def run_connection_test(
    payload: ConnectionTestInput,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    try:
        return await test_connection(payload.business_id, user_id)
    except WhatsAppConnectionNotFoundError as exc:
        raise _not_found(exc) from exc


@router.delete("/credentials")
async def delete_credentials(
    business_id: str = Query(min_length=1),
    user_id: str = Depends(get_current_user_id),
) -> dict[str, bool]:
    try:
        disconnect(business_id, user_id)
    except WhatsAppConnectionNotFoundError as exc:
        raise _not_found(exc) from exc
    return {"success": True}


@router.patch("/ai-enabled")
async def update_ai_enabled(
    payload: AIEnabledInput,
    user_id: str = Depends(get_current_user_id),
) -> dict[str, bool]:
    try:
        enabled = set_ai_enabled(payload.business_id, user_id, payload.is_enabled)
    except WhatsAppConnectionNotFoundError as exc:
        raise _not_found(exc) from exc
    return {"is_enabled": enabled}
