import Image from "next/image";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ListingDetail from "@/app/chalets/[...segments]/_components/ListingDetail";
import { adminSupabase } from "@/lib/sendMessage";
import { findClaimToken, previewPath } from "@/lib/claims/tokens";
import { LISTING_PUBLIC_COLUMNS } from "@/lib/listingColumns";
import { normalizePhotos } from "@/lib/photo";

// Aperçu privé des fiches en brouillon (mode_publication = 'brouillon'), par le lien de l'invitation :
// /apercu/[jeton] · /en/preview/[jeton] (liste) et /apercu/[jeton]/[fiche] (la fiche telle qu'elle paraîtra en ligne).
// Le jeton est celui de l'activation (kind 'claim') : il n'est pas consommé ici. Jamais indexées (noindex, voir
// CLAIM_PAGE_METADATA et l'en-tête X-Robots-Tag de next.config.ts), jamais de Referer (le jeton est dans l'adresse).
// Lecture avec le client service : un brouillon n'est lisible par aucune session ni la clé anon (RLS).

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-12">{children}</main>
      <Footer />
    </div>
  );
}

async function Problem({ kind }: { kind: "invalid" | "used" | "expired" }) {
  const t = await getTranslations("claim");
  return (
    <Shell>
      <h1 className="text-2xl sm:text-3xl font-bold text-charcoal-800">{t(`${kind}Title`)}</h1>
      <p className="mt-3 text-base text-charcoal-600">{t(`${kind}Body`)}</p>
    </Shell>
  );
}

const claimHrefFor = (isEn: boolean, jeton: string) => (isEn ? `/en/claim/${jeton}` : `/revendiquer/${jeton}`);

// /apercu/[jeton] · /en/preview/[jeton]
export async function PreviewListPage({ jeton }: { jeton: string }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("claimPreview")]);
  const isEn = locale === "en";
  const admin = adminSupabase();

  const lookup = await findClaimToken(admin, jeton, "claim");
  if (lookup.status !== "ok") return <Problem kind={lookup.status} />;

  const { data: listings } = await admin
    .from("listings")
    .select("id, title, title_en, city, region, photos")
    .eq("claim_email", lookup.token.claim_email)
    .eq("claim_status", "unclaimed")
    .eq("mode_publication", "brouillon")
    .eq("is_test", false)
    .order("title");
  if (!listings || listings.length === 0) return <Problem kind="used" />;

  return (
    <Shell>
      <p className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{t("banner")}</p>
      <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-charcoal-800">{t("title", { count: listings.length })}</h1>
      <p className="mt-3 text-base text-charcoal-600">{t("intro", { count: listings.length })}</p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {listings.map((l) => {
          const title = ((isEn ? (l.title_en as string | null) : null) || (l.title as string | null) || t("untitled")) as string;
          const photo = normalizePhotos(l.photos)[0]?.url ?? null;
          return (
            <li key={l.id as string} className="overflow-hidden rounded-[16px] border border-[#ebebeb] bg-white">
              <a href={previewPath(isEn ? "en" : "fr", jeton, l.id as string)} className="block group">
                <div className="relative aspect-[4/3] bg-charcoal-100">
                  {photo && <Image src={photo} alt="" fill sizes="(min-width: 640px) 380px, 100vw" className="object-cover" />}
                </div>
                <div className="p-4">
                  <p className="text-base font-semibold text-charcoal-800 group-hover:underline underline-offset-4">{title}</p>
                  {(l.city || l.region) && <p className="mt-0.5 text-sm text-charcoal-500">{[l.city, l.region].filter(Boolean).join(", ")}</p>}
                  <p className="mt-3 text-sm font-semibold text-primary">{t("view")}</p>
                </div>
              </a>
            </li>
          );
        })}
      </ul>

      <div className="mt-10 rounded-[16px] bg-[#f5f6ec] p-6">
        <h2 className="text-heading-3 font-semibold text-charcoal-800">{t("activateTitle", { count: listings.length })}</h2>
        <p className="mt-1 text-sm text-charcoal-600">{t("activateNote")}</p>
        <a
          href={claimHrefFor(isEn, jeton)}
          className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          {t("activate", { count: listings.length })}
        </a>
      </div>
    </Shell>
  );
}

// /apercu/[jeton]/[fiche] · /en/preview/[jeton]/[fiche]
export async function PreviewListingPage({ jeton, listingId }: { jeton: string; listingId: string }) {
  const locale = await getLocale();
  const isEn = locale === "en";
  const admin = adminSupabase();

  const lookup = await findClaimToken(admin, jeton, "claim");
  if (lookup.status !== "ok") return <Problem kind={lookup.status} />;

  const { data: listing } = await admin
    .from("listings")
    .select(LISTING_PUBLIC_COLUMNS)
    .eq("id", listingId)
    .eq("claim_email", lookup.token.claim_email)
    .eq("claim_status", "unclaimed")
    .eq("mode_publication", "brouillon")
    .eq("is_test", false)
    .maybeSingle();
  if (!listing) notFound();

  return (
    <ListingDetail
      listing={listing}
      user={null}
      searchParams={{}}
      locale={locale}
      isPreviewFrame={false}
      ownerPreview={{
        db: admin,
        claimHref: claimHrefFor(isEn, jeton),
        listHref: previewPath(isEn ? "en" : "fr", jeton),
      }}
    />
  );
}
