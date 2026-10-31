import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import ListingDetail from "@/app/chalets/[...segments]/_components/ListingDetail";
import { CLAIM_PAGE_METADATA } from "@/components/claims/ClaimPages";
import { adminSupabase } from "@/lib/sendMessage";
import { requireAdminPage } from "@/lib/requireAdminPage";
import { LISTING_PUBLIC_COLUMNS } from "@/lib/listingColumns";

// Aperçu d'une fiche en brouillon pour l'admin (Admin → Brouillons) : la fiche telle que le propriétaire la verra,
// sans passer par un jeton d'invitation (il n'existe qu'à l'envoi). Réservé aux admins, jamais indexé (noindex, voir
// CLAIM_PAGE_METADATA et l'en-tête X-Robots-Tag de next.config.ts pour /apercu/:path*), sans vue comptée.
// Segment « admin » statique : prioritaire sur /apercu/[jeton], qui n'est jamais « admin » (jetons aléatoires).

export const metadata = CLAIM_PAGE_METADATA;

export default async function Page({ params }: { params: Promise<{ listingId: string }> }) {
  await requireAdminPage();
  const { listingId } = await params;
  const locale = await getLocale();
  const admin = adminSupabase();

  const { data: listing } = await admin
    .from("listings")
    .select(LISTING_PUBLIC_COLUMNS)
    .eq("id", listingId)
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
      ownerPreview={{ db: admin, claimHref: "/admin/brouillons", listHref: "/admin/brouillons" }}
    />
  );
}
