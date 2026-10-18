import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/sendMessage";
import { findClaimToken } from "@/lib/claims/tokens";
import { localePath } from "@/lib/localePath";
import { ClaimForm, RemoveForm, ReportForm, VerificationForm } from "@/components/claims/ClaimForms";

// Pages de revendication des fiches non revendiquées. Jamais indexées, jamais
// de Referer (le jeton est dans l'adresse). La logique serveur est ici ; les
// routes (FR et EN) ne font que l'exposer.

export const CLAIM_PAGE_METADATA = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-12">{children}</main>
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

function titleOf(l: { title: string | null; title_en: string | null }, isEn: boolean): string {
  return ((isEn ? l.title_en : null) || l.title || (isEn ? "Untitled listing" : "Fiche sans titre")) as string;
}

// /revendiquer/[jeton] · /en/claim/[jeton]
export async function ClaimTokenPage({ jeton }: { jeton: string }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("claim")]);
  const isEn = locale === "en";
  const admin = adminSupabase();

  const lookup = await findClaimToken(admin, jeton, "claim");
  if (lookup.status !== "ok") return <Problem kind={lookup.status} />;

  // Toutes les fiches non revendiquées de cette adresse : un seul lien les couvre.
  const { data: listings } = await admin
    .from("listings")
    .select("id, title, title_en, city")
    .eq("claim_email", lookup.token.claim_email)
    .eq("claim_status", "unclaimed")
    .order("title");
  if (!listings || listings.length === 0) return <Problem kind="used" />;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const here = isEn ? `/en/claim/${jeton}` : `/revendiquer/${jeton}`;
  const next = encodeURIComponent(here);

  return (
    <Shell>
      <h1 className="text-2xl sm:text-3xl font-bold text-charcoal-800">{t("claimTitle", { count: listings.length })}</h1>
      <p className="mt-3 text-base text-charcoal-600">{t("claimIntro", { count: listings.length })}</p>

      <h2 className="mt-8 text-heading-3 font-semibold text-charcoal-800">{t("claimListingsTitle")}</h2>
      <ul className="mt-3 divide-y divide-[#ebebeb] rounded-xl border border-[#ebebeb]">
        {listings.map((l) => (
          <li key={l.id as string} className="px-4 py-3">
            <p className="text-base font-semibold text-charcoal-800">{titleOf(l as { title: string | null; title_en: string | null }, isEn)}</p>
            {l.city && <p className="text-sm text-charcoal-500">{l.city as string}</p>}
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <ClaimForm
          token={jeton}
          count={listings.length}
          signedInEmail={user?.email ?? null}
          loginHref={`${localePath("/login", locale)}?next=${next}`}
          signupHref={`${localePath("/signup", locale)}?role=host&next=${next}`}
          dashboardHref={localePath("/dashboard", locale)}
        />
      </div>
    </Shell>
  );
}

// /retirer/[jeton] · /en/remove/[jeton]
export async function RemoveTokenPage({ jeton }: { jeton: string }) {
  const locale = await getLocale();
  const admin = adminSupabase();
  const lookup = await findClaimToken(admin, jeton, "remove");
  if (lookup.status !== "ok") return <Problem kind={lookup.status} />;

  const { data: listing } = await admin
    .from("listings")
    .select("title, title_en, claim_status")
    .eq("id", lookup.token.listing_id as string)
    .maybeSingle();
  if (!listing || listing.claim_status !== "unclaimed") return <Problem kind="used" />;

  return (
    <Shell>
      <RemoveForm token={jeton} title={titleOf(listing as { title: string | null; title_en: string | null }, locale === "en")} />
    </Shell>
  );
}

// /signaler/[jeton] · /en/report/[jeton]
export async function ReportTokenPage({ jeton }: { jeton: string }) {
  const admin = adminSupabase();
  const lookup = await findClaimToken(admin, jeton, "dispute");
  if (lookup.status !== "ok") return <Problem kind={lookup.status} />;
  return (
    <Shell>
      <ReportForm token={jeton} />
    </Shell>
  );
}

// /revendiquer/verification?listing=… · /en/claim/verification?listing=… (option B)
export async function VerificationPage({ listingId }: { listingId: string | undefined }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("claim")]);
  const isEn = locale === "en";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const here = `${isEn ? "/en/claim/verification" : "/revendiquer/verification"}?listing=${listingId ?? ""}`;
  if (!user) redirect(`${localePath("/login", locale)}?next=${encodeURIComponent(here)}`);

  const unavailable = (
    <Shell>
      <p className="text-base text-charcoal-600">{t("verifyUnavailable")}</p>
    </Shell>
  );
  if (!listingId || !UUID.test(listingId)) return unavailable;

  const { data: listing } = await adminSupabase()
    .from("listings")
    .select("title, title_en, claim_status")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing || listing.claim_status !== "unclaimed") return unavailable;

  return (
    <Shell>
      <VerificationForm listingId={listingId} title={titleOf(listing as { title: string | null; title_en: string | null }, isEn)} />
    </Shell>
  );
}
