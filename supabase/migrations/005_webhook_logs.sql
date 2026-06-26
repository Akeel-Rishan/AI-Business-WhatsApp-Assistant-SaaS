-- WhatsApp webhook foundation.
-- Run this after the initial schema and knowledge-base migrations.

create table if not exists public.webhook_logs (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz default now(),
  phone_number_id text,
  event_type text check (event_type in ('message', 'status', 'unknown')),
  payload jsonb,
  processed boolean default false,
  error_message text,
  processing_duration_ms integer
);

create index if not exists idx_webhook_logs_received_at
on public.webhook_logs(received_at desc);

create index if not exists idx_webhook_logs_phone_number_id
on public.webhook_logs(phone_number_id);

create index if not exists idx_messages_wa_message_id
on public.messages(wa_message_id)
where wa_message_id is not null;

alter table public.messages
drop constraint if exists messages_message_type_check;

alter table public.messages
add constraint messages_message_type_check
check (message_type in ('text', 'image', 'audio', 'document', 'template', 'video', 'reaction', 'button', 'interactive', 'unknown'));
