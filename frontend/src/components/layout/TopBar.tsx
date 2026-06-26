"use client";

import { Bell, Settings, User } from "lucide-react";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { MobileSidebar } from "@/components/layout/MobileSidebar";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/inbox": "Inbox",
  "/customers": "Customers",
  "/knowledge-base": "Knowledge Base",
  "/knowledge-base/faqs": "FAQs",
  "/knowledge-base/items": "Products & Services",
  "/knowledge-base/instructions": "AI Instructions",
  "/leads": "Leads",
  "/settings": "Settings"
};

type TopBarProps = {
  userEmail?: string | null;
};

export function TopBar({ userEmail }: TopBarProps) {
  const pathname = usePathname();
  const title = titles[pathname] ?? "Dashboard";
  const displayEmail = userEmail ?? "Signed in";
  const initials = userEmail?.slice(0, 2).toUpperCase() ?? "WA";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-sidebar-border bg-[#0a0a0a] px-4 md:px-6">
      <div className="flex items-center gap-3">
        <MobileSidebar userEmail={userEmail} />
        <h1 className="text-lg font-semibold text-white">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>{displayEmail}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
