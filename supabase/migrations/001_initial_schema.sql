create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  name text not null,
  description text,
  opening_hours text,
  location text,
  contact_info text,
  whatsapp_number text,
  whatsapp_phone_id text,
  whatsapp_access_token text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  whatsapp_number text not null,
  name text,
  email text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  message_count int not null default 0
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'closed', 'human_handoff')),
  started_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  content text not null,
  message_type text not null default 'text',
  wa_message_id text,
  sent_by_ai boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  question text not null,
  answer text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_base_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category text check (category is null or category in ('product', 'service', 'policy', 'general')),
  title text not null,
  content text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  inquiry_type text,
  summary text,
  status text not null default 'new' check (status in ('new', 'contacted', 'converted', 'lost')),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade unique,
  is_enabled boolean not null default true,
  tone text not null default 'friendly' check (tone in ('friendly', 'formal', 'casual')),
  language text not null default 'english',
  custom_instructions text,
  fallback_message text not null default 'Thank you for your message. Our team will get back to you shortly.',
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_business_id on public.customers(business_id);
create index if not exists idx_customers_whatsapp_number on public.customers(whatsapp_number);
create index if not exists idx_conversations_business_id on public.conversations(business_id);
create index if not exists idx_messages_business_id on public.messages(business_id);
create index if not exists idx_messages_conversation_id on public.messages(conversation_id);
create index if not exists idx_faqs_business_id on public.faqs(business_id);
create index if not exists idx_knowledge_base_items_business_id on public.knowledge_base_items(business_id);
create index if not exists idx_leads_business_id on public.leads(business_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
before update on public.businesses
for each row
execute function public.set_updated_at();

alter table public.businesses enable row level security;
alter table public.customers enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.faqs enable row level security;
alter table public.knowledge_base_items enable row level security;
alter table public.leads enable row level security;
alter table public.ai_settings enable row level security;

drop policy if exists "Users manage own business" on public.businesses;
create policy "Users manage own business"
on public.businesses
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users manage own customers" on public.customers;
create policy "Users manage own customers"
on public.customers
for all
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = customers.business_id and b.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = customers.business_id and b.user_id = auth.uid()
  )
);

drop policy if exists "Users manage own conversations" on public.conversations;
create policy "Users manage own conversations"
on public.conversations
for all
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = conversations.business_id and b.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = conversations.business_id and b.user_id = auth.uid()
  )
);

drop policy if exists "Users manage own messages" on public.messages;
create policy "Users manage own messages"
on public.messages
for all
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = messages.business_id and b.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = messages.business_id and b.user_id = auth.uid()
  )
);

drop policy if exists "Users manage own faqs" on public.faqs;
create policy "Users manage own faqs"
on public.faqs
for all
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = faqs.business_id and b.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = faqs.business_id and b.user_id = auth.uid()
  )
);

drop policy if exists "Users manage own knowledge base" on public.knowledge_base_items;
create policy "Users manage own knowledge base"
on public.knowledge_base_items
for all
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = knowledge_base_items.business_id and b.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = knowledge_base_items.business_id and b.user_id = auth.uid()
  )
);

drop policy if exists "Users manage own leads" on public.leads;
create policy "Users manage own leads"
on public.leads
for all
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = leads.business_id and b.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = leads.business_id and b.user_id = auth.uid()
  )
);

drop policy if exists "Users manage own ai settings" on public.ai_settings;
create policy "Users manage own ai settings"
on public.ai_settings
for all
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = ai_settings.business_id and b.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = ai_settings.business_id and b.user_id = auth.uid()
  )
);
