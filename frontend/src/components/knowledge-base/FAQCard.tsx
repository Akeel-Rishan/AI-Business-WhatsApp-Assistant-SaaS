"use client";

import { useState } from "react";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { FAQ } from "@/types/database";

type FAQCardProps = {
  faq: FAQ;
  onEdit: (faq: FAQ) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
};

function formatDate(value: string) {
  try {
    return `Added ${new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(new Date(value))}`;
  } catch {
    return "Added recently";
  }
}

export function FAQCard({ faq, onEdit, onDelete, onToggleActive }: FAQCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isLongAnswer = faq.answer.length > 180;

  return (
    <article
      className={cn(
        "group rounded-lg border border-[#1f1f1f] bg-[#111111] p-4 shadow-black/10 transition-all duration-150 hover:border-[#2a2a2a] hover:shadow-xl",
        !faq.is_active && "opacity-60"
      )}
    >
      <div className="flex gap-3">
        <div className="hidden pt-1 text-muted-foreground sm:block">
          <GripVertical className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold leading-6 text-white">{faq.question}</h3>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                <p className={cn(!expanded && "line-clamp-2")}>{faq.answer}</p>
                {isLongAnswer ? (
                  <button
                    type="button"
                    className="mt-1 text-xs font-semibold text-brand transition-colors hover:text-brand/80"
                    onClick={() => setExpanded((current) => !current)}
                  >
                    {expanded ? "Show less" : "Show more"}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Switch
                checked={faq.is_active}
                onCheckedChange={(checked) => onToggleActive(faq.id, checked)}
                aria-label={faq.is_active ? "Deactivate FAQ" : "Activate FAQ"}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => onEdit(faq)} aria-label="Edit FAQ">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="hover:bg-red-500/10 hover:text-red-400"
                onClick={() => onDelete(faq.id)}
                aria-label="Delete FAQ"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#1f1f1f] pt-3">
            <Badge
              variant={faq.is_active ? "default" : "secondary"}
              className={cn(
                faq.is_active ? "bg-brand text-black" : "bg-[#2a2a2a] text-muted-foreground"
              )}
            >
              {faq.is_active ? "Active" : "Inactive"}
            </Badge>
            <span className="text-xs text-muted-foreground">{formatDate(faq.created_at)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
