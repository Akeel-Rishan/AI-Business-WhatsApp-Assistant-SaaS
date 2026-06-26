"use client";

import { FormEvent, useState } from "react";
import {
  FileText,
  Layers3,
  Loader2,
  Plus,
  Search,
  Shield,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
  Wrench,
  type LucideIcon
} from "lucide-react";
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
import {
  categoryMeta,
  KnowledgeBaseItemCard
} from "@/components/knowledge-base/KnowledgeBaseItemCard";
import { PageLoader } from "@/components/shared/PageLoader";
import { TagInput } from "@/components/shared/TagInput";
import { useKnowledgeBaseItems } from "@/hooks/useKnowledgeBaseItems";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useToast } from "@/hooks/useToast";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";
import type { ItemCategory, KnowledgeBaseItem } from "@/types/database";

type CategoryFilter = "all" | ItemCategory;
type ModalMode = "add" | "edit";

const TITLE_LIMIT = 100;
const CONTENT_LIMIT = 2000;

const categories: ItemCategory[] = ["product", "service", "pricing", "policy", "delivery", "general"];

const filterItems: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "product", label: "Products" },
  { value: "service", label: "Services" },
  { value: "pricing", label: "Pricing" },
  { value: "policy", label: "Policies" },
  { value: "delivery", label: "Delivery" },
  { value: "general", label: "General" }
];

const categoryDescriptions: Record<ItemCategory, string> = {
  product: "Items you sell or offer",
  service: "Services your business provides",
  pricing: "Prices, packages, and rates",
  policy: "Returns, refunds, and rules",
  delivery: "Shipping and delivery info",
  general: "Other business information"
};

const titlePlaceholders: Record<ItemCategory, string> = {
  product: "e.g., Chocolate Fudge Cake (1kg)",
  service: "e.g., Home Cleaning Service",
  pricing: "e.g., Delivery Charges",
  policy: "e.g., Return Policy",
  delivery: "e.g., Delivery Areas",
  general: "e.g., About Our Business"
};

type ItemFormState = {
  category: ItemCategory | "";
  title: string;
  content: string;
  tags: string[];
  is_active: boolean;
};

const initialForm: ItemFormState = {
  category: "",
  title: "",
  content: "",
  tags: [],
  is_active: true
};

export default function KnowledgeBaseItemsPage() {
  const { business, loading: userLoading } = useUser();
  const {
    items,
    filteredItems,
    loading,
    error,
    activeCategory,
    searchQuery,
    setActiveCategory,
    setSearchQuery,
    addItem,
    updateItem,
    deleteItem,
    toggleActive,
    refetch,
    stats
  } = useKnowledgeBaseItems(business?.id);
  const { toast } = useToast();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>("add");
  const [selectedItem, setSelectedItem] = useState<KnowledgeBaseItem | null>(null);
  const [form, setForm] = useState<ItemFormState>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeBaseItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openAddModal() {
    setMode("add");
    setSelectedItem(null);
    setForm(initialForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(item: KnowledgeBaseItem) {
    setMode("edit");
    setSelectedItem(item);
    setForm({
      category: item.category,
      title: item.title,
      content: item.content,
      tags: item.tags,
      is_active: item.is_active
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

    if (!form.category) {
      setFormError("Select a category before saving this item.");
      return;
    }

    const title = form.title.trim();
    const content = form.content.trim();

    if (!title || !content) {
      setFormError("Title and details are required.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (mode === "add") {
        await addItem({
          business_id: business.id,
          category: form.category,
          title,
          content,
          tags: form.tags,
          is_active: form.is_active
        });
        toast({ title: "Item added successfully", variant: "success" });
      } else if (selectedItem) {
        await updateItem(selectedItem.id, {
          category: form.category,
          title,
          content,
          tags: form.tags,
          is_active: form.is_active
        });
        toast({ title: "Item updated", variant: "success" });
      }

      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    try {
      await toggleActive(id, isActive);
      toast({ title: isActive ? "Item activated" : "Item deactivated", variant: "success" });
    } catch (err) {
      toast({
        title: "Could not update item",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error"
      });
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await deleteItem(deleteTarget.id);
      toast({ title: "Item deleted", variant: "success" });
      setDeleteTarget(null);
    } catch (err) {
      toast({
        title: "Could not delete item",
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
    <ItemForm
      mode={mode}
      form={form}
      error={formError}
      saving={saving}
      onFormChange={setForm}
      onSubmit={handleSubmit}
      onCancel={() => setModalOpen(false)}
    />
  );

  const activeFilterLabel = filterItems.find((item) => item.value === activeCategory)?.label ?? "items";

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Knowledge Base</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Knowledge Base</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Add your products, services, pricing, policies and delivery info
          </p>
        </div>
        <Button type="button" onClick={openAddModal} className="gap-2 bg-brand text-black hover:bg-brand/90">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Layers3} label="Total Items" value={stats.total} />
        <StatCard icon={ShoppingBag} label="Products" value={stats.products} />
        <StatCard icon={Wrench} label="Services" value={stats.services} />
        <StatCard icon={Shield} label="Policies" value={stats.policies} />
      </section>

      <section className="rounded-lg border border-sidebar-border bg-[#0f0f0f] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filterItems.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setActiveCategory(item.value)}
                className={cn(
                  "h-10 shrink-0 rounded-full border border-sidebar-border bg-[#111111] px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-white",
                  activeCategory === item.value && "border-brand bg-brand text-black hover:text-black"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="relative min-w-0 xl:w-96">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search title or details..."
              className="h-11 border-sidebar-border bg-[#0a0a0a] pl-9"
            />
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Showing {filteredItems.length} items</p>
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
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <ItemSkeleton key={index} />
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid items-stretch gap-4 lg:grid-cols-2">
          {filteredItems.map((item) => (
            <KnowledgeBaseItemCard
              key={item.id}
              item={item}
              onEdit={openEditModal}
              onDelete={(id) => setDeleteTarget(items.find((entry) => entry.id === id) ?? null)}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          hasItems={items.length > 0}
          activeFilterLabel={activeFilterLabel}
          onAdd={openAddModal}
        />
      )}

      {isDesktop ? (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-3xl border-sidebar-border bg-[#111111]">
            <DialogHeader>
              <DialogTitle>{mode === "add" ? "Add Knowledge Base Item" : "Edit Item"}</DialogTitle>
              <DialogDescription>
                {mode === "add"
                  ? "Add business information your AI will use to answer customer questions"
                  : "Update this business information for your AI assistant"}
              </DialogDescription>
            </DialogHeader>
            {formContent}
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={modalOpen} onOpenChange={setModalOpen}>
          <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-xl border-sidebar-border bg-[#111111]">
            <SheetHeader>
              <SheetTitle>{mode === "add" ? "Add Knowledge Base Item" : "Edit Item"}</SheetTitle>
              <SheetDescription>
                {mode === "add"
                  ? "Add business information your AI will use to answer customer questions"
                  : "Update this business information for your AI assistant"}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4">{formContent}</div>
          </SheetContent>
        </Sheet>
      )}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-sidebar-border bg-[#111111]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              The AI will no longer use this information to answer customer questions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget ? (
            <blockquote className="rounded-md border border-sidebar-border bg-[#0a0a0a] p-3">
              <div className="flex items-center gap-2">
                <span className={cn("rounded-full border px-2 py-1 text-xs font-semibold", categoryMeta[deleteTarget.category].softClass)}>
                  {categoryMeta[deleteTarget.category].label}
                </span>
                <span className="text-sm font-medium text-white">{deleteTarget.title}</span>
              </div>
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

function ItemForm({
  mode,
  form,
  error,
  saving,
  onFormChange,
  onSubmit,
  onCancel
}: {
  mode: ModalMode;
  form: ItemFormState;
  error: string | null;
  saving: boolean;
  onFormChange: (form: ItemFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const selectedCategory = form.category || "product";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error ? (
        <Alert variant="destructive" className="border-red-500/40 bg-red-500/10">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-3">
        <Label>Category</Label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const meta = categoryMeta[category];
            const Icon = meta.icon;
            const selected = form.category === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => onFormChange({ ...form, category })}
                className={cn(
                  "rounded-lg border border-sidebar-border bg-[#0a0a0a] p-4 text-left transition-colors hover:border-[#2a2a2a]",
                  selected && "border-brand"
                )}
              >
                <Icon className={cn("h-5 w-5 text-muted-foreground", selected && "text-brand")} />
                <p className="mt-3 text-sm font-semibold text-white">{meta.label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{categoryDescriptions[category]}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="kb-title">Title</Label>
        <Input
          id="kb-title"
          value={form.title}
          maxLength={TITLE_LIMIT}
          onChange={(event) => onFormChange({ ...form, title: event.target.value })}
          placeholder={titlePlaceholders[selectedCategory]}
          required
          className="border-sidebar-border bg-[#0a0a0a]"
        />
        <CharacterCounter value={form.title.length} limit={TITLE_LIMIT} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="kb-content">Details</Label>
        <Textarea
          id="kb-content"
          value={form.content}
          maxLength={CONTENT_LIMIT}
          onChange={(event) => onFormChange({ ...form, content: event.target.value })}
          placeholder="Enter all relevant details. Be specific - the more detail you add, the better the AI can answer."
          required
          className="min-h-44 resize-none border-sidebar-border bg-[#0a0a0a]"
        />
        <CharacterCounter value={form.content.length} limit={CONTENT_LIMIT} />
      </div>

      <div className="space-y-2">
        <div>
          <Label>Tags</Label>
          <p className="mt-1 text-xs text-muted-foreground">Press Enter or comma to add a tag</p>
        </div>
        <TagInput tags={form.tags} onChange={(tags) => onFormChange({ ...form, tags })} maxTags={10} />
      </div>

      <div className="flex items-start justify-between gap-4 rounded-lg border border-sidebar-border bg-[#0a0a0a] p-4">
        <div>
          <Label htmlFor="kb-active">Activate immediately</Label>
          <p className="mt-1 text-xs text-muted-foreground">Inactive items will not be used by the AI</p>
        </div>
        <Switch
          id="kb-active"
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
          {mode === "add" ? "Add Item" : "Save Changes"}
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

function ItemSkeleton() {
  return (
    <div className="min-h-[280px] rounded-lg border border-sidebar-border bg-[#111111] p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-11 rounded-full" />
      </div>
      <div className="mt-5 flex gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

function EmptyState({
  hasItems,
  activeFilterLabel,
  onAdd
}: {
  hasItems: boolean;
  activeFilterLabel: string;
  onAdd: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-sidebar-border bg-[#111111] px-6 py-14 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        {hasItems ? <Search className="h-8 w-8" /> : <FileText className="h-8 w-8" />}
      </div>
      <h3 className="mt-5 text-lg font-semibold text-white">
        {hasItems ? `No ${activeFilterLabel.toLowerCase()} items found` : "Your knowledge base is empty"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {hasItems
          ? "Try a different category or add a new item"
          : "Add products, services, pricing and policies so your AI can answer customer questions accurately"}
      </p>
      {!hasItems ? (
        <Button type="button" className="mt-6 gap-2 bg-brand text-black hover:bg-brand/90" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add your first item
        </Button>
      ) : null}
    </div>
  );
}
