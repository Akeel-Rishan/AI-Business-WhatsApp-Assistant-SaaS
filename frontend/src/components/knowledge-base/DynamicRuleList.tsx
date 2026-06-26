"use client";

import { KeyboardEvent, useEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DynamicRuleListProps {
  rules: string[];
  onChange: (rules: string[]) => void;
  placeholder: string;
  maxRules: number;
  label: string;
}

export function DynamicRuleList({ rules, onChange, placeholder, maxRules, label }: DynamicRuleListProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const atLimit = rules.length >= maxRules;

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, rules.length);
  }, [rules.length]);

  function updateRule(index: number, value: string) {
    onChange(rules.map((rule, ruleIndex) => (ruleIndex === index ? value : rule)));
  }

  function addRule(afterIndex?: number) {
    if (atLimit) return;
    const insertAt = typeof afterIndex === "number" ? afterIndex + 1 : rules.length;
    const nextRules = [...rules.slice(0, insertAt), "", ...rules.slice(insertAt)];
    onChange(nextRules);
    window.setTimeout(() => inputRefs.current[insertAt]?.focus(), 40);
  }

  function deleteRule(index: number) {
    onChange(rules.filter((_, ruleIndex) => ruleIndex !== index));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === "Enter") {
      event.preventDefault();
      addRule(index);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <span className={cn("text-xs text-muted-foreground", atLimit && "text-yellow-400")}>
          {rules.length}/{maxRules}
        </span>
      </div>

      <div className="space-y-2">
        {rules.map((rule, index) => (
          <div
            key={`${index}-${rules.length}`}
            className="flex animate-in fade-in-0 slide-in-from-top-1 items-center gap-2"
          >
            <span className="w-6 text-right text-sm text-muted-foreground">{index + 1}.</span>
            <Input
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              value={rule}
              onChange={(event) => updateRule(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              placeholder={placeholder}
              className="border-sidebar-border bg-[#0a0a0a]"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 hover:bg-red-500/10 hover:text-red-400"
              onClick={() => deleteRule(index)}
              aria-label={`Delete rule ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="ghost"
        disabled={atLimit}
        onClick={() => addRule()}
        className="h-11 w-full gap-2 border border-dashed border-sidebar-border text-muted-foreground hover:text-white"
      >
        <Plus className="h-4 w-4" />
        Add Rule
      </Button>
    </div>
  );
}
