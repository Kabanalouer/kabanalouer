import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/dashboard/ProfileForm";

export const metadata = { title: "Mon profil — Kabanalouer" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = await getTranslations("profile");

  const { data: profile } = await supabase
    .from("users")
    .select("name, avatar_url, phone, notifications_prefs, role, bio")
    .eq("id", user.id)
    .single();

  const p = profile as Record<string, unknown> | null;

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-charcoal-800">{t("heading")}</h1>
        <p className="text-sm text-charcoal-500 mt-1">{t("description")}</p>
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
      />
    </div>
  );
}
