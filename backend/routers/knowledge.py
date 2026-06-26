from fastapi import APIRouter, Depends, HTTPException, Query, status

from models.schemas import FAQCreate, FAQResponse, FAQUpdate
from services.supabase import get_current_user_id, get_supabase

router = APIRouter()


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
