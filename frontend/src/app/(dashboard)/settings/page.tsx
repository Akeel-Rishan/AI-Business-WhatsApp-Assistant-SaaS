"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CharacterCounter } from "@/components/shared/CharacterCounter";
import { FormSection } from "@/components/shared/FormSection";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageLoader } from "@/components/shared/PageLoader";
import { ToneSelector, type ToneValue } from "@/components/shared/ToneSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/hooks/useToast";
import { createClient } from "@/lib/supabase/client";

const businessTypes = ["Retail Shop", "Restaurant", "Salon", "Clinic", "Online Store", "Home Business", "Service Provider", "Agency", "Other"];
const timezones = ["Asia/Colombo", "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "America/Los_Angeles", "Australia/Sydney"];
const languages = ["English", "Sinhala", "Tamil", "English + Sinhala", "English + Tamil", "All three"];

type ProfileForm = {
  name: string;
  businessType: string;
  description: string;
  whatsappNumber: string;
  contactInfo: string;
  location: string;
  websiteUrl: string;
  openingHours: string;
  timezone: string;
  afterHoursMessage: string;
};

type AIForm = {
  isEnabled: boolean;
  tone: ToneValue;
  language: string;
  customInstructions: string;
  fallbackMessage: string;
  humanHandoffKeyword: string;
  maxResponseLength: number;
};

const defaultFallback = "Thank you for your message! Our team will get back to you shortly. For urgent matters, please call us directly.";

export default function SettingsPage() {
  const router = useRouter();
  const { user, business, loading } = useUser();
  const { toast } = useToast();
  const [profileSaving, setProfileSaving] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileForm>({
    name: "",
    businessType: "",
    description: "",
    whatsappNumber: "",
    contactInfo: "",
    location: "",
    websiteUrl: "",
    openingHours: "",
    timezone: "Asia/Colombo",
    afterHoursMessage: ""
  });
  const [ai, setAI] = useState<AIForm>({
    isEnabled: true,
    tone: "friendly",
    language: "English",
    customInstructions: "",
    fallbackMessage: defaultFallback,
    humanHandoffKeyword: "human",
    maxResponseLength: 500
  });

  useEffect(() => {
    if (!business) return;
    setBusinessId(business.id);
    setProfile({
      name: business.name ?? "",
      businessType: business.business_type ?? "",
      description: business.description ?? "",
      whatsappNumber: business.whatsapp_number ?? "",
      contactInfo: business.contact_info ?? "",
      location: business.location ?? "",
      websiteUrl: business.website_url ?? "",
      openingHours: business.opening_hours ?? "",
      timezone: business.timezone ?? "Asia/Colombo",
      afterHoursMessage: business.after_hours_message ?? ""
    });
  }, [business]);

  useEffect(() => {
    async function loadAISettings() {
      if (!business?.id) return;
      const supabase = createClient();
      const { data, error } = await supabase.from("ai_settings").select("*").eq("business_id", business.id).maybeSingle();
      if (error) {
        toast({ title: "Could not load AI settings", description: error.message, variant: "error" });
        return;
      }
      if (data) {
        setAI({
          isEnabled: data.is_enabled ?? true,
          tone: (data.tone as ToneValue) ?? "friendly",
          language: normalizeLanguage(data.language),
          customInstructions: data.custom_instructions ?? "",
          fallbackMessage: data.fallback_message ?? defaultFallback,
          humanHandoffKeyword: data.human_handoff_keyword ?? "human",
          maxResponseLength: data.max_response_length ?? 500
        });
      }
    }
    loadAISettings();
  }, [business?.id, toast]);

  if (loading) {
    return <PageLoader />;
  }

  async function saveProfile() {
    if (!user) return;
    setProfileSaving(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("businesses")
        .upsert(
          {
            user_id: user.id,
            name: profile.name.trim(),
            business_type: profile.businessType || null,
            description: profile.description.trim() || null,
            whatsapp_number: profile.whatsappNumber.trim() || null,
            contact_info: profile.contactInfo.trim() || null,
            location: profile.location.trim() || null,
            website_url: profile.websiteUrl.trim() || null,
            opening_hours: profile.openingHours.trim() || null,
            timezone: profile.timezone,
            after_hours_message: profile.afterHoursMessage.trim() || null
          },
          { onConflict: "user_id" }
        )
        .select("id")
        .single();

      if (error || !data) throw new Error(error?.message ?? "Could not save profile.");
      setBusinessId(data.id);
      toast({ title: "Profile saved", description: "Your business information was updated.", variant: "success" });
    } catch (error) {
      toast({ title: "Profile save failed", description: error instanceof Error ? error.message : "Please try again.", variant: "error" });
    } finally {
      setProfileSaving(false);
    }
  }

  async function saveAISettings() {
    if (!businessId) {
      toast({ title: "Save profile first", description: "A business profile is required before saving AI settings.", variant: "error" });
      return;
    }
    setAiSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("ai_settings").upsert(
        {
          business_id: businessId,
          is_enabled: ai.isEnabled,
          tone: ai.tone,
          language: ai.language.toLowerCase(),
          custom_instructions: ai.customInstructions.trim() || null,
          fallback_message: ai.fallbackMessage.trim() || defaultFallback,
          human_handoff_keyword: ai.humanHandoffKeyword.trim() || "human",
          max_response_length: ai.maxResponseLength
        },
        { onConflict: "business_id" }
      );
      if (error) throw new Error(error.message);
      toast({ title: "AI settings saved", description: "Assistant behavior has been updated.", variant: "success" });
    } catch (error) {
      toast({ title: "AI settings save failed", description: error instanceof Error ? error.message : "Please try again.", variant: "error" });
    } finally {
      setAiSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Workspace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">Settings</h1>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-3 md:w-auto">
          <TabsTrigger value="profile">Business Profile</TabsTrigger>
          <TabsTrigger value="ai">AI Settings</TabsTrigger>
          <TabsTrigger value="whatsapp" onClick={() => router.push("/settings/whatsapp")}>WhatsApp Connection</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-[#1f1f1f] bg-[#111111]">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Business Profile</CardTitle>
                <CardDescription>Edit the information your assistant uses when answering customers.</CardDescription>
              </div>
              <Button onClick={saveProfile} disabled={profileSaving} className="bg-brand text-black hover:bg-brand-dark">
                {profileSaving ? <LoadingSpinner size="sm" className="border-black border-t-transparent" /> : "Save profile"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-8">
              <FormSection title="Business Identity" description="Describe who you are and what customers can expect.">
                <Field label="Business Name">
                  <Input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} className="border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand" />
                </Field>
                <Field label="Business Type">
                  <Select value={profile.businessType} onValueChange={(value) => setProfile({ ...profile, businessType: value })}>
                    <SelectTrigger className="border-[#2a2a2a] bg-[#1a1a1a] focus:ring-brand"><SelectValue placeholder="Select business type" /></SelectTrigger>
                    <SelectContent>{businessTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Description">
                  <Textarea value={profile.description} maxLength={500} onChange={(event) => setProfile({ ...profile, description: event.target.value })} className="border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand" />
                  <CharacterCounter current={profile.description.length} max={500} />
                </Field>
              </FormSection>

              <FormSection title="Contact & Location" description="Information customers may ask the assistant for.">
                <Field label="Business WhatsApp Number"><Input value={profile.whatsappNumber} onChange={(event) => setProfile({ ...profile, whatsappNumber: event.target.value })} className="border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand" /></Field>
                <Field label="Phone / Contact Number"><Input value={profile.contactInfo} onChange={(event) => setProfile({ ...profile, contactInfo: event.target.value })} className="border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand" /></Field>
                <Field label="Business Location / Address"><Textarea value={profile.location} onChange={(event) => setProfile({ ...profile, location: event.target.value })} className="border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand" /></Field>
                <Field label="Website URL"><Input value={profile.websiteUrl} onChange={(event) => setProfile({ ...profile, websiteUrl: event.target.value })} className="border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand" /></Field>
              </FormSection>

              <FormSection title="Operating Hours" description="Availability details for automated responses.">
                <Field label="Opening Hours"><Textarea value={profile.openingHours} onChange={(event) => setProfile({ ...profile, openingHours: event.target.value })} className="min-h-32 border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand" /></Field>
                <Field label="Timezone">
                  <Select value={profile.timezone} onValueChange={(value) => setProfile({ ...profile, timezone: value })}>
                    <SelectTrigger className="border-[#2a2a2a] bg-[#1a1a1a] focus:ring-brand"><SelectValue /></SelectTrigger>
                    <SelectContent>{timezones.map((timezone) => <SelectItem key={timezone} value={timezone}>{timezone}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="After Hours Message"><Textarea value={profile.afterHoursMessage} onChange={(event) => setProfile({ ...profile, afterHoursMessage: event.target.value })} className="border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand" /></Field>
              </FormSection>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card className="border-[#1f1f1f] bg-[#111111]">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>AI Settings</CardTitle>
                <CardDescription>Control how your assistant responds and when it hands off.</CardDescription>
              </div>
              <Button onClick={saveAISettings} disabled={aiSaving} className="bg-brand text-black hover:bg-brand-dark">
                {aiSaving ? <LoadingSpinner size="sm" className="border-black border-t-transparent" /> : "Save AI settings"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4">
                <div>
                  <Label>AI Assistant</Label>
                  <p className="mt-1 text-sm text-muted-foreground">Turn automated replies on or off.</p>
                </div>
                <Switch checked={ai.isEnabled} onCheckedChange={(value) => setAI({ ...ai, isEnabled: value })} />
              </div>
              <Field label="Tone"><ToneSelector value={ai.tone} onChange={(tone) => setAI({ ...ai, tone })} /></Field>
              <Field label="Language">
                <Select value={ai.language} onValueChange={(language) => setAI({ ...ai, language })}>
                  <SelectTrigger className="border-[#2a2a2a] bg-[#1a1a1a] focus:ring-brand"><SelectValue /></SelectTrigger>
                  <SelectContent>{languages.map((language) => <SelectItem key={language} value={language}>{language}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Custom Instructions"><Textarea value={ai.customInstructions} maxLength={1000} onChange={(event) => setAI({ ...ai, customInstructions: event.target.value })} className="border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand" /><CharacterCounter current={ai.customInstructions.length} max={1000} /></Field>
              <Field label="Fallback Message"><Textarea value={ai.fallbackMessage} onChange={(event) => setAI({ ...ai, fallbackMessage: event.target.value })} className="border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand" /></Field>
              <Field label="Keyword to trigger human handoff" helper="When a customer types this word, the AI will stop responding and alert you."><Input value={ai.humanHandoffKeyword} onChange={(event) => setAI({ ...ai, humanHandoffKeyword: event.target.value })} placeholder="e.g., human, agent, talk to someone" className="border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand" /></Field>
              <Field label="Max Response Length"><Input type="number" min={100} max={1000} value={ai.maxResponseLength} onChange={(event) => setAI({ ...ai, maxResponseLength: Number(event.target.value) })} className="border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand" /></Field>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

function Field({ label, helper, children }: { label: string; helper?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}

function normalizeLanguage(value: string | null) {
  if (!value) return "English";
  const match = languages.find((language) => language.toLowerCase() === value.toLowerCase());
  return match ?? value;
}
