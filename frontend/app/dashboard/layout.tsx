import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="grid min-h-screen md:grid-cols-[18rem_1fr]">
      <DashboardSidebar email={user.email} />
      <main className="min-w-0 bg-background p-6 md:p-8">{children}</main>
    </div>
  );
}
