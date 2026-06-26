import time
from typing import Any

from utils.logger import get_logger

logger = get_logger(__name__)

CACHE_DURATION = 300
_business_cache: dict[str, dict[str, Any]] = {}
_cache_ttl: dict[str, float] = {}


def clear_business_cache(phone_number_id: str | None = None) -> None:
    if phone_number_id:
        _business_cache.pop(phone_number_id, None)
        _cache_ttl.pop(phone_number_id, None)
        return

    _business_cache.clear()
    _cache_ttl.clear()


async def get_business_by_phone_id(phone_number_id: str, supabase_client) -> dict | None:
    now = time.time()
    cached = _business_cache.get(phone_number_id)
    if cached and _cache_ttl.get(phone_number_id, 0) > now:
        return cached

    try:
        response = (
            supabase_client.table("businesses")
            .select("*")
            .eq("whatsapp_phone_id", phone_number_id)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )
        business = response.data[0] if isinstance(response.data, list) and response.data else None
        if not business:
            logger.warning("Received message for unknown phone_number_id: %s", phone_number_id)
            return None
    except Exception:
        logger.exception("Business lookup failed for phone_number_id: %s", phone_number_id)
        raise

    _business_cache[phone_number_id] = business
    _cache_ttl[phone_number_id] = now + CACHE_DURATION
    return business
