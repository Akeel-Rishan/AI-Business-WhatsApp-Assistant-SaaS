"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  Loader2,
  MessageSquareOff,
  Phone,
  RefreshCw,
  ShieldCheck,
  XCircle
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import { useWhatsAppConnection } from "@/hooks/useWhatsAppConnection";
import { generateVerifyToken, getWebhookUrl } from "@/lib/utils/webhook";
import { cn } from "@/lib/utils";
import type { ConnectionTestResult, WhatsAppCredentialsInput } from "@/types/database";

const steps = ["Get Credentials", "Enter Details", "Configure Webhook", "Test & Activate"];

type CredentialForm = Omit<WhatsAppCredentialsInput, "business_id">;
type CopyKey = "webhook" | "verify" | "ngrok" | "guide-env" | "guide-webhook";

const emptyForm: CredentialForm = {
  whatsapp_number: "",
  whatsapp_phone_id: "",
  whatsapp_access_token: "",
  webhook_verify_token: ""
};

function formatDate(value: string | null) {
  if (!value) return "Recently";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function maskPhoneId(preview: string | null) {
  return preview ? `••••••${preview}` : "Not available";
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="grid grid-cols-4 gap-1" aria-label={`Setup step ${current} of 4`}>
      {steps.map((label, index) => {
        const number = index + 1;
        const complete = number < current;
        const active = number === current;
        return (
          <div key={label} className="relative flex min-w-0 flex-col items-center text-center">
            {index > 0 ? (
              <span className={cn("absolute right-1/2 top-4 h-px w-full", number <= current ? "bg-brand" : "bg-[#303030]")} />
            ) : null}
            <span
              className={cn(
                "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-all duration-300",
                (complete || active) && "border-brand bg-brand text-black",
                !complete && !active && "border-[#3a3a3a] bg-[#151515] text-zinc-500"
              )}
            >
              {complete ? <Check className="h-4 w-4" /> : number}
            </span>
            <span className={cn("mt-2 hidden text-[11px] leading-tight sm:block", active ? "text-white" : "text-zinc-500")}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function CopyBlock({ value, copyKey, copied, onCopy }: { value: string; copyKey: CopyKey; copied: CopyKey | null; onCopy: (key: CopyKey, value: string) => void }) {
  const isCopied = copied === copyKey;
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-md border border-[#292929] bg-[#090909] p-3">
      <code className="min-w-0 flex-1 break-all font-mono text-xs text-zinc-300 sm:text-sm">{value}</code>
      <Button type="button" size="sm" variant="ghost" className={cn("shrink-0 gap-2", isCopied && "text-brand")} onClick={() => onCopy(copyKey, value)}>
        {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        <span className="hidden sm:inline">{isCopied ? "Copied!" : "Copy"}</span>
      </Button>
    </div>
  );
}

function HelpSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#242424] last:border-0">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-white">
        {title}
        <ChevronDown className={cn("h-4 w-4 text-zinc-500 transition-transform", open && "rotate-180")} />
      </button>
      {open ? <div className="pb-5 text-sm leading-6 text-zinc-400">{children}</div> : null}
    </div>
  );
}

function SetupGuide({ copied, onCopy }: { copied: CopyKey | null; onCopy: (key: CopyKey, value: string) => void }) {
  const envCode = `WEBHOOK_VERIFY_TOKEN=your_random_secret_token\nMETA_APP_SECRET=your_meta_app_secret\nMETA_API_VERSION=v19.0\nWHATSAPP_API_URL=https://graph.facebook.com`;
  const webhookCode = "https://your-backend-url/api/v1/webhook/whatsapp";
  return (
    <div className="space-y-8 pb-10 pr-2 text-sm leading-6 text-zinc-300">
      <GuideStep number="1" title="Create a Meta Developer account">
        Go to <a className="text-brand hover:underline" href="https://developers.facebook.com" target="_blank" rel="noreferrer">developers.facebook.com</a>, sign in, and enable Meta Business tools for your account.
      </GuideStep>
      <GuideStep number="2" title="Create a Business app">
        Select <strong className="text-white">Create App</strong>, choose the Business type, finish app creation, and add the WhatsApp product from the app dashboard.
      </GuideStep>
      <GuideStep number="3" title="Collect credentials">
        Copy the Phone Number ID and temporary access token from WhatsApp → API Setup. Copy the App Secret from Settings → Basic. Use a System User token for production because temporary tokens expire.
        <div className="mt-4"><CopyBlock value={envCode} copyKey="guide-env" copied={copied} onCopy={onCopy} /></div>
      </GuideStep>
      <GuideStep number="4" title="Configure the webhook">
        In WhatsApp → Configuration, edit the webhook and provide your callback URL and verify token. Subscribe to the <code className="rounded bg-black px-1.5 py-0.5 font-mono text-brand">messages</code> field.
        <div className="mt-4"><CopyBlock value={webhookCode} copyKey="guide-webhook" copied={copied} onCopy={onCopy} /></div>
      </GuideStep>
      <GuideStep number="5" title="Test delivery">
        Use Meta&apos;s Test action, inspect backend logs, then confirm that a row appears in <code className="rounded bg-black px-1.5 py-0.5 font-mono">webhook_logs</code>.
      </GuideStep>
      <GuideStep number="6" title="Add a test recipient">
        In WhatsApp → API Setup, add your personal WhatsApp number in the To field, verify it, and send a message to your test business number.
      </GuideStep>
      <div className="rounded-md border border-blue-500/20 bg-blue-500/10 p-4">
        <h3 className="font-semibold text-blue-200">Local development</h3>
        <pre className="mt-3 overflow-x-auto rounded-md bg-black p-4 font-mono text-xs text-zinc-300">ngrok http 8000</pre>
        <p className="mt-3 text-zinc-400">Use the generated HTTPS domain followed by <code className="font-mono">/api/v1/webhook/whatsapp</code>.</p>
      </div>
    </div>
  );
}

function GuideStep({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-[2rem_1fr] gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand font-bold text-black">{number}</span>
      <div><h3 className="mb-2 text-base font-semibold text-white">{title}</h3><div>{children}</div></div>
    </section>
  );
}

function TestRow({ visible, running, passed, name, detail, error, informational = false }: { visible: boolean; running: boolean; passed: boolean; name: string; detail: string; error?: string; informational?: boolean }) {
  if (!visible) return null;
  return (
    <div className="animate-in slide-in-from-bottom-2 fade-in flex items-start gap-3 border-b border-[#252525] py-4 last:border-0">
      {running ? <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-blue-400" /> : informational ? <HelpCircle className="mt-0.5 h-5 w-5 text-blue-400" /> : passed ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-brand" /> : <XCircle className="mt-0.5 h-5 w-5 text-red-400" />}
      <div><p className="text-sm font-semibold text-white">{name}</p><p className={cn("mt-1 text-xs", error ? "text-red-300" : "text-zinc-500")}>{error || detail}</p></div>
    </div>
  );
}

export function WhatsAppConnectionPanel({ businessId, initialNumber = "" }: { businessId: string; initialNumber?: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const wizardRef = useRef<HTMLDivElement>(null);
  const { connection, loading, error, saveCredentials, testConnection, disconnect, setAiEnabled, refetch } = useWhatsAppConnection(businessId);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CredentialForm>({ ...emptyForm, whatsapp_number: initialNumber ?? "" });
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState<CopyKey | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [ngrokOpen, setNgrokOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [testAnimating, setTestAnimating] = useState(false);
  const [visibleTests, setVisibleTests] = useState(0);
  const [aiUpdating, setAiUpdating] = useState(false);
  const [setupActive, setSetupActive] = useState(false);
  const webhookUrl = useMemo(() => getWebhookUrl(), []);
  const storageKey = `whatsapp-setup-step-${businessId}`;
  const tokenKey = `whatsapp-verify-token-${businessId}`;

  useEffect(() => {
    const savedStep = Number(window.localStorage.getItem(storageKey));
    const savedToken = window.localStorage.getItem(tokenKey);
    const nextStep = savedStep >= 1 && savedStep <= 4 ? savedStep : 1;
    const verifyToken = savedToken && nextStep >= 3 ? savedToken : generateVerifyToken(businessId);
    setStep(nextStep);
    setSetupActive(Boolean(savedStep >= 2 && savedStep <= 4));
    setForm((current) => ({ ...current, whatsapp_number: initialNumber || current.whatsapp_number, webhook_verify_token: verifyToken }));
    window.localStorage.setItem(tokenKey, verifyToken);
  }, [businessId, initialNumber, storageKey, tokenKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, String(step));
  }, [step, storageKey]);

  function goToStep(value: number) {
    setSetupActive(true);
    setStep(Math.max(1, Math.min(4, value)));
    window.setTimeout(() => wizardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function handleCopy(key: CopyKey, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied((current) => current === key ? null : current), 2000);
  }

  function regenerateToken() {
    const token = generateVerifyToken(businessId);
    setForm((current) => ({ ...current, webhook_verify_token: token }));
    window.localStorage.setItem(tokenKey, token);
  }

  async function handleSave() {
    const missing = Object.entries(form).filter(([, value]) => !value.trim()).map(([key]) => key);
    if (missing.length) {
      setFormError("Complete every credential field before continuing.");
      return;
    }
    if (!/^\+\d{7,15}$/.test(form.whatsapp_number.replace(/\s/g, ""))) {
      setFormError("Use international phone format with country code, for example +94771234567.");
      return;
    }
    if (!/^\d+$/.test(form.whatsapp_phone_id)) {
      setFormError("Phone Number ID must contain numbers only.");
      return;
    }
    setFormError(null);
    try {
      await saveCredentials({ business_id: businessId, ...form, whatsapp_number: form.whatsapp_number.replace(/\s/g, "") });
      setSetupActive(true);
      toast({ title: "Credentials saved", description: "Your token remains write-only and will not be shown again.", variant: "success" });
      goToStep(3);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save credentials.");
    }
  }

  async function handleTest() {
    setTestResult(null);
    setVisibleTests(1);
    setTestAnimating(true);
    const timer = window.setInterval(() => setVisibleTests((current) => Math.min(4, current + 1)), 500);
    try {
      const result = await testConnection();
      window.clearInterval(timer);
      setTestResult(result);
      setVisibleTests(0);
      for (let index = 1; index <= 4; index += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 500));
        setVisibleTests(index);
      }
      if (result.overall_success) {
        window.localStorage.removeItem(storageKey);
        setSetupActive(false);
        toast({ title: "WhatsApp connected", description: `Verified as ${result.verified_name ?? "your Meta business"}.`, variant: "success" });
      }
    } catch (err) {
      window.clearInterval(timer);
      toast({ title: "Connection test failed", description: err instanceof Error ? err.message : "Please try again.", variant: "error" });
    } finally {
      setTestAnimating(false);
    }
  }

  async function handleDisconnect() {
    try {
      await disconnect();
      window.localStorage.removeItem(storageKey);
      window.localStorage.removeItem(tokenKey);
      setStep(1);
      setSetupActive(false);
      setTestResult(null);
      setForm({ ...emptyForm, whatsapp_number: connection.whatsappNumber ?? initialNumber ?? "", webhook_verify_token: generateVerifyToken(businessId) });
      toast({ title: "WhatsApp disconnected", description: "Conversations and knowledge-base content were preserved.", variant: "success" });
    } catch (err) {
      toast({ title: "Disconnect failed", description: err instanceof Error ? err.message : "Please try again.", variant: "error" });
    } finally {
      setDisconnectOpen(false);
    }
  }

  async function handleAiToggle(enabled: boolean) {
    setAiUpdating(true);
    try {
      await setAiEnabled(enabled);
      toast({ title: enabled ? "AI auto-reply activated" : "AI auto-reply paused", variant: "success" });
    } catch (err) {
      toast({ title: "Could not update AI", description: err instanceof Error ? err.message : "Please try again.", variant: "error" });
    } finally {
      setAiUpdating(false);
    }
  }

  const activeResult = testResult ?? connection.testResult;
  const fullyConnected = connection.status === "connected" && !setupActive && (!activeResult || activeResult.overall_success);
  const showWizard = !fullyConnected || Boolean(testResult?.overall_success);
  const testError = activeResult ? Object.values(activeResult.errors)[0] : error;

  if (loading) {
    return <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-[#1f1f1f] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase text-brand">Meta Cloud API</p><h1 className="mt-2 text-3xl font-semibold text-white">WhatsApp Connection</h1><p className="mt-2 max-w-2xl text-sm text-zinc-400">Connect your WhatsApp Business number to start receiving and sending automated messages.</p></div>
        <Badge className={cn("w-fit gap-2 border px-3 py-1.5", fullyConnected ? "border-brand/30 bg-brand/10 text-brand" : connection.status === "error" ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-[#303030] bg-[#171717] text-zinc-400")}>
          <span className={cn("h-2 w-2 rounded-full", fullyConnected ? "bg-brand" : connection.status === "error" ? "bg-red-400" : "bg-zinc-500")} />
          {fullyConnected ? "Connected" : connection.status === "error" ? "Connection Error" : "Not Connected"}
        </Badge>
      </header>

      {fullyConnected ? (
        <div className="flex flex-col gap-5 rounded-md border border-brand bg-[#0d1711] p-5 md:flex-row md:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand/15"><CheckCircle2 className="h-7 w-7 text-brand" /></div>
          <div className="min-w-0 flex-1"><p className="font-semibold text-brand">Connected</p><p className="mt-1 text-lg font-semibold text-white">{connection.whatsappNumber}</p><p className="mt-1 text-xs text-zinc-500">Phone Number ID: {maskPhoneId(connection.phoneNumberIdPreview)} · Connected since {formatDate(connection.connectedSince)}</p></div>
          <div className="flex flex-wrap gap-2"><Button variant="ghost" className="gap-2 text-blue-300" onClick={() => { goToStep(4); void handleTest(); }}><RefreshCw className="h-4 w-4" />Test Connection</Button><Button variant="ghost" className="text-red-300 hover:bg-red-500/10 hover:text-red-200" onClick={() => setDisconnectOpen(true)}>Disconnect</Button></div>
        </div>
      ) : connection.status === "error" ? (
        <div className="flex flex-col gap-4 rounded-md border border-red-500 bg-red-500/5 p-5 sm:flex-row sm:items-center"><AlertTriangle className="h-8 w-8 shrink-0 text-red-400" /><div className="flex-1"><p className="font-semibold text-red-300">Connection Error</p><p className="mt-1 text-sm text-zinc-400">{testError || "The connection could not be verified."}</p></div><Button variant="outline" onClick={() => goToStep(2)}>Retry Setup</Button></div>
      ) : (
        <div className="flex flex-col items-center rounded-md border border-dashed border-[#2a2a2a] bg-[#111111] px-6 py-10 text-center"><MessageSquareOff className="h-12 w-12 text-zinc-600" /><h2 className="mt-4 text-xl font-semibold text-white">WhatsApp Not Connected</h2><p className="mt-2 text-sm text-zinc-500">Follow the steps below to connect your WhatsApp Business number.</p><Button className="mt-5 gap-2" onClick={() => goToStep(1)}>Start Setup<ChevronRight className="h-4 w-4" /></Button></div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(280px,2fr)]">
        <div className="min-w-0">
          {showWizard ? (
            <Card ref={wizardRef} className="scroll-mt-20 overflow-hidden border-[#242424] bg-[#111111]">
              <div className="border-b border-[#242424] bg-[#0d0d0d] px-4 py-5 sm:px-7"><StepIndicator current={step} /></div>
              <CardContent className="p-5 sm:p-7">
                <div key={step} className="animate-in slide-in-from-right-4 fade-in duration-300">
                  {step === 1 ? (
                    <div><StepHeading title="Get your Meta credentials" subtitle="You need three things from Meta Developer Console." /><div className="grid gap-3 md:grid-cols-3"><CredentialCard icon={Phone} tone="blue" title="Phone Number ID" description="Found in Meta Developer Console → WhatsApp → API Setup" path="Meta App → WhatsApp → API Setup → Phone Number ID" /><CredentialCard icon={KeyRound} tone="yellow" title="Access Token" description="Temporary or permanent token from Meta API Setup" path="Temporary tokens expire in 24 hours. Use a System User token for production." /><CredentialCard icon={ShieldCheck} tone="purple" title="App Secret" description="Used by this backend to verify Meta signatures" path="Meta App → Settings → Basic → App Secret" /></div><button type="button" className="mt-5 text-sm font-semibold text-brand hover:underline" onClick={() => setGuideOpen(true)}>Don&apos;t have a Meta App yet?</button><Button className="mt-6 w-full gap-2" onClick={() => goToStep(2)}>I have my credentials<ChevronRight className="h-4 w-4" /></Button></div>
                  ) : null}

                  {step === 2 ? (
                    <div><StepHeading title="Enter your WhatsApp credentials" subtitle="These values are stored securely and the access token is never returned after saving." /><div className="space-y-5"><FormField label="Your WhatsApp Business Number" helper="The number customers will message, including country code."><Input type="tel" value={form.whatsapp_number} onChange={(event) => setForm({ ...form, whatsapp_number: event.target.value })} placeholder="+94771234567" className="border-[#2a2a2a] bg-[#0b0b0b]" /></FormField><FormField label="Phone Number ID" helper="Numeric ID from Meta API Setup page."><Input inputMode="numeric" value={form.whatsapp_phone_id} onChange={(event) => setForm({ ...form, whatsapp_phone_id: event.target.value.replace(/\D/g, "") })} placeholder="1234567890123456" className="border-[#2a2a2a] bg-[#0b0b0b]" /></FormField><FormField label="Access Token" helper="Long-lived or temporary access token."><div className="relative"><Textarea rows={3} value={form.whatsapp_access_token} onChange={(event) => setForm({ ...form, whatsapp_access_token: event.target.value })} placeholder="EAAxxxxx..." className={cn("resize-none border-[#2a2a2a] bg-[#0b0b0b] pr-12 font-mono text-xs", !showToken && "secure-entry")} /><button type="button" title={showToken ? "Hide access token" : "Show access token"} onClick={() => setShowToken((value) => !value)} className="absolute right-3 top-3 text-zinc-500 hover:text-white">{showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></FormField><FormField label="Webhook Verify Token" helper="A secret you choose. It must exactly match Meta's webhook configuration."><div className="flex gap-2"><Input value={form.webhook_verify_token} onChange={(event) => setForm({ ...form, webhook_verify_token: event.target.value })} className="border-[#2a2a2a] bg-[#0b0b0b] font-mono text-xs" /><Button type="button" variant="outline" size="icon" title="Regenerate verify token" onClick={regenerateToken}><RefreshCw className="h-4 w-4" /></Button></div></FormField>{formError || error ? <div className="flex gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{formError || error}</div> : null}<Button className="w-full gap-2" onClick={() => void handleSave()} disabled={connection.saving}>{connection.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{connection.saving ? "Saving securely..." : "Save & Continue"}</Button></div></div>
                  ) : null}

                  {step === 3 ? (
                    <div><StepHeading title="Configure your webhook in Meta" subtitle="Tell Meta where to send incoming WhatsApp events." /><div className="space-y-5"><FormField label="Webhook URL"><CopyBlock value={webhookUrl} copyKey="webhook" copied={copied} onCopy={handleCopy} /></FormField><FormField label="Verify Token"><CopyBlock value={form.webhook_verify_token} copyKey="verify" copied={copied} onCopy={handleCopy} /></FormField><ol className="space-y-4 rounded-md border border-[#252525] bg-[#0d0d0d] p-5">{[<>Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-brand hover:underline">Meta Developer Console</a>.</>, <>Open your App → WhatsApp → Configuration.</>, <>Click <strong className="text-white">Edit</strong> next to Webhook.</>, <>Paste the Webhook URL into Callback URL.</>, <>Paste the Verify Token into Verify Token.</>, <>Click Verify and Save. Your backend must be public HTTPS; use ngrok locally.</>, <>Under Webhook Fields, click Manage and subscribe to <strong className="text-white">messages</strong>.</>].map((instruction, index) => <li key={index} className="flex gap-3 text-sm text-zinc-400"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#202020] text-xs font-bold text-white">{index + 1}</span><span>{instruction}</span></li>)}</ol><div className="rounded-md border border-blue-500/20 bg-blue-500/5"><button type="button" className="flex w-full items-center justify-between p-4 text-left text-sm font-semibold text-blue-200" onClick={() => setNgrokOpen((value) => !value)}>Testing locally? Use ngrok<ChevronDown className={cn("h-4 w-4 transition-transform", ngrokOpen && "rotate-180")} /></button>{ngrokOpen ? <div className="px-4 pb-4"><CopyBlock value={`npm install -g ngrok\nngrok http 8000`} copyKey="ngrok" copied={copied} onCopy={handleCopy} /></div> : null}</div><Button className="w-full gap-2" onClick={() => goToStep(4)}>I&apos;ve configured the webhook<ChevronRight className="h-4 w-4" /></Button></div></div>
                  ) : null}

                  {step === 4 ? (
                    <div><StepHeading title="Test your connection" subtitle="Verify the saved credentials directly against the Meta Graph API." />{!testResult?.overall_success ? <Button size="lg" className="w-full gap-2" onClick={() => void handleTest()} disabled={connection.testing || testAnimating}>{connection.testing || testAnimating ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}{connection.testing ? "Contacting Meta..." : testAnimating ? "Checking results..." : "Run Connection Test"}</Button> : null}<div className="mt-5 rounded-md border border-[#252525] bg-[#0d0d0d] px-4"><TestRow visible={visibleTests >= 1 || connection.testing} running={connection.testing && !testResult} passed={Boolean(testResult?.credentials_saved)} name="Credentials Saved" detail="All required connection fields are stored." error={testResult?.errors.credentials} /><TestRow visible={visibleTests >= 2} running={connection.testing && !testResult} passed={Boolean(testResult?.meta_api_reachable)} name="Meta API Reachable" detail="The Graph API accepted the request." error={testResult?.errors.access_token || testResult?.errors.meta_api} /><TestRow visible={visibleTests >= 3} running={connection.testing && !testResult} passed={Boolean(testResult?.phone_number_valid)} name="Phone Number Active" detail={testResult?.verified_name ? `Verified as: ${testResult.verified_name}` : "Meta returned a verified business identity."} error={testResult?.errors.phone_number} /><TestRow visible={visibleTests >= 4} running={false} passed informational name="Webhook Accessible" detail="Meta confirms this when Step 3 saves without an error." /></div>{testResult?.overall_success ? <div className="animate-in zoom-in-95 fade-in mt-6 rounded-md border border-brand/30 bg-brand/10 p-6 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand"><Check className="h-8 w-8 text-black" /></div><h3 className="mt-4 text-xl font-semibold text-white">Your WhatsApp is connected!</h3><p className="mt-2 text-sm text-zinc-400">Verified as {testResult.verified_name}. Messages can now enter the assistant pipeline.</p><div className="mt-6 flex items-center justify-between rounded-md border border-brand/20 bg-black/20 p-4 text-left"><div><p className="font-semibold text-white">AI Auto-Reply</p><p className="mt-1 text-xs text-zinc-500">Automatically respond to customer messages.</p></div><Switch checked={connection.aiEnabled} disabled={aiUpdating} onCheckedChange={(value) => void handleAiToggle(value)} /></div><Button className="mt-5 w-full" onClick={() => router.push("/dashboard")}>Go to Dashboard</Button></div> : testResult && !testResult.overall_success ? <Button variant="outline" className="mt-5 w-full" onClick={() => goToStep(2)}>Back to Step 2</Button> : null}</div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="xl:sticky xl:top-20">
          <Card className="border-[#242424] bg-[#111111]"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><HelpCircle className="h-5 w-5 text-brand" />Setup help</CardTitle></CardHeader><CardContent className="pt-0"><HelpSection title="What you need" defaultOpen><ul className="space-y-2">{["Meta Business Account", "WhatsApp Business number", "Meta Developer App with WhatsApp", "Public HTTPS webhook URL or ngrok"].map((item) => <li key={item} className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-brand" />{item}</li>)}</ul></HelpSection><HelpSection title="Common issues"><dl className="space-y-4"><div><dt className="font-medium text-white">Webhook verification failed</dt><dd>Check that the verify token matches exactly.</dd></div><div><dt className="font-medium text-white">Invalid access token</dt><dd>Temporary tokens expire. Generate a new token.</dd></div><div><dt className="font-medium text-white">Messages not arriving</dt><dd>Subscribe the webhook to the messages field.</dd></div><div><dt className="font-medium text-white">Can&apos;t find Phone Number ID</dt><dd>Open WhatsApp → API Setup under your Meta app.</dd></div></dl></HelpSection><HelpSection title="Temporary vs permanent token"><p>Temporary tokens expire in 24 hours and are suitable for testing. Production requires a System User token in Meta Business Manager.</p><button type="button" onClick={() => setGuideOpen(true)} className="mt-3 font-semibold text-brand hover:underline">How to create a permanent token →</button></HelpSection><HelpSection title="Need help?"><button type="button" onClick={() => setGuideOpen(true)} className="block font-semibold text-brand hover:underline">View full setup guide</button><a href="https://developers.facebook.com/docs/whatsapp/cloud-api" target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-2 font-semibold text-blue-300 hover:underline">WhatsApp API docs<ExternalLink className="h-3.5 w-3.5" /></a></HelpSection></CardContent></Card>
        </aside>
      </div>

      <Sheet open={guideOpen} onOpenChange={setGuideOpen}><SheetContent side="right" className="w-[min(100vw,720px)] max-w-none overflow-y-auto border-[#252525] bg-[#111111] p-6 sm:p-8"><SheetHeader className="mb-8 border-b border-[#252525] pb-5"><SheetTitle className="text-2xl text-white">WhatsApp / Meta Setup Guide</SheetTitle><SheetDescription>Complete setup from Meta app creation through webhook testing.</SheetDescription></SheetHeader><SetupGuide copied={copied} onCopy={handleCopy} /></SheetContent></Sheet>

      <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Disconnect WhatsApp?</AlertDialogTitle><AlertDialogDescription>Your AI will stop responding to customer messages immediately. You can reconnect at any time.</AlertDialogDescription></AlertDialogHeader><div className="rounded-md border border-red-500/20 bg-red-500/5 p-4 text-sm text-zinc-400"><p className="mb-2 font-semibold text-red-300">This will:</p><ul className="space-y-2"><li>• Disable AI auto-reply</li><li>• Preserve existing conversations</li><li>• Keep your knowledge base unchanged</li></ul></div><AlertDialogFooter><AlertDialogCancel asChild><Button variant="ghost">Cancel</Button></AlertDialogCancel><AlertDialogAction disabled={connection.disconnecting} onClick={(event) => { event.preventDefault(); void handleDisconnect(); }}>{connection.disconnecting ? "Disconnecting..." : "Disconnect"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="mb-6"><h2 className="text-xl font-semibold text-white">{title}</h2><p className="mt-2 text-sm text-zinc-500">{subtitle}</p></div>;
}

function CredentialCard({ icon: Icon, tone, title, description, path }: { icon: typeof Phone; tone: "blue" | "yellow" | "purple"; title: string; description: string; path: string }) {
  return <div className="rounded-md border border-[#292929] bg-[#0d0d0d] p-4"><div className={cn("flex h-10 w-10 items-center justify-center rounded-md", tone === "blue" && "bg-blue-500/10 text-blue-300", tone === "yellow" && "bg-yellow-500/10 text-yellow-300", tone === "purple" && "bg-purple-500/10 text-purple-300")}><Icon className="h-5 w-5" /></div><h3 className="mt-4 font-semibold text-white">{title}</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{description}</p><p className="mt-3 border-t border-[#242424] pt-3 text-[11px] leading-4 text-zinc-600">{path}</p></div>;
}

function FormField({ label, helper, children }: { label: string; helper?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}{helper ? <p className="text-xs text-zinc-500">{helper}</p> : null}</div>;
}
