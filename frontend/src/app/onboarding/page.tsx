"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { CharacterCounter } from "@/components/shared/CharacterCounter";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Logo } from "@/components/shared/Logo";
import { PageLoader } from "@/components/shared/PageLoader";
import { StepCard } from "@/components/shared/StepCard";
import { ToneSelector, type ToneValue } from "@/components/shared/ToneSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/hooks/useToast";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const businessTypes = [
  "Retail Shop",
  "Restaurant",
  "Salon",
  "Clinic",
  "Online Store",
  "Home Business",
  "Service Provider",
  "Agency",
  "Other"
];

const timezones = ["Asia/Colombo", "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "America/Los_Angeles", "Australia/Sydney"];
const languages = ["English", "Sinhala", "Tamil", "English + Sinhala", "English + Tamil", "All three"];

const defaultAfterHours =
  "Thanks for reaching out! We're currently closed. Our business hours are [hours]. We'll get back to you as soon as we open.";
const defaultFallback =
  "Thank you for your message! Our team will get back to you shortly. For urgent matters, please call us directly.";

type OnboardingForm = {
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
  tone: ToneValue;
  language: string;
  customInstructions: string;
  fallbackMessage: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const { user, business, loading } = useUser();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [direction, setDirection] = useState<"next" | "back">("next");
  const [form, setForm] = useState<OnboardingForm>({
    name: "",
    businessType: "",
    description: "",
    whatsappNumber: "",
    contactInfo: "",
    location: "",
    websiteUrl: "",
    openingHours: "",
    timezone: "Asia/Colombo",
    afterHoursMessage: defaultAfterHours,
    tone: "friendly",
    language: "English",
    customInstructions: "",
    fallbackMessage: defaultFallback
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!business) return;
    setForm((current) => ({
      ...current,
      name: business.name ?? current.name,
      businessType: business.business_type ?? current.businessType,
      description: business.description ?? current.description,
      whatsappNumber: business.whatsapp_number ?? current.whatsappNumber,
      contactInfo: business.contact_info ?? current.contactInfo,
      location: business.location ?? current.location,
      websiteUrl: business.website_url ?? current.websiteUrl,
      openingHours: business.opening_hours ?? current.openingHours,
      timezone: business.timezone ?? current.timezone,
      afterHoursMessage: business.after_hours_message ?? current.afterHoursMessage
    }));
  }, [business]);

  const progress = useMemo(() => [1, 2, 3, 4], []);

  if (loading || !user) {
    return <PageLoader />;
  }

  function updateField<K extends keyof OnboardingForm>(key: K, value: OnboardingForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validateStep(currentStep: number) {
    if (currentStep === 1) {
      if (!form.name.trim()) return "Business name is required.";
      if (!form.businessType) return "Please choose a business type.";
      if (!form.description.trim()) return "Business description is required.";
      if (form.description.length > 500) return "Description must be 500 characters or fewer.";
    }
    if (currentStep === 2 && !form.whatsappNumber.trim()) {
      return "Business WhatsApp number is required.";
    }
    if (currentStep === 4 && form.customInstructions.length > 1000) {
      return "Custom instructions must be 1000 characters or fewer.";
    }
    return "";
  }

  function goNext() {
    const validationError = validateStep(step);
    if (validationError) {
      toast({ title: "Check this step", description: validationError, variant: "error" });
      return;
    }
    setDirection("next");
    setStep((current) => Math.min(current + 1, 4));
  }

  function goBack() {
    setDirection("back");
    setStep((current) => Math.max(current - 1, 1));
  }

  async function saveOnboarding() {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in again before completing onboarding.",
        variant: "error"
      });
      router.push("/login");
      return;
    }

    const validationError = validateStep(4);
    if (validationError) {
      toast({ title: "Check AI preferences", description: validationError, variant: "error" });
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: businessRow, error: businessError } = await supabase
        .from("businesses")
        .upsert(
          {
            user_id: user.id,
            name: form.name.trim(),
            business_type: form.businessType,
            description: form.description.trim(),
            whatsapp_number: form.whatsappNumber.trim(),
            contact_info: form.contactInfo.trim() || null,
            location: form.location.trim() || null,
            website_url: form.websiteUrl.trim() || null,
            opening_hours: form.openingHours.trim() || null,
            timezone: form.timezone,
            after_hours_message: form.afterHoursMessage.trim() || null,
            onboarding_completed: true
          },
          { onConflict: "user_id" }
        )
        .select("id")
        .single();

      if (businessError || !businessRow) {
        throw new Error(businessError?.message ?? "Could not save business profile.");
      }

      const { error: aiError } = await supabase.from("ai_settings").upsert(
        {
          business_id: businessRow.id,
          tone: form.tone,
          language: form.language.toLowerCase(),
          custom_instructions: form.customInstructions.trim() || null,
          fallback_message: form.fallbackMessage.trim() || defaultFallback
        },
        { onConflict: "business_id" }
      );

      if (aiError) {
        throw new Error(aiError.message);
      }

      setIsComplete(true);
      toast({ title: "Profile saved", description: "Your assistant setup is ready.", variant: "success" });
    } catch (error) {
      toast({
        title: "Could not finish onboarding",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "error"
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isComplete) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] px-6 py-8">
        <Logo />
        <section className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-3xl items-center justify-center">
          <Card className="w-full border-[#1f1f1f] bg-[#111111] text-center shadow-2xl">
            <CardContent className="p-8">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-brand bg-brand/10 text-brand">
                <Check className="h-10 w-10 animate-pulse" />
              </div>
              <h1 className="mt-6 text-3xl font-semibold">You&apos;re all set!</h1>
              <p className="mt-2 text-muted-foreground">Your AI assistant is ready to be configured.</p>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <NextStepCard title="Connect WhatsApp" href="/settings" detail="Coming soon" />
                <NextStepCard title="Add your Knowledge Base" href="/knowledge-base" detail="Train better answers" />
                <NextStepCard title="Go to Dashboard" href="/dashboard" detail="Open workspace" primary />
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Logo />
        {step > 1 && step < 4 && (
          <button type="button" onClick={goNext} className="text-sm text-muted-foreground transition-colors hover:text-white">
            Skip for now
          </button>
        )}
      </div>
      <section className="mx-auto mt-10 max-w-xl">
        <div className="mb-6 flex items-center justify-center gap-2">
          {progress.map((item) => (
            <div
              key={item}
              className={cn("h-2 rounded-full transition-all duration-200", item === step ? "w-10 bg-brand" : item < step ? "w-6 bg-brand/60" : "w-6 bg-[#2a2a2a]")}
            />
          ))}
        </div>
        <div className={cn("transition-all duration-300 ease-out", direction === "next" ? "animate-in slide-in-from-right-5" : "animate-in slide-in-from-left-5")}>
          {step === 1 && (
            <StepCard stepNumber={1} title="Tell us about your business" subtitle="This helps the AI respond accurately on your behalf">
              <div className="space-y-4">
                <Field label="Business Name" required>
                  <Input value={form.name} onChange={(event) => updateField("name", event.target.value)} className="border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand" />
                </Field>
                <Field label="Business Type" required>
                  <Select value={form.businessType} onValueChange={(value) => updateField("businessType", value)}>
                    <SelectTrigger className="border-[#2a2a2a] bg-[#1a1a1a] focus:ring-brand">
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Description" required>
                  <Textarea
                    value={form.description}
                    maxLength={500}
                    onChange={(event) => updateField("description", event.target.value)}
                    placeholder="Describe what your business does, what you sell or offer..."
                    className="border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand"
                  />
                  <CharacterCounter current={form.description.length} max={500} />
                </Field>
              </div>
            </StepCard>
          )}

          {step === 2 && (
            <StepCard stepNumber={2} title="Where can customers find you?" subtitle="The AI will share this information with customers who ask">
              <div className="space-y-4">
                <Field label="Business WhatsApp Number" required helper="This is the number customers message you on">
                  <Input type="tel" value={form.whatsappNumber} onChange={(event) => updateField("whatsappNumber", event.target.value)} className="border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand" />
                </Field>
                <Field label="Phone / Contact Number">
                  <Input type="tel" value={form.contactInfo} onChange={(event) => updateField("contactInfo", event.target.value)} className="border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand" />
                </Field>
                <Field label="Business Location / Address">
                  <Textarea value={form.location} onChange={(event) => updateField("location", event.target.value)} placeholder="e.g., 123 Main Street, Colombo 03, Sri Lanka" className="border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand" />
                </Field>
                <Field label="Website URL">
                  <Input type="url" value={form.websiteUrl} onChange={(event) => updateField("websiteUrl", event.target.value)} placeholder="https://yourbusiness.com" className="border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand" />
                </Field>
              </div>
            </StepCard>
          )}

          {step === 3 && (
            <StepCard stepNumber={3} title="When are you open?" subtitle="The AI will let customers know your availability">
              <div className="space-y-4">
                <Field label="Opening Hours">
                  <Textarea value={form.openingHours} onChange={(event) => updateField("openingHours", event.target.value)} placeholder={"Monday - Friday: 9:00 AM - 6:00 PM\nSaturday: 10:00 AM - 4:00 PM\nSunday: Closed"} className="min-h-32 border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand" />
                </Field>
                <Field label="Timezone">
                  <Select value={form.timezone} onValueChange={(value) => updateField("timezone", value)}>
                    <SelectTrigger className="border-[#2a2a2a] bg-[#1a1a1a] focus:ring-brand">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((timezone) => (
                        <SelectItem key={timezone} value={timezone}>
                          {timezone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="After Hours Message">
                  <Textarea value={form.afterHoursMessage} onChange={(event) => updateField("afterHoursMessage", event.target.value)} placeholder="What should the AI say when a customer messages outside business hours?" className="border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand" />
                </Field>
              </div>
            </StepCard>
          )}

          {step === 4 && (
            <StepCard stepNumber={4} title="Set up your AI assistant" subtitle="Configure how your assistant communicates with customers">
              <div className="space-y-5">
                <Field label="Assistant Tone">
                  <ToneSelector value={form.tone} onChange={(value) => updateField("tone", value)} />
                </Field>
                <Field label="Primary Language">
                  <Select value={form.language} onValueChange={(value) => updateField("language", value)}>
                    <SelectTrigger className="border-[#2a2a2a] bg-[#1a1a1a] focus:ring-brand">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((language) => (
                        <SelectItem key={language} value={language}>
                          {language}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Special instructions for your AI">
                  <Textarea value={form.customInstructions} maxLength={1000} onChange={(event) => updateField("customInstructions", event.target.value)} placeholder="e.g., Always greet customers by name. Never discuss competitor prices." className="border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand" />
                  <CharacterCounter current={form.customInstructions.length} max={1000} />
                </Field>
                <Field label="Message when AI can't answer">
                  <Textarea value={form.fallbackMessage} onChange={(event) => updateField("fallbackMessage", event.target.value)} className="border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand" />
                </Field>
              </div>
            </StepCard>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button type="button" variant="outline" onClick={goBack} disabled={step === 1 || isSaving} className="gap-2 border-[#2a2a2a] bg-transparent">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          {step < 4 ? (
            <Button type="button" onClick={goNext} className="gap-2 bg-brand text-black hover:bg-brand-dark">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={saveOnboarding} disabled={isSaving} className="min-w-36 bg-brand text-black hover:bg-brand-dark">
              {isSaving ? <LoadingSpinner size="sm" className="border-black border-t-transparent" /> : "Finish setup"}
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}

function Field({ label, helper, required, children }: { label: string; helper?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="ml-1 text-brand">*</span>}
      </Label>
      {children}
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}

function NextStepCard({ title, detail, href, primary }: { title: string; detail: string; href: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={cn("rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4 text-left transition-colors hover:border-brand", primary && "border-brand bg-brand text-black")}
    >
      <span className="block font-semibold">{title}</span>
      <span className={cn("mt-1 block text-xs", primary ? "text-black/70" : "text-muted-foreground")}>{detail}</span>
    </Link>
  );
}
