import { getLocale, getTranslations } from "next-intl/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FindMyCabin from "@/components/claims/FindMyCabin";
import { createClient } from "@/lib/supabase/server";
import { findUnclaimedByCity, findUnclaimedByName } from "@/lib/claims/lookup";
import { MUNICIPALITIES, getMunicipalityBySlug, type Municipality } from "@/lib/municipalities";
import { rankDestinations, resolveDestination, type DestCandidate } from "@/lib/destinationSearch";

// « Trouver mon chalet » : un proprio sans compte cherche sa ville, voit les fiches non revendiquées et
// lance la revendication. La ville vient d'une suggestion de la liste officielle des municipalités (?ville=slug).
// Depuis la bannière de l'accueil, ?q=texte : une ville reconnue lance la recherche par ville ; sinon, recherche par nom de chalet.

export async function generateMetadata() {
  const t = await getTranslations("claim");
  return { title: t("findMetaTitle"), robots: { index: false, follow: true } };
}

const CITY_CANDIDATES: DestCandidate[] = MUNICIPALITIES.map((m) => ({
  item: { label: m.name, type: "city", value: m.slug },
  names: [m.name],
}));

// Texte libre → municipalité, avec la même règle que les barres de recherche (exacte, seule qui commence par la saisie).
function municipalityFromText(text: string): Municipality | undefined {
  const chosen = resolveDestination(rankDestinations(text, [], CITY_CANDIDATES, { regions: 0, cities: 6 }));
  return chosen ? getMunicipalityBySlug(chosen.value) : undefined;
}

export default async function Page({ searchParams }: { searchParams: Promise<{ ville?: string; q?: string }> }) {
  const [{ ville, q: rawQ }, locale] = await Promise.all([searchParams, getLocale()]);
  const lang = locale === "en" ? "en" : "fr";
  const q = (rawQ ?? "").trim().slice(0, 100);
  const municipality = ville ? getMunicipalityBySlug(ville) : q ? municipalityFromText(q) : undefined;
  // Texte qui n'est pas une ville : recherche par nom de chalet.
  const nameQuery = !municipality && q ? q : null;
  const matches = municipality
    ? await findUnclaimedByCity(municipality.name, lang)
    : nameQuery
      ? await findUnclaimedByName(nameQuery, lang)
      : [];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <FindMyCabin city={municipality?.name ?? null} query={nameQuery} matches={matches} signedIn={!!user} locale={lang} />
      </main>
      <Footer />
    </div>
  );
}
