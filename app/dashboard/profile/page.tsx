import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/dashboard/ProfileForm";

export const metadata = { title: "Mon profil — Kabanalouer" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("name, avatar_url, phone, notifications_prefs")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
        <p className="text-sm text-gray-500 mt-1">Gérez vos informations personnelles et préférences</p>
      </div>
      <ProfileForm
        userId={user.id}
        email={user.email ?? ""}
        initialName={profile?.name ?? ""}
        initialAvatarUrl={profile?.avatar_url ?? null}
        initialPhone={(profile as Record<string, unknown>)?.phone as string ?? ""}
        initialNotifPrefs={(profile as Record<string, unknown>)?.notifications_prefs as Record<string, boolean> ?? {}}
      />
    </div>
  );
}
