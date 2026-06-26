import Link from "next/link";
import type { Route } from "next";
import {
  BookOpen,
  Inbox,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  Target,
  Users,
  type LucideIcon
} from "lucide-react";
import { logoutAction } from "@/app/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const navItems: { href: Route; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { href: "/dashboard/leads", label: "Leads", icon: Target },
  { href: "/dashboard/settings", label: "Settings", icon: Settings }
];

type DashboardSidebarProps = {
  email?: string | null;
};

export function DashboardSidebar({ email }: DashboardSidebarProps) {
  const initials = email?.slice(0, 2).toUpperCase() ?? "WA";

  return (
    <aside className="flex min-h-screen w-full flex-col border-r border-border bg-card md:w-72">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <MessageCircle className="h-5 w-5" />
        </span>
        <span className="font-semibold">WA Assistant</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <Button key={item.href} asChild variant="ghost" className="w-full justify-start gap-3">
            <Link href={item.href}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          </Button>
        ))}
      </nav>
      <div className="border-t border-border p-4">
        <div className="mb-3 flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{email ?? "Signed in"}</p>
            <p className="text-xs text-muted-foreground">Workspace admin</p>
          </div>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" className="w-full justify-start gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </form>
      </div>
    </aside>
  );
}
