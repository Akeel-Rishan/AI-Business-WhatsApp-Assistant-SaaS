-- WA Assistant initial database schema
-- Run this file directly in the Supabase SQL editor.

-- =====================================================
-- Extensions
-- =====================================================

create extension if not exists pgcrypto;

-- =====================================================
-- Tables
-- =====================================================

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  name text not null,
  description text,
  opening_hours text,
  location text,
  contact_info text,
  whatsapp_number text,
  whatsapp_phone_id text,
  whatsapp_access_token text,
  webhook_verify_token text,
  is_active boolean default true,
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  whatsapp_number text not null,
  name text,
  email text,
  notes text,
  first_seen timestamptz default now(),
  last_seen timestamptz default now(),
  message_count integer default 0,
  is_blocked boolean default false,
  unique (business_id, whatsapp_number)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  customer_id uuid references public.customers(id) on delete cascade not null,
  status text default 'active' check (status in ('active', 'closed', 'human_handoff')),
  ai_enabled boolean default true,
  started_at timestamptz default now(),
  last_message_at timestamptz default now(),
  unique (business_id, customer_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  business_id uuid references public.businesses(id) on delete cascade not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  content text not null,
  message_type text default 'text' check (message_type in ('text', 'image', 'audio', 'document', 'template')),
  wa_message_id text,
  sent_by_ai boolean default false,
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  question text not null,
  answer text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.knowledge_base_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  category text default 'general' check (category in ('product', 'service', 'policy', 'general', 'pricing', 'delivery')),
  title text not null,
  content text not null,
  tags text[],
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  customer_id uuid references public.customers(id) on delete cascade not null,
  conversation_id uuid references public.conversations(id) on delete cascade,
  inquiry_type text,
  summary text,
  status text default 'new' check (status in ('new', 'contacted', 'converted', 'lost')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.ai_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade unique not null,
  is_enabled boolean default true,
  tone text default 'friendly' check (tone in ('friendly', 'formal', 'casual', 'professional')),
  language text default 'english',
  custom_instructions text,
  fallback_message text default 'Thank you for your message. Our team will get back to you shortly.',
  human_handoff_keyword text default 'human',
  max_response_length integer default 500,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================================================
-- Indexes
-- =====================================================

create index if not exists idx_businesses_user_id on public.businesses(user_id);

create index if not exists idx_customers_business_id on public.customers(business_id);
create index if not exists idx_customers_whatsapp_number on public.customers(whatsapp_number);
create index if not exists idx_customers_business_id_whatsapp_number on public.customers(business_id, whatsapp_number);

create index if not exists idx_conversations_business_id on public.conversations(business_id);
create index if not exists idx_conversations_customer_id on public.conversations(customer_id);
create index if not exists idx_conversations_status on public.conversations(status);
create index if not exists idx_conversations_last_message_at on public.conversations(last_message_at);

create index if not exists idx_messages_conversation_id on public.messages(conversation_id);
create index if not exists idx_messages_business_id on public.messages(business_id);
create index if not exists idx_messages_direction on public.messages(direction);
create index if not exists idx_messages_created_at on public.messages(created_at);

create index if not exists idx_faqs_business_id on public.faqs(business_id);
create index if not exists idx_faqs_is_active on public.faqs(is_active);

create index if not exists idx_knowledge_base_items_business_id on public.knowledge_base_items(business_id);
create index if not exists idx_knowledge_base_items_category on public.knowledge_base_items(category);
create index if not exists idx_knowledge_base_items_is_active on public.knowledge_base_items(is_active);

create index if not exists idx_leads_business_id on public.leads(business_id);
create index if not exists idx_leads_customer_id on public.leads(customer_id);
create index if not exists idx_leads_status on public.leads(status);

create index if not exists idx_ai_settings_business_id on public.ai_settings(business_id);

-- =====================================================
-- Trigger Functions
-- =====================================================

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.create_default_ai_settings()
returns trigger
language plpgsql
as $$
begin
  insert into public.ai_settings (business_id)
  values (new.id)
  on conflict (business_id) do nothing;

  return new;
end;
$$;

create or replace function public.update_conversation_last_message_at()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
  set last_message_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

create or replace function public.update_customer_message_stats()
returns trigger
language plpgsql
as $$
declare
  target_customer_id uuid;
begin
  if new.direction = 'inbound' then
    select customer_id
    into target_customer_id
    from public.conversations
    where id = new.conversation_id;

    update public.customers
    set
      message_count = coalesce(message_count, 0) + 1,
      last_seen = now()
    where id = target_customer_id;
  end if;

  return new;
end;
$$;

-- =====================================================
-- Triggers
-- =====================================================

drop trigger if exists update_businesses_updated_at on public.businesses;
create trigger update_businesses_updated_at
before update on public.businesses
for each row
execute function public.update_updated_at_column();

drop trigger if exists update_faqs_updated_at on public.faqs;
create trigger update_faqs_updated_at
before update on public.faqs
for each row
execute function public.update_updated_at_column();

drop trigger if exists update_knowledge_base_items_updated_at on public.knowledge_base_items;
create trigger update_knowledge_base_items_updated_at
before update on public.knowledge_base_items
for each row
execute function public.update_updated_at_column();

drop trigger if exists update_leads_updated_at on public.leads;
create trigger update_leads_updated_at
before update on public.leads
for each row
execute function public.update_updated_at_column();

drop trigger if exists update_ai_settings_updated_at on public.ai_settings;
create trigger update_ai_settings_updated_at
before update on public.ai_settings
for each row
execute function public.update_updated_at_column();

drop trigger if exists create_business_ai_settings on public.businesses;
create trigger create_business_ai_settings
after insert on public.businesses
for each row
execute function public.create_default_ai_settings();

drop trigger if exists update_message_conversation_last_message_at on public.messages;
create trigger update_message_conversation_last_message_at
after insert on public.messages
for each row
execute function public.update_conversation_last_message_at();

drop trigger if exists update_inbound_message_customer_stats on public.messages;
create trigger update_inbound_message_customer_stats
after insert on public.messages
for each row
execute function public.update_customer_message_stats();

-- =====================================================
-- Row Level Security
-- =====================================================

alter table public.businesses enable row level security;
alter table public.customers enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.faqs enable row level security;
alter table public.knowledge_base_items enable row level security;
alter table public.leads enable row level security;
alter table public.ai_settings enable row level security;

-- =====================================================
-- RLS Policies: businesses
-- =====================================================

drop policy if exists "Users can select own businesses" on public.businesses;
create policy "Users can select own businesses"
on public.businesses
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own businesses" on public.businesses;
create policy "Users can insert own businesses"
on public.businesses
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update own businesses" on public.businesses;
create policy "Users can update own businesses"
on public.businesses
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own businesses" on public.businesses;
create policy "Users can delete own businesses"
on public.businesses
for delete
to authenticated
using (user_id = auth.uid());

-- =====================================================
-- RLS Policies: customers
-- =====================================================

drop policy if exists "Users can select own customers" on public.customers;
create policy "Users can select own customers"
on public.customers
for select
to authenticated
using (business_id in (select id from public.businesses where user_id = auth.uid()));

drop policy if exists "Users can insert own customers" on public.customers;
create policy "Users can insert own customers"
on public.customers
for insert
to authenticated
with check (business_id in (select id from public.businesses where user_id = auth.uid()));

drop policy if exists "Users can update own customers" on public.customers;
create policy "Users can update own customers"
on public.customers
for update
to authenticated
using (business_id in (select id from public.businesses where user_id = auth.uid()))
with check (business_id in (select id from public.businesses where user_id = auth.uid()));

drop policy if exists "Users can delete own customers" on public.customers;
create policy "Users can delete own customers"
on public.customers
for delete
to authenticated
using (business_id in (select id from public.businesses where user_id = auth.uid()));

-- =====================================================
-- RLS Policies: conversations
-- =====================================================

drop policy if exists "Users can select own conversations" on public.conversations;
create policy "Users can select own conversations"
on public.conversations
for select
to authenticated
using (business_id in (select id from public.businesses where user_id = auth.uid()));

drop policy if exists "Users can insert own conversations" on public.conversations;
create policy "Users can insert own conversations"
on public.conversations
for insert
to authenticated
with check (business_id in (select id from public.businesses where user_id = auth.uid()));

drop policy if exists "Users can update own conversations" on public.conversations;
create policy "Users can update own conversations"
on public.conversations
for update
to authenticated
using (business_id in (select id from public.businesses where user_id = auth.uid()))
with check (business_id in (select id from public.businesses where user_id = auth.uid()));

drop policy if exists "Users can delete own conversations" on public.conversations;
create policy "Users can delete own conversations"
on public.conversations
for delete
to authenticated
using (business_id in (select id from public.businesses where user_id = auth.uid()));

-- =====================================================
-- RLS Policies: messages
-- =====================================================

drop policy if exists "Users can select own messages" on public.messages;
create policy "Users can select own messages"
on public.messages
for select
to authenticated
using (business_id in (select id from public.businesses where user_id = auth.uid()));

drop policy if exists "Users can insert own messages" on public.messages;
create policy "Users can insert own messages"
on public.messages
for insert
to authenticated
with check (business_id in (select id from public.businesses where user_id = auth.uid()));

drop policy if exists "Users can update own messages" on public.messages;
create policy "Users can update own messages"
on public.messages
for update
to authenticated
using (business_id in (select id from public.businesses where user_id = auth.uid()))
with check (business_id in (select id from public.businesses where user_id = auth.uid()));

drop policy if exists "Users can delete own messages" on public.messages;
create policy "Users can delete own messages"
on public.messages
for delete
to authenticated
using (business_id in (select id from public.businesses where user_id = auth.uid()));

-- =====================================================
-- RLS Policies: faqs
-- =====================================================

drop policy if exists "Users can select own faqs" on public.faqs;
create policy "Users can select own faqs"
on public.faqs
for select
to authenticated
using (business_id in (select id from public.businesses where user_id = auth.uid()));

drop policy if exists "Users can insert own faqs" on public.faqs;
create policy "Users can insert own faqs"
on public.faqs
for insert
to authenticated
with check (business_id in (select id from public.businesses where user_id = auth.uid()));

drop policy if exists "Users can update own faqs" on public.faqs;
create policy "Users can update own faqs"
on public.faqs
for update
to authenticated
using (business_id in (select id from public.businesses where user_id = auth.uid()))
with check (business_id in (select id from public.businesses where user_id = auth.uid()));

drop policy if exists "Users can delete own faqs" on public.faqs;
create policy "Users can delete own faqs"
on public.faqs
for delete
to authenticated
using (business_id in (select id from public.businesses where user_id = auth.uid()));

-- =====================================================
-- RLS Policies: knowledge_base_items
-- =====================================================

drop policy if exists "Users can select own knowledge base items" on public.knowledge_base_items;
create policy "Users can select own knowledge base items"
on public.knowledge_base_items
for select
to authenticated
using (business_id in (select id from public.businesses where user_id = auth.uid()));

drop policy if exists "Users can insert own knowledge base items" on public.knowledge_base_items;
create policy "Users can insert own knowledge base items"
on public.knowledge_base_items
for insert
to authenticated
with check (business_id in (select id from public.businesses where user_id = auth.uid()));

drop policy if exists "Users can update own knowledge base items" on public.knowledge_base_items;
create policy "Users can update own knowledge base items"
on public.knowledge_base_items
for update
to authenticated
using (business_id in (select id from public.businesses where user_id = auth.uid()))
with check (business_id in (select id from public.businesses where user_id = auth.uid()));

drop policy if exists "Users can delete own knowledge base items" on public.knowledge_base_items;
create policy "Users can delete own knowledge base items"
on public.knowledge_base_items
for delete
to authenticated
using (business_id in (select id from public.businesses where user_id = auth.uid()));

-- =====================================================
-- RLS Policies: leads
-- =====================================================

drop policy if exists "Users can select own leads" on public.leads;
create policy "Users can select own leads"
on public.leads
for select
to authenticated
using (business_id in (select id from public.businesses where user_id = auth.uid()));

drop policy if exists "Users can insert own leads" on public.leads;
create policy "Users can insert own leads"
on public.leads
for insert
to authenticated
with check (business_id in (select id from public.businesses where user_id = auth.uid()));

drop policy if exists "Users can update own leads" on public.leads;
create policy "Users can update own leads"
on public.leads
for update
to authenticated
using (business_id in (select id from public.businesses where user_id = auth.uid()))
with check (business_id in (select id from public.businesses where user_id = auth.uid()));

drop policy if exists "Users can delete own leads" on public.leads;
create policy "Users can delete own leads"
on public.leads
for delete
to authenticated
using (business_id in (select id from public.businesses where user_id = auth.uid()));

-- =====================================================
-- RLS Policies: ai_settings
-- =====================================================

drop policy if exists "Users can select own ai settings" on public.ai_settings;
create policy "Users can select own ai settings"
on public.ai_settings
for select
to authenticated
using (business_id in (select id from public.businesses where user_id = auth.uid()));

drop policy if exists "Users can insert own ai settings" on public.ai_settings;
create policy "Users can insert own ai settings"
on public.ai_settings
for insert
to authenticated
with check (business_id in (select id from public.businesses where user_id = auth.uid()));

drop policy if exists "Users can update own ai settings" on public.ai_settings;
create policy "Users can update own ai settings"
on public.ai_settings
for update
to authenticated
using (business_id in (select id from public.businesses where user_id = auth.uid()))
with check (business_id in (select id from public.businesses where user_id = auth.uid()));

drop policy if exists "Users can delete own ai settings" on public.ai_settings;
create policy "Users can delete own ai settings"
on public.ai_settings
for delete
to authenticated
using (business_id in (select id from public.businesses where user_id = auth.uid()));

-- =====================================================
-- Optional Seed Data
-- =====================================================

/*
-- Replace the business_id value with an existing business ID after creating a business.

insert into public.faqs (business_id, question, answer)
values (
  '00000000-0000-0000-0000-000000000000',
  'What are your opening hours?',
  'We are open Monday to Friday from 9 AM to 6 PM.'
);

insert into public.knowledge_base_items (business_id, category, title, content, tags)
values (
  '00000000-0000-0000-0000-000000000000',
  'product',
  'Premium Support Plan',
  'Our Premium Support Plan includes priority WhatsApp support and faster issue resolution.',
  array['support', 'premium', 'product']
);

insert into public.knowledge_base_items (business_id, category, title, content, tags)
values (
  '00000000-0000-0000-0000-000000000000',
  'policy',
  'Refund Policy',
  'Refund requests are reviewed within 3 business days when proof of purchase is provided.',
  array['refund', 'policy']
);
*/
