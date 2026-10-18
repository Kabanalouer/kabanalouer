import { VerificationPage, CLAIM_PAGE_METADATA } from "@/components/claims/ClaimPages";

export const metadata = CLAIM_PAGE_METADATA;

export default async function Page({ searchParams }: { searchParams: Promise<{ listing?: string }> }) {
  const { listing } = await searchParams;
  return <VerificationPage listingId={listing} />;
}
