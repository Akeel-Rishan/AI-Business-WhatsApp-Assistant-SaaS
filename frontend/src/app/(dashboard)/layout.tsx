"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { PageLoader } from "@/components/shared/PageLoader";
import { useUser } from "@/hooks/useUser";

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const userEmail = user?.email ?? null;

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="fixed inset-y-0 left-0 hidden md:block">
        <Sidebar userEmail={userEmail} />
      </div>
      <div className="md:pl-64">
        <TopBar userEmail={userEmail} />
        <main className="min-h-[calc(100vh-4rem)] overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
