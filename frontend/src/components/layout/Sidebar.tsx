"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Target,
  Users,
  type LucideIcon
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/shared/Logo";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/leads", label: "Leads", icon: Target },
  { href: "/settings", label: "Settings", icon: Settings }
];

const knowledgeSubItems = [
  { href: "/knowledge-base/faqs", label: "FAQs" },
  { href: "/knowledge-base/items", label: "Products & Services" },
  { href: "/knowledge-base/instructions", label: "AI Instructions" }
];

type SidebarProps = {
  userEmail?: string | null;
  whatsappConnected?: boolean;
  whatsappLoading?: boolean;
  onNavigate?: () => void;
};

export function Sidebar({ userEmail, whatsappConnected = false, whatsappLoading = false, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [knowledgeOpen, setKnowledgeOpen] = useState(pathname.startsWith("/knowledge-base"));
  const displayEmail = userEmail ?? "Signed in";
  const initials = userEmail?.slice(0, 2).toUpperCase() ?? "WA";

  useEffect(() => {
    if (pathname.startsWith("/knowledge-base")) {
      setKnowledgeOpen(true);
    }
  }, [pathname]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <Separator className="bg-sidebar-border" />
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.slice(0, 3).map((item) => {
          const isActive = pathname === item.href || (item.href === "/settings" && pathname.startsWith("/settings/"));
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-md border-l-2 border-transparent px-3 text-sm text-muted-foreground transition-colors hover:bg-[#161616] hover:text-white",
                  isActive && "border-brand bg-[#161616] text-white"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
              {item.href === "/settings" ? (
                <Link
                  href="/settings/whatsapp"
                  onClick={onNavigate}
                  className={cn(
                    "ml-8 mt-1 flex h-7 items-center gap-2 rounded px-2 text-xs transition-colors",
                    whatsappConnected ? "text-brand hover:bg-brand/5" : "text-yellow-300 hover:bg-yellow-500/5"
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", whatsappLoading ? "animate-pulse bg-zinc-500" : whatsappConnected ? "bg-brand" : "bg-yellow-300")} />
                  {whatsappLoading ? "Checking WhatsApp" : whatsappConnected ? "WhatsApp Active" : "Connect WhatsApp"}
                </Link>
              ) : null}
            </div>
          );
        })}
        <div>
          <button
            type="button"
            onClick={() => setKnowledgeOpen((current) => !current)}
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-md border-l-2 border-transparent px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-[#161616] hover:text-white",
              pathname.startsWith("/knowledge-base") && "border-brand bg-[#161616] text-white"
            )}
          >
            <BookOpen className="h-4 w-4" />
            <span className="flex-1">Knowledge Base</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", knowledgeOpen && "rotate-180")} />
          </button>
          {knowledgeOpen ? (
            <div className="ml-5 mt-1 space-y-1 border-l border-sidebar-border pl-3">
              {knowledgeSubItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex h-8 items-center gap-2 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:text-white",
                      isActive && "text-brand"
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full bg-muted-foreground/40", isActive && "bg-brand")} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
        {navItems.slice(3).map((item) => {
          const isActive = pathname === item.href || (item.href === "/settings" && pathname.startsWith("/settings/"));
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-md border-l-2 border-transparent px-3 text-sm text-muted-foreground transition-colors hover:bg-[#161616] hover:text-white",
                  isActive && "border-brand bg-[#161616] text-white"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
              {item.href === "/settings" ? (
                <Link
                  href="/settings/whatsapp"
                  onClick={onNavigate}
                  className={cn(
                    "ml-8 mt-1 flex h-7 items-center gap-2 rounded px-2 text-xs transition-colors",
                    whatsappConnected ? "text-brand hover:bg-brand/5" : "text-yellow-300 hover:bg-yellow-500/5"
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", whatsappLoading ? "animate-pulse bg-zinc-500" : whatsappConnected ? "bg-brand" : "bg-yellow-300")} />
                  {whatsappLoading ? "Checking WhatsApp" : whatsappConnected ? "WhatsApp Active" : "Connect WhatsApp"}
                </Link>
              ) : null}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <div className="mb-3 flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{displayEmail}</p>
            <p className="text-xs text-muted-foreground">Workspace admin</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2 border-sidebar-border bg-transparent"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
