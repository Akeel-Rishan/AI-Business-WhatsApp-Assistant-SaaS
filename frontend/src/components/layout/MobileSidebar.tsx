"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/Sidebar";

type MobileSidebarProps = {
  userEmail?: string | null;
  whatsappConnected?: boolean;
  whatsappLoading?: boolean;
};

export function MobileSidebar({ userEmail, whatsappConnected, whatsappLoading }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 border-sidebar-border bg-sidebar p-0">
        <Sidebar userEmail={userEmail} whatsappConnected={whatsappConnected} whatsappLoading={whatsappLoading} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
