import { redirect } from "next/navigation";
import { localePath } from "@/lib/localePath";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/dashboard/ProfileForm";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: locale === "en" ? "My profile" : "Mon profil" };
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const loginLocale = await getLocale();
    redirect(localePath(`/login?next=${encodeURIComponent(localePath("/dashboard/profile", loginLocale))}`, loginLocale));
  }

  const t = await getTranslations("profile");

  const { data: profile } = await supabase
    .from("users")
    .select("name, avatar_url, phone, notifications_prefs, role, bio, bio_en, preferred_language, company_name")
    .eq("id", user.id)
    .single();

  const p = profile as Record<string, unknown> | null;

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-charcoal-800">{t("heading")}</h1>
        <p className="text-base text-charcoal-500 mt-1">{t("description")}</p>
      </div>
      <ProfileForm
        userId={user.id}
        email={user.email ?? ""}
        initialName={profile?.name ?? ""}
        initialAvatarUrl={profile?.avatar_url ?? null}
        initialPhone={p?.phone as string ?? ""}
        initialNotifPrefs={p?.notifications_prefs as Record<string, boolean> ?? {}}
        role={p?.role as string ?? "traveler"}
        initialBio={p?.bio as string ?? ""}
        initialBioEn={p?.bio_en as string ?? ""}
        initialPreferredLanguage={p?.preferred_language === "en" ? "en" : "fr"}
        initialCompanyName={p?.company_name as string ?? ""}
      />
    </div>
  );
}
