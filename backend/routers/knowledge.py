from fastapi import APIRouter, Depends, HTTPException, Query, status

from models.schemas import (
    FAQCreate,
    FAQResponse,
    FAQUpdate,
    KnowledgeBaseItemCreate,
    KnowledgeBaseItemResponse,
    KnowledgeBaseItemUpdate,
    InstructionsResponse,
    InstructionsUpdate,
)
from services.supabase import get_current_user_id, get_supabase

router = APIRouter()

ITEM_CATEGORIES = {"product", "service", "pricing", "policy", "delivery", "general"}
INSTRUCTION_COLUMNS = (
    "id,business_id,assistant_name,personality_description,conversation_opener,"
    "always_do_rules,never_do_rules,restricted_topics,redirect_message,"
    "escalation_keyword,escalation_situations,escalation_message,"
    "max_response_length,use_emojis,use_bullet_points,conversation_closer,"
    "after_hours_message,created_at,updated_at"
)


def _first_row(response: object) -> dict | None:
    data = getattr(response, "data", None)
    if isinstance(data, list):
        return data[0] if data else None
    if isinstance(data, dict):
        return data
    return None


def _raise_database_error(exc: Exception) -> None:
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Knowledge base database operation failed.",
    ) from exc


def _assert_business_access(business_id: str, user_id: str) -> None:
    supabase = get_supabase()

    try:
        response = (
            supabase.table("businesses")
            .select("id")
            .eq("id", business_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        _raise_database_error(exc)

    if not _first_row(response):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business profile not found.",
        )


def _get_owned_faq(faq_id: str, user_id: str) -> dict:
    supabase = get_supabase()

    try:
        response = (
            supabase.table("faqs")
            .select("id,business_id")
            .eq("id", faq_id)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        _raise_database_error(exc)

    faq = _first_row(response)
    if not faq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FAQ not found.")

    _assert_business_access(str(faq["business_id"]), user_id)
    return faq


def _normalize_item(item: dict) -> dict:
    item["tags"] = item.get("tags") or []
    return item


def _normalize_instructions(instructions: dict, ai_settings: dict | None = None) -> dict:
    instructions["always_do_rules"] = instructions.get("always_do_rules") or []
    instructions["never_do_rules"] = instructions.get("never_do_rules") or []
    instructions["restricted_topics"] = instructions.get("restricted_topics") or []
    instructions["escalation_situations"] = instructions.get("escalation_situations") or []
    instructions["response_language"] = (ai_settings or {}).get("language") or "english"
    instructions["ai_tone"] = (ai_settings or {}).get("tone") or "friendly"
    return instructions


def _get_ai_settings(business_id: str) -> dict | None:
    supabase = get_supabase()
    try:
        response = (
            supabase.table("ai_settings")
            .select("tone,language")
            .eq("business_id", business_id)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        _raise_database_error(exc)

    return _first_row(response)


def _get_or_create_instructions(business_id: str) -> dict:
    supabase = get_supabase()
    try:
        response = (
            supabase.table("business_instructions")
            .select(INSTRUCTION_COLUMNS)
            .eq("business_id", business_id)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        _raise_database_error(exc)

    existing = _first_row(response)
    if existing:
        return existing

    try:
        create_response = (
            supabase.table("business_instructions")
            .insert({"business_id": business_id})
            .execute()
        )
    except Exception as exc:
        _raise_database_error(exc)

    created = _first_row(create_response)
    if not created:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not create instructions.")

    return created


def _validate_item_category(category: str | None) -> None:
    if category is not None and category not in ITEM_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Must be one of: {', '.join(sorted(ITEM_CATEGORIES))}.",
        )


def _get_owned_item(item_id: str, user_id: str) -> dict:
    supabase = get_supabase()

    try:
        response = (
            supabase.table("knowledge_base_items")
            .select("id,business_id")
            .eq("id", item_id)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        _raise_database_error(exc)

    item = _first_row(response)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge base item not found.")

    _assert_business_access(str(item["business_id"]), user_id)
    return item


@router.get("")
async def knowledge_placeholder() -> dict[str, str]:
    return {"message": "coming soon"}


@router.get("/faqs", response_model=list[FAQResponse])
async def list_faqs(
    business_id: str = Query(...),
    active_only: bool = Query(False),
    user_id: str = Depends(get_current_user_id),
) -> list[dict]:
    _assert_business_access(business_id, user_id)
    supabase = get_supabase()

    try:
        query = (
            supabase.table("faqs")
            .select("id,business_id,question,answer,is_active,created_at,updated_at")
            .eq("business_id", business_id)
            .order("created_at", desc=True)
        )
        if active_only:
            query = query.eq("is_active", True)

        response = query.execute()
    except Exception as exc:
        _raise_database_error(exc)

    return response.data or []


@router.post("/faqs", response_model=FAQResponse, status_code=status.HTTP_201_CREATED)
async def create_faq(
    payload: FAQCreate,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    _assert_business_access(payload.business_id, user_id)
    supabase = get_supabase()

    try:
        response = (
            supabase.table("faqs")
            .insert(payload.model_dump())
            .execute()
        )
    except Exception as exc:
        _raise_database_error(exc)

    created = _first_row(response)
    if not created:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not create FAQ.")

    return created


@router.patch("/faqs/{faq_id}", response_model=FAQResponse)
async def update_faq(
    faq_id: str,
    payload: FAQUpdate,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    _get_owned_faq(faq_id, user_id)
    update_payload = payload.model_dump(exclude_unset=True)

    if not update_payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields provided.")

    supabase = get_supabase()
    try:
        response = (
            supabase.table("faqs")
            .update(update_payload)
            .eq("id", faq_id)
            .execute()
        )
    except Exception as exc:
        _raise_database_error(exc)

    updated = _first_row(response)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FAQ not found.")

    return updated


@router.delete("/faqs/{faq_id}")
async def delete_faq(
    faq_id: str,
    user_id: str = Depends(get_current_user_id),
) -> dict[str, bool]:
    _get_owned_faq(faq_id, user_id)
    supabase = get_supabase()

    try:
        response = supabase.table("faqs").delete().eq("id", faq_id).execute()
    except Exception as exc:
        _raise_database_error(exc)

    if not _first_row(response):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FAQ not found.")

    return {"success": True}


@router.get("/items", response_model=list[KnowledgeBaseItemResponse])
async def list_items(
    business_id: str = Query(...),
    category: str | None = Query(default=None),
    active_only: bool = Query(False),
    user_id: str = Depends(get_current_user_id),
) -> list[dict]:
    _validate_item_category(category)
    _assert_business_access(business_id, user_id)
    supabase = get_supabase()

    try:
        query = (
            supabase.table("knowledge_base_items")
            .select("id,business_id,category,title,content,tags,is_active,created_at,updated_at")
            .eq("business_id", business_id)
            .order("category")
            .order("created_at", desc=True)
        )
        if category:
            query = query.eq("category", category)
        if active_only:
            query = query.eq("is_active", True)

        response = query.execute()
    except Exception as exc:
        _raise_database_error(exc)

    return [_normalize_item(item) for item in (response.data or [])]


@router.post("/items", response_model=KnowledgeBaseItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    payload: KnowledgeBaseItemCreate,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    _validate_item_category(payload.category)
    _assert_business_access(payload.business_id, user_id)
    supabase = get_supabase()

    try:
        response = (
            supabase.table("knowledge_base_items")
            .insert(payload.model_dump())
            .execute()
        )
    except Exception as exc:
        _raise_database_error(exc)

    created = _first_row(response)
    if not created:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not create item.")

    return _normalize_item(created)


@router.patch("/items/{item_id}", response_model=KnowledgeBaseItemResponse)
async def update_item(
    item_id: str,
    payload: KnowledgeBaseItemUpdate,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    _get_owned_item(item_id, user_id)
    update_payload = payload.model_dump(exclude_unset=True)

    if not update_payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields provided.")

    _validate_item_category(update_payload.get("category"))
    supabase = get_supabase()

    try:
        response = (
            supabase.table("knowledge_base_items")
            .update(update_payload)
            .eq("id", item_id)
            .execute()
        )
    except Exception as exc:
        _raise_database_error(exc)

    updated = _first_row(response)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge base item not found.")

    return _normalize_item(updated)


@router.delete("/items/{item_id}")
async def delete_item(
    item_id: str,
    user_id: str = Depends(get_current_user_id),
) -> dict[str, bool]:
    _get_owned_item(item_id, user_id)
    supabase = get_supabase()

    try:
        response = supabase.table("knowledge_base_items").delete().eq("id", item_id).execute()
    except Exception as exc:
        _raise_database_error(exc)

    if not _first_row(response):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge base item not found.")

    return {"success": True}


@router.get("/instructions", response_model=InstructionsResponse)
async def get_instructions(
    business_id: str = Query(...),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    _assert_business_access(business_id, user_id)
    instructions = _get_or_create_instructions(business_id)
    ai_settings = _get_ai_settings(business_id)
    return _normalize_instructions(instructions, ai_settings)


@router.put("/instructions", response_model=InstructionsResponse)
async def save_instructions(
    payload: InstructionsUpdate,
    business_id: str = Query(...),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    _assert_business_access(business_id, user_id)
    update_payload = payload.model_dump(exclude_unset=True)
    response_language = update_payload.pop("response_language", None)
    supabase = get_supabase()

    instruction_payload = {"business_id": business_id, **update_payload}

    try:
        response = (
            supabase.table("business_instructions")
            .upsert(instruction_payload, on_conflict="business_id")
            .execute()
        )
    except Exception as exc:
        _raise_database_error(exc)

    saved = _first_row(response)
    if not saved:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not save instructions.")

    if response_language:
        try:
            supabase.table("ai_settings").upsert(
                {"business_id": business_id, "language": response_language.lower()},
                on_conflict="business_id",
            ).execute()
        except Exception as exc:
            _raise_database_error(exc)

    ai_settings = _get_ai_settings(business_id)
    return _normalize_instructions(saved, ai_settings)
