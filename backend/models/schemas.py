from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"


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


class BusinessCreate(BusinessProfileBase):
    pass


class BusinessUpdate(BusinessProfileUpdate):
    pass


class BusinessResponse(BusinessProfile):
    pass


class FAQCreate(BaseModel):
    business_id: str
    question: str = Field(min_length=1, max_length=300)
    answer: str = Field(min_length=1, max_length=1000)
    is_active: bool = True


class FAQUpdate(BaseModel):
    question: str | None = Field(default=None, min_length=1, max_length=300)
    answer: str | None = Field(default=None, min_length=1, max_length=1000)
    is_active: bool | None = None


class FAQResponse(BaseModel):
    id: str
    business_id: str
    question: str
    answer: str
    is_active: bool
    created_at: str
    updated_at: str


class KnowledgeBaseItemCreate(BaseModel):
    business_id: str
    category: str = Field(min_length=1)
    title: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=2000)
    tags: list[str] = Field(default_factory=list, max_length=10)
    is_active: bool = True


class KnowledgeBaseItemUpdate(BaseModel):
    category: str | None = None
    title: str | None = Field(default=None, min_length=1, max_length=100)
    content: str | None = Field(default=None, min_length=1, max_length=2000)
    tags: list[str] | None = Field(default=None, max_length=10)
    is_active: bool | None = None


class KnowledgeBaseItemResponse(BaseModel):
    id: str
    business_id: str
    category: str
    title: str
    content: str
    tags: list[str] = Field(default_factory=list)
    is_active: bool
    created_at: str
    updated_at: str


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    business_id: str
    direction: str
    content: str
    message_type: str
    wa_message_id: str | None = None
    sent_by_ai: bool
    created_at: str


class LeadResponse(BaseModel):
    id: str
    business_id: str
    customer_id: str | None = None
    inquiry_type: str | None = None
    summary: str | None = None
    status: str
    created_at: str


class AISettingsUpdate(BaseModel):
    is_enabled: bool | None = None
    tone: str | None = None
    language: str | None = None
    custom_instructions: str | None = None
    fallback_message: str | None = None


class AISettingsResponse(BaseModel):
    id: str
    business_id: str
    is_enabled: bool
    tone: str
    language: str
    custom_instructions: str | None = None
    fallback_message: str
    created_at: str


class WebhookVerificationResponse(BaseModel):
    status: str
    detail: str
