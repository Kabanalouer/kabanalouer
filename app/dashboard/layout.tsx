import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardSidebar from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/dashboard");

  const { data: profile } = await supabase
    .from("users")
    .select("name, role, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen flex bg-gray-50">
      <DashboardSidebar
        userName={profile?.name ?? user.email ?? ""}
        userRole={profile?.role ?? "traveler"}
      />
      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}
