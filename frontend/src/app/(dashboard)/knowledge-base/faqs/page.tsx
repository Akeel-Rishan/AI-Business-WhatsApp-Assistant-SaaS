"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CheckCircle2,
  HelpCircle,
  Layers3,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  XCircle
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FAQCard } from "@/components/knowledge-base/FAQCard";
import { PageLoader } from "@/components/shared/PageLoader";
import { useFAQs } from "@/hooks/useFAQs";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useToast } from "@/hooks/useToast";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";
import type { FAQ } from "@/types/database";

type FAQFilter = "all" | "active" | "inactive";
type ModalMode = "add" | "edit";

const QUESTION_LIMIT = 300;
const ANSWER_LIMIT = 1000;

const filters: { value: FAQFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" }
];

type FAQFormState = {
  question: string;
  answer: string;
  is_active: boolean;
};

const initialForm: FAQFormState = {
  question: "",
  answer: "",
  is_active: true
};

export default function FAQsPage() {
  const { business, loading: userLoading } = useUser();
  const { faqs, loading, error, addFAQ, updateFAQ, deleteFAQ, toggleActive, refetch } = useFAQs(business?.id);
  const { toast } = useToast();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FAQFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>("add");
  const [selectedFAQ, setSelectedFAQ] = useState<FAQ | null>(null);
  const [form, setForm] = useState<FAQFormState>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FAQ | null>(null);
  const [deleting, setDeleting] = useState(false);

  const stats = useMemo(() => {
    const active = faqs.filter((faq) => faq.is_active).length;
    return {
      total: faqs.length,
      active,
      inactive: faqs.length - active
    };
  }, [faqs]);

  const filteredFAQs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return faqs.filter((faq) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && faq.is_active) ||
        (filter === "inactive" && !faq.is_active);
      const matchesSearch =
        !normalizedQuery ||
        faq.question.toLowerCase().includes(normalizedQuery) ||
        faq.answer.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesSearch;
    });
  }, [faqs, filter, query]);

  function openAddModal() {
    setMode("add");
    setSelectedFAQ(null);
    setForm(initialForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(faq: FAQ) {
    setMode("edit");
    setSelectedFAQ(faq);
    setForm({
      question: faq.question,
      answer: faq.answer,
      is_active: faq.is_active
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!business?.id) {
      setFormError("Business profile is still loading. Please try again.");
      return;
    }

    const question = form.question.trim();
    const answer = form.answer.trim();

    if (!question || !answer) {
      setFormError("Question and answer are required.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (mode === "add") {
        await addFAQ({
          business_id: business.id,
          question,
          answer,
          is_active: form.is_active
        });
        toast({ title: "FAQ added successfully", variant: "success" });
      } else if (selectedFAQ) {
        await updateFAQ(selectedFAQ.id, {
          question,
          answer,
          is_active: form.is_active
        });
        toast({ title: "FAQ updated", variant: "success" });
      }

      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save FAQ.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    try {
      await toggleActive(id, isActive);
      toast({
        title: isActive ? "FAQ activated" : "FAQ deactivated",
        variant: "success"
      });
    } catch (err) {
      toast({
        title: "Could not update FAQ",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error"
      });
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await deleteFAQ(deleteTarget.id);
      toast({ title: "FAQ deleted", variant: "success" });
      setDeleteTarget(null);
    } catch (err) {
      toast({
        title: "Could not delete FAQ",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error"
      });
    } finally {
      setDeleting(false);
    }
  }

  if (userLoading) {
    return <PageLoader />;
  }

  const formContent = (
    <FAQForm
      mode={mode}
      form={form}
      error={formError}
      saving={saving}
      onFormChange={setForm}
      onSubmit={handleSubmit}
      onCancel={() => setModalOpen(false)}
    />
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Knowledge Base</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">FAQs</h2>
          <p className="mt-2 text-sm text-muted-foreground">Manage the questions your AI can answer</p>
        </div>
        <Button type="button" onClick={openAddModal} className="gap-2 bg-brand text-black hover:bg-brand/90">
          <Plus className="h-4 w-4" />
          Add FAQ
        </Button>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <StatCard icon={Layers3} label="Total FAQs" value={stats.total} />
        <StatCard icon={CheckCircle2} label="Active FAQs" value={stats.active} />
        <StatCard icon={XCircle} label="Inactive FAQs" value={stats.inactive} />
      </section>

      <section className="rounded-lg border border-sidebar-border bg-[#0f0f0f] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search question or answer..."
              className="h-11 border-sidebar-border bg-[#0a0a0a] pl-9"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            <SlidersHorizontal className="hidden h-4 w-4 text-muted-foreground sm:block" />
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={cn(
                  "h-10 rounded-md border border-sidebar-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-white",
                  filter === item.value && "border-brand bg-brand text-black hover:text-black"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error ? (
        <Alert variant="destructive" className="border-red-500/40 bg-red-500/10">
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button type="button" variant="outline" size="sm" onClick={refetch}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <FAQSkeleton key={index} />
          ))}
        </div>
      ) : filteredFAQs.length > 0 ? (
        <div className="grid gap-3">
          {filteredFAQs.map((faq) => (
            <FAQCard
              key={faq.id}
              faq={faq}
              onEdit={openEditModal}
              onDelete={(id) => setDeleteTarget(faqs.find((item) => item.id === id) ?? null)}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          hasFAQs={faqs.length > 0}
          onAdd={openAddModal}
        />
      )}

      {isDesktop ? (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="border-sidebar-border bg-[#111111]">
            <DialogHeader>
              <DialogTitle>{mode === "add" ? "Add New FAQ" : "Edit FAQ"}</DialogTitle>
              <DialogDescription>
                {mode === "add"
                  ? "Add a question and answer your AI will use to respond to customers"
                  : "Update the question, answer, or activation state for this FAQ"}
              </DialogDescription>
            </DialogHeader>
            {formContent}
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={modalOpen} onOpenChange={setModalOpen}>
          <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-xl border-sidebar-border bg-[#111111]">
            <SheetHeader>
              <SheetTitle>{mode === "add" ? "Add New FAQ" : "Edit FAQ"}</SheetTitle>
              <SheetDescription>
                {mode === "add"
                  ? "Add a question and answer your AI will use to respond to customers"
                  : "Update the question, answer, or activation state for this FAQ"}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4">{formContent}</div>
          </SheetContent>
        </Sheet>
      )}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-sidebar-border bg-[#111111]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this FAQ?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this FAQ. Your AI will no longer use it to answer customer questions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget ? (
            <blockquote className="rounded-md border border-sidebar-border bg-[#0a0a0a] p-3 text-sm text-white">
              {deleteTarget.question}
            </blockquote>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="ghost" disabled={deleting}>
                Cancel
              </Button>
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="gap-2"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FAQForm({
  mode,
  form,
  error,
  saving,
  onFormChange,
  onSubmit,
  onCancel
}: {
  mode: ModalMode;
  form: FAQFormState;
  error: string | null;
  saving: boolean;
  onFormChange: (form: FAQFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error ? (
        <Alert variant="destructive" className="border-red-500/40 bg-red-500/10">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="faq-question">Question</Label>
        <Textarea
          id="faq-question"
          value={form.question}
          maxLength={QUESTION_LIMIT}
          onChange={(event) => onFormChange({ ...form, question: event.target.value })}
          placeholder="e.g., What are your delivery charges?"
          required
          className="min-h-28 resize-none border-sidebar-border bg-[#0a0a0a]"
        />
        <CharacterCounter value={form.question.length} limit={QUESTION_LIMIT} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="faq-answer">Answer</Label>
        <Textarea
          id="faq-answer"
          value={form.answer}
          maxLength={ANSWER_LIMIT}
          onChange={(event) => onFormChange({ ...form, answer: event.target.value })}
          placeholder="e.g., We offer free delivery for orders above Rs. 2000. Standard delivery is Rs. 150."
          required
          className="min-h-40 resize-none border-sidebar-border bg-[#0a0a0a]"
        />
        <CharacterCounter value={form.answer.length} limit={ANSWER_LIMIT} />
      </div>

      <div className="flex items-start justify-between gap-4 rounded-lg border border-sidebar-border bg-[#0a0a0a] p-4">
        <div>
          <Label htmlFor="faq-active">Activate immediately</Label>
          <p className="mt-1 text-xs text-muted-foreground">Inactive FAQs won&apos;t be used by the AI</p>
        </div>
        <Switch
          id="faq-active"
          checked={form.is_active}
          onCheckedChange={(checked) => onFormChange({ ...form, is_active: checked })}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" className="gap-2 bg-brand text-black hover:bg-brand/90" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === "add" ? "Add FAQ" : "Save Changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function CharacterCounter({ value, limit }: { value: number; limit: number }) {
  const nearLimit = value > limit * 0.85;
  return (
    <p className={cn("text-right text-xs text-muted-foreground", nearLimit && "text-yellow-400")}>
      {value}/{limit}
    </p>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-sidebar-border bg-[#111111] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand/10 text-brand">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold text-white">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function FAQSkeleton() {
  return (
    <div className="rounded-lg border border-sidebar-border bg-[#111111] p-4">
      <div className="flex gap-3">
        <Skeleton className="hidden h-5 w-5 sm:block" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <div className="flex items-center gap-3 border-t border-sidebar-border pt-3">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ hasFAQs, onAdd }: { hasFAQs: boolean; onAdd: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-sidebar-border bg-[#111111] px-6 py-14 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <HelpCircle className="h-8 w-8" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-white">{hasFAQs ? "No matching FAQs" : "No FAQs yet"}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {hasFAQs
          ? "Try a different search or filter to find the FAQ you need."
          : "Add your first FAQ so the AI knows how to answer common customer questions"}
      </p>
      {!hasFAQs ? (
        <Button type="button" className="mt-6 gap-2 bg-brand text-black hover:bg-brand/90" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add your first FAQ
        </Button>
      ) : null}
    </div>
  );
}
