import { ReportTokenPage, CLAIM_PAGE_METADATA } from "@/components/claims/ClaimPages";

export const metadata = CLAIM_PAGE_METADATA;

export default async function Page({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  return <ReportTokenPage jeton={jeton} />;
}
