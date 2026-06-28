"use client";

import { PageLoader } from "@/components/shared/PageLoader";
import { WhatsAppConnectionPanel } from "@/components/whatsapp/WhatsAppConnectionPanel";
import { useUser } from "@/hooks/useUser";

export default function WhatsAppSettingsPage() {
  const { business, loading } = useUser();
  if (loading) return <PageLoader />;
  if (!business) return <div className="rounded-md border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">Complete your business profile before connecting WhatsApp.</div>;
  return <WhatsAppConnectionPanel businessId={business.id} initialNumber={business.whatsapp_number} />;
}
