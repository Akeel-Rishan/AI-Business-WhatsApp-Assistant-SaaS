export interface Business {
  id: string;
  user_id: string;
  name: string;
  business_type: string | null;
  description: string | null;
  opening_hours: string | null;
  timezone: string | null;
  after_hours_message: string | null;
  location: string | null;
  contact_info: string | null;
  website_url: string | null;
  whatsapp_number: string | null;
  whatsapp_phone_id: string | null;
  whatsapp_access_token: string | null;
  webhook_verify_token: string | null;
  is_active: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  whatsapp_number: string;
  name: string | null;
  email: string | null;
  notes: string | null;
  first_seen: string;
  last_seen: string;
  message_count: number;
  is_blocked: boolean;
}

export interface Conversation {
  id: string;
  business_id: string;
  customer_id: string;
  status: "active" | "closed" | "human_handoff";
  ai_enabled: boolean;
  started_at: string;
  last_message_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  business_id: string;
  direction: "inbound" | "outbound";
  content: string;
  message_type: "text" | "image" | "audio" | "document" | "template";
  wa_message_id: string | null;
  sent_by_ai: boolean;
  is_read: boolean;
  created_at: string;
}

export interface FAQ {
  id: string;
  business_id: string;
  question: string;
  answer: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FAQCreate {
  business_id: string;
  question: string;
  answer: string;
  is_active?: boolean;
}

export interface FAQUpdate {
  question?: string;
  answer?: string;
  is_active?: boolean;
}

export interface KnowledgeBaseItem {
  id: string;
  business_id: string;
  category: ItemCategory;
  title: string;
  content: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBaseItemCreate {
  business_id: string;
  category: string;
  title: string;
  content: string;
  tags?: string[];
  is_active?: boolean;
}

export interface KnowledgeBaseItemUpdate {
  category?: string;
  title?: string;
  content?: string;
  tags?: string[];
  is_active?: boolean;
}

export type ItemCategory =
  | "product"
  | "service"
  | "pricing"
  | "policy"
  | "delivery"
  | "general";

export interface Lead {
  id: string;
  business_id: string;
  customer_id: string;
  conversation_id: string | null;
  inquiry_type: string | null;
  summary: string | null;
  status: "new" | "contacted" | "converted" | "lost";
  priority: "low" | "medium" | "high";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AISettings {
  id: string;
  business_id: string;
  is_enabled: boolean;
  tone: "friendly" | "formal" | "casual" | "professional";
  language: string;
  custom_instructions: string | null;
  fallback_message: string;
  human_handoff_keyword: string;
  max_response_length: number;
  created_at: string;
  updated_at: string;
}
