# WhatsApp Webhook Setup

This backend exposes the platform webhook at:

```text
https://YOUR_BACKEND_DOMAIN/api/v1/webhook/whatsapp
```

For local development, expose the FastAPI backend with a tunnel such as ngrok or Cloudflare Tunnel and set:

```env
WEBHOOK_PUBLIC_URL=https://YOUR_TUNNEL_DOMAIN
WEBHOOK_VERIFY_TOKEN=your-random-platform-verification-token
WHATSAPP_APP_SECRET=your-meta-app-secret
```

`WEBHOOK_VERIFY_TOKEN` is used only for Meta webhook registration. It is separate from each business profile's `webhook_verify_token`.

## Meta Developer Console

1. Open your Meta app.
2. Go to WhatsApp > Configuration.
3. Set Callback URL to:

```text
https://YOUR_BACKEND_DOMAIN/api/v1/webhook/whatsapp
```

4. Set Verify token to the exact value from `WEBHOOK_VERIFY_TOKEN`.
5. Subscribe to the `messages` webhook field.

Meta will send:

```text
GET /api/v1/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
```

The backend returns the challenge as plain text when the token matches.

## Business Mapping

Incoming messages are matched to a business using:

```sql
businesses.whatsapp_phone_id = metadata.phone_number_id
```

Each active business must have its WhatsApp phone number ID saved before inbound messages can be stored.

## Security

Every POST request must include:

```text
X-Hub-Signature-256: sha256=...
```

The signature is verified with `WHATSAPP_APP_SECRET`. Unsigned or invalid requests return `403` and are logged.

## Database Migration

Run the webhook migration before connecting Meta:

```powershell
cd backend
python scripts/run_migration.py ..\supabase\migrations\005_webhook_logs.sql
```

The migration creates `webhook_logs` and broadens `messages.message_type` for real Meta message types.

## Health Check

Use:

```text
GET /api/v1/webhook/health
```

It returns recent webhook count, failed webhook count, last event time, uptime, and the configured webhook URL.
