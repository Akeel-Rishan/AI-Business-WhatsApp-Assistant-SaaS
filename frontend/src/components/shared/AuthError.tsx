"use client";

import { XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type AuthErrorProps = {
  message: string;
  className?: string;
};

export function AuthError({ message, className }: AuthErrorProps) {
  if (!message) return null;

  return (
    <div
      className={cn(
        "auth-error-slide flex items-start gap-2 rounded-md border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-100",
        className
      )}
    >
      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
      <span>{message}</span>
    </div>
  );
}
