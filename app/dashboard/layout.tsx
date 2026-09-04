import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { localePath } from "@/lib/localePath";
import Navbar from "@/components/Navbar";
import DashboardBottomNav from "@/components/dashboard/DashboardBottomNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(localePath("/login?next=/dashboard", locale));

  return (
    <div className="min-h-screen bg-charcoal-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        {children}
      </main>
      <DashboardBottomNav />
    </div>
  );
}
