-- Keep WhatsApp credentials write-only from browser clients.
-- FastAPI uses the direct database connection for connection management.

revoke select on table public.businesses from anon, authenticated;

grant select (
  id,
  user_id,
  name,
  business_type,
  description,
  opening_hours,
  timezone,
  after_hours_message,
  location,
  contact_info,
  website_url,
  whatsapp_number,
  is_active,
  onboarding_completed,
  created_at,
  updated_at
) on table public.businesses to authenticated;
