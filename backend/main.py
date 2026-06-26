import os
import asyncio
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import auth, business, health, knowledge, leads, messages, webhook
from services.pipeline.dead_letter import dead_letter_retry_worker

BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env")

def _load_non_empty_env(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        if value.strip():
            os.environ[key.strip()] = value.strip().strip('"').strip("'")


_load_non_empty_env(BACKEND_DIR / ".env")

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
allowed_origins = [origin.strip() for origin in f"http://localhost:3000,{frontend_url}".split(",") if origin.strip()]

app = FastAPI(
    title="WA Assistant API",
    description="Backend API for the AI Business WhatsApp Assistant SaaS platform.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(set(allowed_origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event() -> None:
    print("WA Assistant API is running")
    asyncio.create_task(dead_letter_retry_worker())


app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(business.router, prefix="/api/v1/business", tags=["business"])
app.include_router(webhook.router, prefix="/api/v1/webhook", tags=["webhook"])
app.include_router(knowledge.router, prefix="/api/v1/knowledge", tags=["knowledge"])
app.include_router(messages.router, prefix="/api/v1/messages", tags=["messages"])
app.include_router(leads.router, prefix="/api/v1/leads", tags=["leads"])
