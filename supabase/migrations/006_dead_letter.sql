-- Message processing pipeline dead-letter queue.

create table if not exists public.dead_letter_messages (
  id uuid primary key default gen_random_uuid(),
  wa_message_id text,
  phone_number_id text,
  raw_payload jsonb not null,
  parsed_message jsonb,
  failure_stage text,
  error_message text,
  retry_count integer default 0,
  max_retries integer default 3,
  next_retry_at timestamptz,
  resolved boolean default false,
  created_at timestamptz default now(),
  last_attempted_at timestamptz
);

create index if not exists idx_dead_letter_resolved
on public.dead_letter_messages(resolved, next_retry_at);

alter table public.messages
drop constraint if exists messages_message_type_check;

alter table public.messages
add constraint messages_message_type_check
check (message_type in ('text', 'image', 'audio', 'document', 'template', 'video', 'reaction', 'button', 'interactive', 'unknown', 'other'));
