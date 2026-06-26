"use client";

import { KeyboardEvent, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

export function TagInput({ tags, onChange, placeholder = "Add tag", maxTags = 10 }: TagInputProps) {
  const [value, setValue] = useState("");
  const atLimit = tags.length >= maxTags;

  function addTag(rawTag: string) {
    const nextTag = rawTag.trim().replace(/^#/, "");
    if (!nextTag || atLimit) return;

    const exists = tags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase());
    if (exists) {
      setValue("");
      return;
    }

    onChange([...tags, nextTag]);
    setValue("");
  }

  function removeTag(tagToRemove: string) {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(value);
      return;
    }

    if (event.key === "Backspace" && !value && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-md border border-sidebar-border bg-[#0a0a0a] px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border border-brand/50 bg-brand/10 px-2 py-1 text-xs font-medium text-brand"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full text-brand/80 transition-colors hover:text-white"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={value}
          disabled={atLimit}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag(value)}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="min-w-28 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
      </div>
      <p className={cn("text-right text-xs text-muted-foreground", atLimit && "text-red-400")}>
        {tags.length}/{maxTags} tags added
      </p>
    </div>
  );
}
