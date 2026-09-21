import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { localePath } from "@/lib/localePath";
import Navbar from "@/components/Navbar";
import DashboardBottomNav from "@/components/dashboard/DashboardBottomNav";
import ProfileCompletionBanner from "@/components/ProfileCompletionBanner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(localePath("/login?next=/dashboard", locale));

  // Bandeau "compléter votre profil" — affiché seulement si la photo ou la
  // bio manque ET qu'au moins une fiche de ce proprio est publiée (un
  // proprio sans chalet publié n'a encore rien à présenter aux voyageurs).
  const [{ data: profile }, { data: publishedListing }] = await Promise.all([
    supabase.from("users").select("avatar_url, bio").eq("id", user.id).single(),
    supabase.from("listings").select("id").eq("host_id", user.id).eq("is_published", true).limit(1).maybeSingle(),
  ]);
  const showProfileCompletionBanner = !!publishedListing && (!profile?.avatar_url || !profile?.bio);

  return (
    <div className="min-h-screen bg-charcoal-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        {showProfileCompletionBanner && <ProfileCompletionBanner show />}
        {children}
      </main>
      <DashboardBottomNav />
    </div>
  );
}
