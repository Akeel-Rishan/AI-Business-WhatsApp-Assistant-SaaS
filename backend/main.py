import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import auth, business, health, webhook

load_dotenv()

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

app = FastAPI(
    title="WA Assistant API",
    description="Backend API for the AI Business WhatsApp Assistant SaaS platform.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(business.router, prefix="/business", tags=["business"])
app.include_router(webhook.router, prefix="/webhook", tags=["webhook"])
