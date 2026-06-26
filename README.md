# WA Assistant

WA Assistant is a production-ready monorepo scaffold for an AI Business WhatsApp Assistant SaaS platform. It provides a polished Next.js dashboard shell, a FastAPI backend, Supabase integration points, and the structure needed for future WhatsApp, knowledge base, lead, and AI automation features.

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | Next.js 14, App Router, TypeScript, Tailwind CSS, shadcn/ui-style components |
| UI | Radix UI primitives, lucide-react, class-variance-authority, clsx, tailwind-merge |
| Auth/Data | Supabase JS, Supabase SSR |
| Backend | FastAPI, Uvicorn, Pydantic, python-dotenv |
| Integrations | Supabase, WhatsApp Cloud API scaffold, Gemini scaffold |

## Project Structure

```text
wa-assistant/
  frontend/
    src/
      app/
      components/
      hooks/
      lib/
      types/
  backend/
    routers/
    services/
    models/
    utils/
  supabase/
    migrations/
```

## Local Development

### Frontend

```powershell
cd frontend
Copy-Item .env.local.example .env.local
npm install
npm run dev
```

The frontend runs on `http://localhost:3000`.

### Backend

Recommended with Anaconda:

```powershell
cd backend
conda env create -f environment.yml
conda activate wa-assistant-backend
Copy-Item .env.example .env
python -m uvicorn main:app --reload --port 8000
```

If PowerShell still uses `C:\Python314\python.exe` after `conda activate`, run the Conda env Python directly:

```powershell
& "D:\anaconda3\envs\wa-assistant-backend\python.exe" -m uvicorn main:app --reload --port 8000
```

The backend runs on `http://localhost:8000`.

## Environment Variables

### Frontend

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### Backend

```env
SUPABASE_URL=
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
FRONTEND_URL=http://localhost:3000
PORT=8000
```

Use `SUPABASE_SECRET_KEY` for current Supabase projects. Legacy projects may expose the same backend-level permission as `service_role`; the backend accepts `SUPABASE_SERVICE_ROLE_KEY` as a fallback.

## Supabase Setup

Create a Supabase project and copy the project URL, anon key, and secret key into the environment files. Database migrations will be added in Part 2, so `supabase/migrations/` is intentionally empty in this scaffold phase.

## Phase Roadmap

| Phase | Scope |
| --- | --- |
| Phase 1 | Monorepo scaffold, dashboard shell, frontend/backend structure |
| Phase 2 | Supabase schema, RLS policies, generated DB types |
| Phase 3 | Supabase auth, onboarding, business profile persistence |
| Phase 4 | WhatsApp webhook ingestion and message storage |
| Phase 5 | Knowledge base, FAQs, AI response generation |
| Phase 6 | Leads, analytics, production hardening, deployment |
