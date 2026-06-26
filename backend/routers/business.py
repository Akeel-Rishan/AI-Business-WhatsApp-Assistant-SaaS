from fastapi import APIRouter, Depends, HTTPException, status

from models.schemas import (
    BusinessProfile,
    BusinessProfileCreate,
    BusinessProfileUpdate,
)
from services.supabase import get_current_user_id, get_supabase

router = APIRouter()


@router.get("")
async def business_placeholder() -> dict[str, str]:
    return {"message": "coming soon"}


@router.get("/profile", response_model=BusinessProfile)
async def get_profile(user_id: str = Depends(get_current_user_id)) -> dict:
    supabase = get_supabase()
    response = (
        supabase.table("businesses")
        .select(
            "id,user_id,name,description,opening_hours,location,contact_info,"
            "whatsapp_number,whatsapp_phone_id,is_active,created_at,updated_at"
        )
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business profile not found.")

    return response.data


@router.post("/profile", response_model=BusinessProfile, status_code=status.HTTP_201_CREATED)
async def create_profile(
    payload: BusinessProfileCreate,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    supabase = get_supabase()
    insert_payload = payload.model_dump()
    insert_payload["user_id"] = user_id

    response = (
        supabase.table("businesses")
        .upsert(insert_payload, on_conflict="user_id")
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not save profile.")

    return response.data[0]


@router.patch("/profile", response_model=BusinessProfile)
async def update_profile(
    payload: BusinessProfileUpdate,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    supabase = get_supabase()
    update_payload = payload.model_dump(exclude_unset=True)

    if not update_payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields provided.")

    response = (
        supabase.table("businesses")
        .update(update_payload)
        .eq("user_id", user_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business profile not found.")

    return response.data[0]
