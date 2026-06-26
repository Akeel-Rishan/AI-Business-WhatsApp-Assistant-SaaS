create table if not exists public.business_instructions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade unique not null,
  assistant_name text default 'Assistant',
  personality_description text,
  conversation_opener text,
  always_do_rules text[] default array[
    'Always greet the customer politely',
    'Always ask how you can help if the message is unclear',
    'Always provide the business contact info when asked'
  ],
  never_do_rules text[] default array[
    'Never share information about competitors',
    'Never make up prices or product details not in the knowledge base',
    'Never be rude or dismissive to any customer'
  ],
  restricted_topics text[] default '{}',
  redirect_message text,
  escalation_keyword text default 'human',
  escalation_situations text[] default array[
    'Customer expresses frustration or anger',
    'Customer asks about a complaint or refund',
    'Customer asks something the AI cannot answer confidently'
  ],
  escalation_message text,
  max_response_length integer default 150,
  use_emojis boolean default true,
  use_bullet_points boolean default true,
  conversation_closer text,
  after_hours_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.business_instructions enable row level security;

drop policy if exists "Users can manage their own instructions" on public.business_instructions;
create policy "Users can manage their own instructions"
on public.business_instructions
for all
to authenticated
using (
  business_id in (
    select id from public.businesses where user_id = auth.uid()
  )
)
with check (
  business_id in (
    select id from public.businesses where user_id = auth.uid()
  )
);

drop trigger if exists update_business_instructions_updated_at on public.business_instructions;
create trigger update_business_instructions_updated_at
before update on public.business_instructions
for each row execute function public.update_updated_at_column();

create or replace function public.create_default_instructions()
returns trigger
language plpgsql
as $$
begin
  insert into public.business_instructions (business_id)
  values (new.id)
  on conflict (business_id) do nothing;
  return new;
end;
$$;

drop trigger if exists auto_create_instructions on public.businesses;
create trigger auto_create_instructions
after insert on public.businesses
for each row execute function public.create_default_instructions();

insert into public.business_instructions (business_id)
select id from public.businesses
on conflict (business_id) do nothing;
