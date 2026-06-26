# WhatsApp / Meta Setup Guide

This guide connects the AI Business WhatsApp Assistant backend to Meta WhatsApp Cloud API.

## Step 1: Create Meta Developer Account

1. Go to `https://developers.facebook.com`.
2. Create a developer account or log in to your existing account.
3. Make sure your business has access to Meta Business tools.

## Step 2: Create a Meta App

1. Click **Create App**.
2. Select the **Business** app type.
3. Complete the app creation flow.
4. In the app dashboard, add the **WhatsApp** product.

## Step 3: Get Credentials

Add these values to `backend/.env`.

```env
WEBHOOK_VERIFY_TOKEN=wa_assistant_verify_2025_xkj39
META_APP_SECRET=your_meta_app_secret_here
META_API_VERSION=v19.0
WHATSAPP_API_URL=https://graph.facebook.com
```

Where to find each value:

- `META_APP_SECRET`: App Dashboard -> Settings -> Basic -> App Secret
- `WHATSAPP_PHONE_NUMBER_ID`: WhatsApp -> API Setup -> Phone Number ID
- `WHATSAPP_ACCESS_TOKEN`: WhatsApp -> API Setup -> Temporary access token

The temporary WhatsApp access token expires. For production, create a permanent System User token in Meta Business Manager and grant WhatsApp permissions.

## Step 4: Configure Webhook

1. Go to **WhatsApp -> Configuration -> Webhook**.
2. Set Callback URL:

```text
https://your-backend-url/api/v1/webhook/whatsapp
```

3. Set Verify Token to your `WEBHOOK_VERIFY_TOKEN` value.
4. Subscribe to the `messages` field.

The backend verification route is:

```text
GET /api/v1/webhook/whatsapp
```

It returns Meta's `hub.challenge` as plain text when the token is correct.

## Step 5: Test the Webhook

1. Use Meta's **Test** button to send a webhook test event.
2. Check backend logs for the received webhook.
3. Check the `webhook_logs` table in Supabase.
4. Check `GET /api/v1/webhook/health` for recent event counts.

## Step 6: Add Test Phone Number

1. Go to **WhatsApp -> API Setup**.
2. In the **To** field, add your personal WhatsApp number as a test recipient.
3. Verify the number with the code Meta sends.
4. Send a message to your test WhatsApp business number.

## Local Development With ngrok

```bash
ngrok http 8000
```

Copy the `https` URL from ngrok and use it as your webhook callback URL:

```text
https://your-ngrok-domain.ngrok-free.app/api/v1/webhook/whatsapp
```

Keep your local backend running:

```bash
uvicorn main:app --reload --port 8000
```

## Database Migration

Run the webhook migration before testing:

```powershell
cd backend
python scripts/run_migration.py
```

This applies `supabase/migrations/005_webhook_logs.sql`. This repository already used migration numbers `003` and `004`, so the webhook migration is numbered `005` to preserve order.

## Common Errors

### 403 on verification

The verify token in Meta does not match `WEBHOOK_VERIFY_TOKEN` in `backend/.env`.

### Webhook not receiving events

Your backend URL must be public HTTPS. For local development, use ngrok or another tunnel.

### Signature mismatch

`META_APP_SECRET` is wrong or missing. Copy it from **App Dashboard -> Settings -> Basic -> App Secret**.

### Events received but messages not stored

Make sure the target business row has:

```text
businesses.whatsapp_phone_id = WhatsApp API Setup Phone Number ID
businesses.is_active = true
```

Unknown `phone_number_id` values are logged and ignored.
