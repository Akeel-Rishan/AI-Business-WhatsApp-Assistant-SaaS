-- Create a business row automatically when a Supabase auth user is created.
-- This avoids browser-side RLS timing issues during sign up.

create or replace function public.handle_new_auth_user_business()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  business_name text;
begin
  business_name := nullif(trim(new.raw_user_meta_data ->> 'business_name'), '');

  insert into public.businesses (user_id, name)
  values (
    new.id,
    coalesce(business_name, split_part(new.email, '@', 1), 'New Business')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_business_for_new_auth_user on auth.users;
create trigger create_business_for_new_auth_user
after insert on auth.users
for each row
execute function public.handle_new_auth_user_business();

insert into public.businesses (user_id, name)
select
  users.id,
  coalesce(
    nullif(trim(users.raw_user_meta_data ->> 'business_name'), ''),
    split_part(users.email, '@', 1),
    'New Business'
  )
from auth.users as users
where not exists (
  select 1
  from public.businesses
  where businesses.user_id = users.id
);
