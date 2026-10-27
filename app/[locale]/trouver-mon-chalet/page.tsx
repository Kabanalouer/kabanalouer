import { getLocale, getTranslations } from "next-intl/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FindMyCabin from "@/components/claims/FindMyCabin";
import { createClient } from "@/lib/supabase/server";
import { findUnclaimedByCity } from "@/lib/claims/lookup";
import { getMunicipalityBySlug } from "@/lib/municipalities";

// « Trouver mon chalet » : un proprio sans compte cherche sa ville, voit les fiches non revendiquées et
// lance la revendication. La ville vient d'une suggestion de la liste officielle des municipalités (?ville=slug).

export async function generateMetadata() {
  const t = await getTranslations("claim");
  return { title: t("findMetaTitle"), robots: { index: false, follow: true } };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ ville?: string }> }) {
  const [{ ville }, locale] = await Promise.all([searchParams, getLocale()]);
  const lang = locale === "en" ? "en" : "fr";
  const municipality = ville ? getMunicipalityBySlug(ville) : undefined;
  const matches = municipality ? await findUnclaimedByCity(municipality.name, lang) : [];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <FindMyCabin city={municipality?.name ?? null} matches={matches} signedIn={!!user} locale={lang} />
      </main>
      <Footer />
    </div>
  );
}
