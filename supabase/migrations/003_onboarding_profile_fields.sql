-- Add business profile fields used by onboarding and settings.

alter table public.businesses
  add column if not exists business_type text,
  add column if not exists website_url text,
  add column if not exists timezone text default 'Asia/Colombo',
  add column if not exists after_hours_message text;
