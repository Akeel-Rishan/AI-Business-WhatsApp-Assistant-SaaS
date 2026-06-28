import os
from typing import Any

import httpx
import psycopg
from psycopg.rows import dict_row

from services.business_lookup import clear_business_cache
from services.supabase import get_database_url, get_supabase
from utils.logger import get_logger


logger = get_logger(__name__)


class WhatsAppConnectionNotFoundError(Exception):
    pass


def _owned_business(business_id: str, user_id: str, columns: str = "*") -> dict[str, Any]:
    response = (
        get_supabase()
        .table("businesses")
        .select(columns)
        .eq("id", business_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise WhatsAppConnectionNotFoundError("Business profile not found.")
    return response.data[0]


def _phone_preview(phone_number_id: str | None) -> str | None:
    if not phone_number_id:
        return None
    return phone_number_id[-6:]


def get_connection_status(business_id: str, user_id: str) -> dict[str, Any]:
    business = _owned_business(
        business_id,
        user_id,
        "id,whatsapp_number,whatsapp_phone_id,whatsapp_access_token,updated_at",
    )
    settings = (
        get_supabase()
        .table("ai_settings")
        .select("is_enabled")
        .eq("business_id", business_id)
        .limit(1)
        .execute()
    )
    connected = bool(business.get("whatsapp_phone_id") and business.get("whatsapp_access_token"))
    return {
        "is_connected": connected,
        "whatsapp_number": business.get("whatsapp_number"),
        "phone_number_id_preview": _phone_preview(business.get("whatsapp_phone_id")),
        "ai_enabled": bool(settings.data[0].get("is_enabled", False)) if settings.data else False,
        "connected_since": business.get("updated_at") if connected else None,
    }


def save_credentials(payload: dict[str, Any], user_id: str) -> dict[str, Any]:
    business = _owned_business(payload["business_id"], user_id, "id,whatsapp_phone_id")
    old_phone_id = business.get("whatsapp_phone_id")
    response = (
        get_supabase()
        .table("businesses")
        .update(
            {
                "whatsapp_number": payload["whatsapp_number"],
                "whatsapp_phone_id": payload["whatsapp_phone_id"],
                "whatsapp_access_token": payload["whatsapp_access_token"],
                "webhook_verify_token": payload["webhook_verify_token"],
            }
        )
        .eq("id", payload["business_id"])
        .eq("user_id", user_id)
        .execute()
    )
    if not response.data:
        raise WhatsAppConnectionNotFoundError("Business profile not found.")

    clear_business_cache(old_phone_id)
    clear_business_cache(payload["whatsapp_phone_id"])
    updated = response.data[0]
    return {
        "business_id": str(updated["id"]),
        "whatsapp_number": updated["whatsapp_number"],
        "phone_number_id_preview": _phone_preview(updated["whatsapp_phone_id"]),
        "connected_since": updated["updated_at"],
    }


async def test_connection(business_id: str, user_id: str) -> dict[str, Any]:
    business = _owned_business(
        business_id,
        user_id,
        "id,whatsapp_number,whatsapp_phone_id,whatsapp_access_token,webhook_verify_token",
    )
    required = {
        "whatsapp_number": business.get("whatsapp_number"),
        "whatsapp_phone_id": business.get("whatsapp_phone_id"),
        "whatsapp_access_token": business.get("whatsapp_access_token"),
        "webhook_verify_token": business.get("webhook_verify_token"),
    }
    missing = [name for name, value in required.items() if not value]
    if missing:
        return {
            "credentials_saved": False,
            "meta_api_reachable": False,
            "phone_number_valid": False,
            "verified_name": None,
            "phone_number": business.get("whatsapp_number"),
            "errors": {"credentials": f"Missing required credentials: {', '.join(missing)}"},
            "overall_success": False,
        }

    api_base = os.getenv("WHATSAPP_API_URL", "https://graph.facebook.com").rstrip("/")
    api_version = os.getenv("META_API_VERSION", "v19.0").strip("/")
    url = f"{api_base}/{api_version}/{business['whatsapp_phone_id']}"

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                url,
                params={"fields": "id,verified_name,display_phone_number"},
                headers={"Authorization": f"Bearer {business['whatsapp_access_token']}"},
            )
    except httpx.RequestError:
        logger.exception("Could not reach Meta API for business_id=%s", business_id)
        return {
            "credentials_saved": True,
            "meta_api_reachable": False,
            "phone_number_valid": False,
            "verified_name": None,
            "phone_number": business.get("whatsapp_number"),
            "errors": {"meta_api": "Could not reach Meta API."},
            "overall_success": False,
        }

    if response.is_success:
        data = response.json()
        verified_name = data.get("verified_name")
        valid = bool(data.get("id") and verified_name)
        errors = {} if valid else {"phone_number": "Meta did not return a verified WhatsApp business number."}
        return {
            "credentials_saved": True,
            "meta_api_reachable": True,
            "phone_number_valid": valid,
            "verified_name": verified_name,
            "phone_number": data.get("display_phone_number") or business.get("whatsapp_number"),
            "errors": errors,
            "overall_success": valid,
        }

    try:
        error_payload = response.json().get("error", {})
    except ValueError:
        error_payload = {}
    error_code = error_payload.get("code")
    if response.status_code == 401 or error_code == 190:
        message = "Access token expired or invalid."
        key = "access_token"
    elif response.status_code == 404 or error_code in {100, 803}:
        message = "Phone Number ID was not found."
        key = "phone_number"
    else:
        message = error_payload.get("message") or f"Meta API returned HTTP {response.status_code}."
        key = "meta_api"

    return {
        "credentials_saved": True,
        "meta_api_reachable": response.status_code < 500,
        "phone_number_valid": False,
        "verified_name": None,
        "phone_number": business.get("whatsapp_number"),
        "errors": {key: message},
        "overall_success": False,
    }


def disconnect(business_id: str, user_id: str) -> None:
    with psycopg.connect(get_database_url(), row_factory=dict_row) as connection:
        with connection.transaction():
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    update businesses
                    set whatsapp_phone_id = null,
                        whatsapp_access_token = null,
                        webhook_verify_token = null,
                        updated_at = now()
                    where id = %s and user_id = %s
                    returning whatsapp_phone_id
                    """,
                    (business_id, user_id),
                )
                row = cursor.fetchone()
                if not row:
                    raise WhatsAppConnectionNotFoundError("Business profile not found.")
                cursor.execute(
                    """
                    insert into ai_settings (business_id, is_enabled)
                    values (%s, false)
                    on conflict (business_id)
                    do update set is_enabled = false, updated_at = now()
                    """,
                    (business_id,),
                )
    clear_business_cache()


def set_ai_enabled(business_id: str, user_id: str, is_enabled: bool) -> bool:
    _owned_business(business_id, user_id, "id")
    response = (
        get_supabase()
        .table("ai_settings")
        .upsert({"business_id": business_id, "is_enabled": is_enabled}, on_conflict="business_id")
        .execute()
    )
    return bool(response.data and response.data[0].get("is_enabled"))


def verify_saved_token(token: str) -> bool:
    response = (
        get_supabase()
        .table("businesses")
        .select("id")
        .eq("webhook_verify_token", token)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    return bool(response.data)
