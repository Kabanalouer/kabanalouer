import { redirect } from "next/navigation";
import { localePath } from "@/lib/localePath";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import NewListingStepZero from "@/components/dashboard/NewListingStepZero";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: locale === "en" ? "New cabin" : "Nouveau chalet" };
}

// Une Server Action hérite de la config de timeout de la route qui l'a
// invoquée, pas de son propre fichier — même contrainte que
// app/api/listings/import/route.ts (l'appel Apify seul peut prendre ~60s).
export const maxDuration = 90;

export default async function NewListingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginLocale = await getLocale();
    redirect(localePath(`/login?next=${encodeURIComponent(localePath("/dashboard/listings/new", loginLocale))}`, loginLocale));
  }

  return (
    <div className="max-w-3xl">
      <NewListingStepZero />
    </div>
  );
}
