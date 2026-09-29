import { redirect } from "next/navigation";
import { localePath } from "@/lib/localePath";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import NewListingStepZero from "@/components/dashboard/NewListingStepZero";
import { normalizeAirbnbInput } from "@/lib/pendingAirbnbImport";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: locale === "en" ? "New cabin" : "Nouveau chalet" };
}

// Une Server Action hérite de la config de timeout de la route qui l'a
// invoquée, pas de son propre fichier — même contrainte que
// app/api/listings/import/route.ts (l'appel Apify seul peut prendre ~60s).
export const maxDuration = 90;

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<{ import?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Lien Airbnb saisi sur /devenir-hote : prérempli dans le formulaire d'import.
  const initialImportUrl = normalizeAirbnbInput((await searchParams).import ?? "");

  if (!user) {
    const loginLocale = await getLocale();
    const target = `/dashboard/listings/new${initialImportUrl ? `?import=${encodeURIComponent(initialImportUrl)}` : ""}`;
    redirect(localePath(`/login?next=${encodeURIComponent(localePath(target, loginLocale))}`, loginLocale));
  }

  return (
    <div className="max-w-3xl">
      <NewListingStepZero initialImportUrl={initialImportUrl} />
    </div>
  );
}
