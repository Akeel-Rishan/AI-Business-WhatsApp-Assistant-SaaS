# WA Assistant Backend

FastAPI backend scaffold for WA Assistant.

## Run Locally

```powershell
conda activate wa-assistant-backend
& "D:\anaconda3\envs\wa-assistant-backend\python.exe" -m uvicorn main:app --reload --port 8000
```

## Routes

- `GET /health`
- `GET /api/v1/auth`
- `GET /api/v1/business`
- `GET /api/v1/webhook`
- `GET /api/v1/knowledge`
- `GET /api/v1/messages`
- `GET /api/v1/leads`
