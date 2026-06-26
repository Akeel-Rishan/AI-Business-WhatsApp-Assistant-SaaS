"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/knowledge-base/faqs", label: "FAQs" },
  { href: "/knowledge-base/items", label: "Items" },
  { href: "/knowledge-base/instructions", label: "Instructions" },
  { href: "/knowledge-base", label: "Overview" }
];

export default function KnowledgeBaseLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto border-b border-sidebar-border">
        <nav className="flex min-w-max gap-6">
          {tabs.map((tab) => {
            const isActive =
              tab.href === "/knowledge-base"
                ? pathname === tab.href
                : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-white",
                  isActive && "text-white"
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-transparent transition-colors",
                    isActive && "bg-brand"
                  )}
                />
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}
