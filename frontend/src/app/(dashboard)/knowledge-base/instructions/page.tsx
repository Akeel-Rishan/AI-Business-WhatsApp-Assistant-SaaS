"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Loader2, RefreshCw, Save } from "lucide-react";
import { DynamicRuleList } from "@/components/knowledge-base/DynamicRuleList";
import { CharacterCounter } from "@/components/shared/CharacterCounter";
import { PageLoader } from "@/components/shared/PageLoader";
import { TagInput } from "@/components/shared/TagInput";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useInstructions } from "@/hooks/useInstructions";
import { useToast } from "@/hooks/useToast";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";
import type { Business, BusinessInstructions } from "@/types/database";

const languages = ["English", "Sinhala", "Tamil", "English + Sinhala", "English + Tamil", "All three"];

export default function InstructionsPage() {
  const { business, loading: userLoading } = useUser();
  const {
    instructions,
    loading,
    error,
    isDirty,
    saving,
    updateField,
    saveInstructions,
    resetToSaved
  } = useInstructions(business?.id);
  const { toast } = useToast();
  const [previewOpen, setPreviewOpen] = useState(false);

  const promptPreview = useMemo(
    () => buildPromptPreview(business, instructions),
    [business, instructions]
  );
  const estimatedTokens = Math.ceil(promptPreview.length / 4);

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "You have unsaved changes. Are you sure you want to leave?";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  async function handleSave() {
    try {
      await saveInstructions();
      toast({ title: "Instructions saved", description: "Your AI context has been updated.", variant: "success" });
    } catch (err) {
      toast({
        title: "Could not save instructions",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error"
      });
    }
  }

  async function handleCopyPrompt() {
    await navigator.clipboard.writeText(promptPreview);
    toast({ title: "Prompt copied", description: "The AI context preview is ready to paste.", variant: "success" });
  }

  if (userLoading || loading) {
    return <PageLoader />;
  }

  if (!instructions) {
    return (
      <Alert variant="destructive" className="border-red-500/40 bg-red-500/10">
        <AlertDescription>{error ?? "Could not load AI instructions."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-16 z-20 -mx-4 border-b border-sidebar-border bg-[#0a0a0a]/95 px-4 py-4 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">AI Context Builder</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">AI Instructions</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Define exactly how your AI assistant thinks, speaks, and handles different situations
            </p>
          </div>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="gap-2 bg-brand text-black hover:bg-brand/90"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save All
            {isDirty ? <span className="ml-1 h-2 w-2 rounded-full bg-yellow-400" /> : null}
          </Button>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm">
          {isDirty ? (
            <>
              <span className="h-2 w-2 rounded-full bg-yellow-400" />
              <span className="text-yellow-300">Unsaved changes</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-brand" />
              <span className="text-muted-foreground">All changes saved</span>
            </>
          )}
        </div>
      </div>

      {isDirty ? (
        <div className="sticky top-[9.5rem] z-10 flex flex-col gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-yellow-100">
            <AlertTriangle className="h-4 w-4 text-yellow-300" />
            <span>You have unsaved changes</span>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" className="bg-brand text-black hover:bg-brand/90" onClick={handleSave} disabled={saving}>
              Save Now
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={resetToSaved} disabled={saving}>
              Discard
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive" className="border-red-500/40 bg-red-500/10">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        <div className="space-y-6">
          <ConfigSection title="Business Personality" description="Define your AI's character and communication style">
            <Field label="AI Assistant Name" helper="This is how the AI refers to itself in conversations">
              <Input
                value={instructions.assistant_name}
                maxLength={30}
                onChange={(event) => updateField("assistant_name", event.target.value)}
                placeholder="e.g., Aria, Max, Lexi, or Assistant"
                className="border-sidebar-border bg-[#0a0a0a]"
              />
            </Field>

            <Field label="Personality & Style">
              <Textarea
                value={instructions.personality_description ?? ""}
                maxLength={500}
                onChange={(event) => updateField("personality_description", event.target.value || null)}
                placeholder="e.g., Friendly and helpful. Always greet customers warmly. Use simple language. Never be rude or dismissive."
                className="min-h-32 resize-none border-sidebar-border bg-[#0a0a0a]"
              />
              <CharacterCounter current={(instructions.personality_description ?? "").length} max={500} />
            </Field>

            <Field label="Default Greeting Message" helper="Sent when a new customer messages for the first time">
              <Textarea
                value={instructions.conversation_opener ?? ""}
                maxLength={300}
                onChange={(event) => updateField("conversation_opener", event.target.value || null)}
                placeholder="e.g., Hi! Welcome to [Business Name]. I'm your virtual assistant. How can I help you today?"
                className="min-h-28 resize-none border-sidebar-border bg-[#0a0a0a]"
              />
            </Field>
          </ConfigSection>

          <ConfigSection title="Always Do" description="Rules the AI must follow in every conversation">
            <DynamicRuleList
              label="Always Do Rules"
              rules={instructions.always_do_rules}
              onChange={(rules) => updateField("always_do_rules", rules)}
              placeholder="e.g., Always ask for the customer's name if not provided"
              maxRules={10}
            />
          </ConfigSection>

          <ConfigSection title="Never Do" description="Hard restrictions the AI must never violate">
            <DynamicRuleList
              label="Never Do Rules"
              rules={instructions.never_do_rules}
              onChange={(rules) => updateField("never_do_rules", rules)}
              placeholder="e.g., Never promise a delivery date you are not sure about"
              maxRules={10}
            />
          </ConfigSection>

          <ConfigSection title="Topic Restrictions" description="Subjects the AI should avoid or redirect away from">
            <Field label="Restricted Topics" helper="The AI will politely decline to discuss these topics">
              <TagInput
                tags={instructions.restricted_topics}
                onChange={(topics) => updateField("restricted_topics", topics)}
                placeholder="politics, religion, competitor pricing"
                maxTags={10}
              />
            </Field>
            <Field label="Redirect Response" helper="What the AI says when a customer brings up a restricted topic">
              <Textarea
                value={instructions.redirect_message ?? ""}
                maxLength={300}
                onChange={(event) => updateField("redirect_message", event.target.value || null)}
                placeholder="That's outside what I can help with here. Is there anything about our products or services I can assist you with?"
                className="min-h-28 resize-none border-sidebar-border bg-[#0a0a0a]"
              />
            </Field>
          </ConfigSection>

          <ConfigSection title="Human Handoff" description="When should the AI stop and alert you to take over">
            <Field label="Handoff Keyword" helper="If a customer types this word, the AI stops and alerts you">
              <Input
                value={instructions.escalation_keyword}
                onChange={(event) => updateField("escalation_keyword", event.target.value)}
                placeholder="e.g., human, agent, speak to someone"
                className="border-sidebar-border bg-[#0a0a0a]"
              />
            </Field>
            <DynamicRuleList
              label="Also escalate when..."
              rules={instructions.escalation_situations}
              onChange={(rules) => updateField("escalation_situations", rules)}
              placeholder="e.g., Customer seems angry or frustrated"
              maxRules={8}
            />
            <Field label="Handoff Message" helper="Message sent to the customer when handing off to a human">
              <Textarea
                value={instructions.escalation_message ?? ""}
                maxLength={300}
                onChange={(event) => updateField("escalation_message", event.target.value || null)}
                placeholder="I'm connecting you with our team right away. Please hold on for a moment."
                className="min-h-28 resize-none border-sidebar-border bg-[#0a0a0a]"
              />
            </Field>
          </ConfigSection>

          <ConfigSection title="Response Style" description="Control how the AI formats and lengths its replies">
            <Field label="Max Response Length" helper="Shorter responses feel more natural on WhatsApp">
              <div className="space-y-3">
                <input
                  type="range"
                  min={50}
                  max={500}
                  step={10}
                  value={instructions.max_response_length}
                  onChange={(event) => updateField("max_response_length", Number(event.target.value))}
                  className="w-full accent-[#25D366]"
                />
                <p className="text-sm font-medium text-white">~{instructions.max_response_length} words per response</p>
              </div>
            </Field>
            <SwitchField
              label="Use emojis in responses"
              helper="Makes responses feel friendlier on WhatsApp"
              checked={instructions.use_emojis}
              onChange={(checked) => updateField("use_emojis", checked)}
            />
            <SwitchField
              label="Use bullet points for lists"
              helper="Helps customers scan information quickly"
              checked={instructions.use_bullet_points}
              onChange={(checked) => updateField("use_bullet_points", checked)}
            />
            <Field label="Response Language Note">
              <Select value={normalizeLanguage(instructions.response_language)} onValueChange={(value) => updateField("response_language", value)}>
                <SelectTrigger className="border-sidebar-border bg-[#0a0a0a]">
                  <SelectValue placeholder="Select language" />
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
          </ConfigSection>

          <ConfigSection title="Closing Messages" description="How the AI ends conversations or follows up">
            <Field label="Sign-off Message">
              <Textarea
                value={instructions.conversation_closer ?? ""}
                maxLength={300}
                onChange={(event) => updateField("conversation_closer", event.target.value || null)}
                placeholder="Is there anything else I can help you with today? Feel free to message us anytime."
                className="min-h-28 resize-none border-sidebar-border bg-[#0a0a0a]"
              />
            </Field>
            <Field label="After Hours Reply" helper="[opening_hours] will be replaced with your actual hours">
              <Textarea
                value={instructions.after_hours_message ?? ""}
                maxLength={300}
                onChange={(event) => updateField("after_hours_message", event.target.value || null)}
                placeholder="Thanks for reaching out. We're currently closed but will reply as soon as we open. Our hours are [opening_hours]."
                className="min-h-28 resize-none border-sidebar-border bg-[#0a0a0a]"
              />
            </Field>
          </ConfigSection>
        </div>

        <aside className="hidden lg:block">
          <ContextPreviewPanel
            prompt={promptPreview}
            estimatedTokens={estimatedTokens}
            saving={saving}
            isDirty={isDirty}
            onRefresh={() => toast({ title: "Preview refreshed", variant: "info" })}
            onSave={handleSave}
            onCopy={handleCopyPrompt}
          />
        </aside>

        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setPreviewOpen((current) => !current)}
            className="flex w-full items-center justify-between rounded-lg border border-sidebar-border bg-[#111111] p-4 text-left"
          >
            <span>
              <span className="block text-sm font-semibold text-white">Preview AI Context</span>
              <span className="text-xs text-muted-foreground">Open the prompt sent to Gemini</span>
            </span>
            <RefreshCw className={cn("h-4 w-4 transition-transform", previewOpen && "rotate-180")} />
          </button>
          {previewOpen ? (
            <div className="mt-3">
              <ContextPreviewPanel
                prompt={promptPreview}
                estimatedTokens={estimatedTokens}
                saving={saving}
                isDirty={isDirty}
                onRefresh={() => toast({ title: "Preview refreshed", variant: "info" })}
                onSave={handleSave}
                onCopy={handleCopyPrompt}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ConfigSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-sidebar-border bg-[#111111] p-5">
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="my-5 h-px bg-sidebar-border" />
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, helper, children }: { label: string; helper?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function SwitchField({
  label,
  helper,
  checked,
  onChange
}: {
  label: string;
  helper: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-sidebar-border bg-[#0a0a0a] p-4">
      <div>
        <Label>{label}</Label>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ContextPreviewPanel({
  prompt,
  estimatedTokens,
  saving,
  isDirty,
  onRefresh,
  onSave,
  onCopy
}: {
  prompt: string;
  estimatedTokens: number;
  saving: boolean;
  isDirty: boolean;
  onRefresh: () => void;
  onSave: () => void;
  onCopy: () => void;
}) {
  return (
    <div className="sticky top-36 rounded-lg border border-sidebar-border bg-[#161616] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">AI Context Preview</h3>
          <p className="mt-1 text-sm text-muted-foreground">This is sent to Gemini with every customer message</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
          <span className="sr-only">Refresh preview</span>
        </Button>
      </div>

      <pre className="mt-4 max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-lg border border-sidebar-border bg-[#0a0a0a] p-4 font-mono text-xs leading-5 text-muted-foreground">
        {prompt}
      </pre>

      <p
        className={cn(
          "mt-3 text-xs font-medium",
          estimatedTokens < 1000 && "text-brand",
          estimatedTokens >= 1000 && estimatedTokens <= 2000 && "text-yellow-400",
          estimatedTokens > 2000 && "text-red-400"
        )}
      >
        Estimated tokens: ~{estimatedTokens}
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button type="button" onClick={onSave} disabled={saving || !isDirty} className="gap-2 bg-brand text-black hover:bg-brand/90">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Instructions
        </Button>
        <Button type="button" variant="ghost" onClick={onCopy} className="gap-2">
          <Copy className="h-4 w-4" />
          Copy Prompt
        </Button>
      </div>
    </div>
  );
}

function normalizeLanguage(value: string) {
  const match = languages.find((language) => language.toLowerCase() === value.toLowerCase());
  return match ?? "English";
}

function listLines(items: string[]) {
  const clean = items.map((item) => item.trim()).filter(Boolean);
  return clean.length > 0 ? clean.map((item) => `- ${item}`).join("\n") : "- None configured";
}

function buildPromptPreview(business: Business | null, instructions: BusinessInstructions | null) {
  if (!instructions) {
    return "--- SYSTEM PROMPT PREVIEW ---\n\nLoading instructions...\n\n--- END OF SYSTEM PROMPT ---";
  }

  return `--- SYSTEM PROMPT PREVIEW ---

BUSINESS: ${business?.name ?? "Business"}
DESCRIPTION: ${business?.description ?? "Not provided"}
HOURS: ${business?.opening_hours ?? "Not provided"}
CONTACT: ${business?.contact_info ?? "Not provided"}

ASSISTANT NAME: ${instructions.assistant_name}
PERSONALITY: ${instructions.personality_description ?? "Not provided"}
TONE: ${instructions.ai_tone}
LANGUAGE: ${normalizeLanguage(instructions.response_language)}
MAX RESPONSE: ~${instructions.max_response_length} words

GREETING: ${instructions.conversation_opener ?? "Not provided"}

ALWAYS DO:
${listLines(instructions.always_do_rules)}

NEVER DO:
${listLines(instructions.never_do_rules)}

RESTRICTED TOPICS: ${instructions.restricted_topics.length ? instructions.restricted_topics.join(", ") : "None configured"}
REDIRECT RESPONSE: ${instructions.redirect_message ?? "Not provided"}

ESCALATION KEYWORD: ${instructions.escalation_keyword}
ESCALATION MESSAGE: ${instructions.escalation_message ?? "Not provided"}
ESCALATE WHEN:
${listLines(instructions.escalation_situations)}

SIGN-OFF: ${instructions.conversation_closer ?? "Not provided"}
AFTER HOURS: ${instructions.after_hours_message ?? "Not provided"}

--- END OF SYSTEM PROMPT ---`;
}
