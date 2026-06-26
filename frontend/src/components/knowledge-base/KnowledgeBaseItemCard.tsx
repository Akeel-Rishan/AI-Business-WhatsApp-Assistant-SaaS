"use client";

import { useState } from "react";
import {
  FileText,
  Pencil,
  Shield,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
  Wrench,
  type LucideIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { ItemCategory, KnowledgeBaseItem } from "@/types/database";

type KnowledgeBaseItemCardProps = {
  item: KnowledgeBaseItem;
  onEdit: (item: KnowledgeBaseItem) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
};

export const categoryMeta: Record<
  ItemCategory,
  {
    label: string;
    plural: string;
    color: string;
    softClass: string;
    icon: LucideIcon;
  }
> = {
  product: {
    label: "Product",
    plural: "Products",
    color: "#3b82f6",
    softClass: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    icon: ShoppingBag
  },
  service: {
    label: "Service",
    plural: "Services",
    color: "#8b5cf6",
    softClass: "bg-violet-500/10 text-violet-400 border-violet-500/30",
    icon: Wrench
  },
  pricing: {
    label: "Pricing",
    plural: "Pricing",
    color: "#f59e0b",
    softClass: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    icon: Tag
  },
  policy: {
    label: "Policy",
    plural: "Policies",
    color: "#ef4444",
    softClass: "bg-red-500/10 text-red-400 border-red-500/30",
    icon: Shield
  },
  delivery: {
    label: "Delivery",
    plural: "Delivery",
    color: "#06b6d4",
    softClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    icon: Truck
  },
  general: {
    label: "General",
    plural: "General",
    color: "#6b7280",
    softClass: "bg-gray-500/10 text-gray-300 border-gray-500/30",
    icon: FileText
  }
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(new Date(value));
  } catch {
    return "Recently";
  }
}

export function KnowledgeBaseItemCard({
  item,
  onEdit,
  onDelete,
  onToggleActive
}: KnowledgeBaseItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = categoryMeta[item.category];
  const Icon = meta.icon;
  const visibleTags = item.tags.slice(0, 3);
  const hiddenTagCount = Math.max(item.tags.length - visibleTags.length, 0);
  const isLongContent = item.content.length > 240;

  return (
    <article
      className={cn(
        "flex min-h-[280px] flex-col rounded-lg border border-[#1f1f1f] bg-[#111111] p-5 shadow-black/10 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#2a2a2a] hover:shadow-xl",
        !item.is_active && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Badge variant="outline" className={cn("gap-1.5", meta.softClass)}>
          <Icon className="h-3.5 w-3.5" />
          {meta.label}
        </Badge>
        <Switch
          checked={item.is_active}
          onCheckedChange={(checked) => onToggleActive(item.id, checked)}
          aria-label={item.is_active ? "Deactivate item" : "Activate item"}
        />
      </div>

      <div className="mt-5 flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border"
          style={{
            color: meta.color,
            borderColor: `${meta.color}55`,
            backgroundColor: `${meta.color}18`
          }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-6 text-white">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            <span className={cn(!expanded && "line-clamp-3")}>{item.content}</span>
          </p>
          {isLongContent ? (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="mt-1 text-xs font-semibold text-brand transition-colors hover:text-brand/80"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          ) : null}
        </div>
      </div>

      {item.tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {visibleTags.map((tag) => (
            <span key={tag} className="rounded-full bg-[#1f1f1f] px-2 py-1 text-xs text-muted-foreground">
              {tag}
            </span>
          ))}
          {hiddenTagCount > 0 ? (
            <span className="rounded-full bg-[#1f1f1f] px-2 py-1 text-xs text-muted-foreground">
              +{hiddenTagCount} more
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#1f1f1f] pt-4">
        <span className="text-xs text-muted-foreground">Added {formatDate(item.created_at)}</span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" onClick={() => onEdit(item)} aria-label="Edit item">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hover:bg-red-500/10 hover:text-red-400"
            onClick={() => onDelete(item.id)}
            aria-label="Delete item"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </article>
  );
}
