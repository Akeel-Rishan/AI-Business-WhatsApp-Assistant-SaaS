# WA Assistant

AI Business WhatsApp Assistant is a SaaS starter for businesses that want to manage WhatsApp conversations, customer profiles, FAQs, leads, and AI reply settings from a protected dashboard.

## Stack

- Frontend: Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui-style components, Supabase Auth
- Backend: FastAPI, Pydantic, supabase-py, python-dotenv
- Database: Supabase Postgres with Row Level Security

## Local Setup

### 1. Supabase

1. Create a Supabase project.
2. Open the SQL editor and run `supabase/migrations/001_initial_schema.sql`.
3. Copy your project URL, anon key, and service role key.
4. In Authentication settings, add `http://localhost:3000` to allowed redirect URLs.

### 2. Frontend

```powershell
cd frontend
Copy-Item .env.local.example .env.local
npm install
npm run dev
```

Set these values in `frontend/.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon public key.
- `NEXT_PUBLIC_BACKEND_URL`: FastAPI base URL, usually `http://localhost:8000`.

### 3. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn main:app --reload --port 8000
```

Set these values in `backend/.env`:

- `SUPABASE_URL`: Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key for trusted API operations.
- `GEMINI_API_KEY`: Reserved for future Gemini-powered replies.
- `FRONTEND_URL`: Frontend origin, usually `http://localhost:3000`.

## Auth Flow

- Register creates a Supabase user and redirects signed-in users to onboarding.
- Login checks whether a business profile exists.
- Users with a profile go to `/dashboard`; users without one go to `/onboarding`.
- `/dashboard` and `/onboarding` are protected by middleware.
- The onboarding form saves the authenticated user's business profile to Supabase.

## Project Structure

```text
wa-assistant/
  frontend/      Next.js application
  backend/       FastAPI application
  supabase/      SQL migrations
```
