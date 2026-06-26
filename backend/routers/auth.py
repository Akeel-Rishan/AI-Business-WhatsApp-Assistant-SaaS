from fastapi import APIRouter

router = APIRouter()


@router.get("/session")
async def session_placeholder() -> dict[str, str]:
    return {
        "status": "ok",
        "detail": "Authentication is handled by Supabase Auth on the frontend.",
    }
