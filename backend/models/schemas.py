from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"


class BusinessProfileBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = None
    opening_hours: str | None = None
    location: str | None = None
    contact_info: str | None = None
    whatsapp_number: str | None = None


class BusinessProfileCreate(BusinessProfileBase):
    pass


class BusinessProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = None
    opening_hours: str | None = None
    location: str | None = None
    contact_info: str | None = None
    whatsapp_number: str | None = None
    is_active: bool | None = None


class BusinessProfile(BusinessProfileBase):
    id: str
    user_id: str
    whatsapp_phone_id: str | None = None
    is_active: bool
    created_at: str
    updated_at: str


class WebhookVerificationResponse(BaseModel):
    status: str
    detail: str
