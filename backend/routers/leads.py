from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def leads_placeholder() -> dict[str, str]:
    return {"message": "coming soon"}
