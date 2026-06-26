"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ToastProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "destructive";
};

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border p-4 shadow-lg",
      variant === "destructive" ? "border-destructive bg-destructive text-destructive-foreground" : "border-border bg-card text-card-foreground",
      className
    )}
    {...props}
  />
));
Toast.displayName = "Toast";

const ToastTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
);
ToastTitle.displayName = "ToastTitle";

const ToastDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("text-sm opacity-90", className)} {...props} />
);
ToastDescription.displayName = "ToastDescription";

function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function ToastViewport() {
  return null;
}

function ToastAction(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} />;
}

function ToastClose(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button aria-label="Close" {...props} />;
}

export { Toast, ToastProvider, ToastViewport, ToastTitle, ToastDescription, ToastClose, ToastAction };
