export function getWebhookUrl(): string {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  return `${backendUrl.replace(/\/$/, "")}/api/v1/webhook/whatsapp`;
}

export function generateVerifyToken(businessId: string): string {
  const short = businessId.replace(/-/g, "").slice(0, 8) || "business";
  const random = Math.random().toString(36).slice(2, 10).padEnd(8, "0");
  return `wa_${short}_${random}`;
}
