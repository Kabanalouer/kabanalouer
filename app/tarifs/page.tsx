import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tarifs et abonnement",
  description:
    "Un seul abonnement annuel simple et transparent. 299 $/an par chalet. Offre gratuite pour les 50 premiers hôtes.",
  alternates: { canonical: "/tarifs" },
  openGraph: {
    title: "Tarifs et abonnement | Kabanalouer",
    description:
      "Un seul abonnement annuel simple et transparent. 299 $/an par chalet. Offre gratuite pour les 50 premiers hôtes.",
    url: "/tarifs",
  },
};

const FREE_LAUNCH_LIMIT = 50;

const INCLUDED = [
  "Annonce illimitée avec photos HD",
  "Messagerie directe avec les voyageurs",
  "Calendrier de disponibilités (18 mois)",
  "Synchronisation iCal (Airbnb, Booking)",
  "Tableau de bord et statistiques",
  "Génération de description par IA",
  "Score de qualité et conseils",
  "Support par courriel",
  "1 an d'accès inclus",
];

const COMPARISON = [
  { feature: "Abonnement annuel", kbl: "299 $/an", airbnb: "Gratuit" },
  { feature: "Commission sur réservation", kbl: "0 %", airbnb: "3–5 %" },
  { feature: "Frais de service voyageur", kbl: "0 %", airbnb: "14–20 %" },
  { feature: "Contact direct", kbl: true, airbnb: "Limité" },
  { feature: "Spécialisé Québec", kbl: true, airbnb: false },
];

const FAQ = [
  {
    q: "Le prix est-il par chalet ou par compte ?",
    a: "Par chalet. Si vous avez 2 chalets, vous payez 2 abonnements.",
  },
  {
    q: "L'abonnement est-il remboursable ?",
    a: "Non, l'abonnement n'est pas remboursable ni transférable.",
  },
  {
    q: "Que se passe-t-il à l'expiration ?",
    a: "Votre annonce est automatiquement dépubliée. Vous pouvez renouveler à tout moment depuis votre tableau de bord.",
  },
  {
    q: "Y a-t-il des frais de transaction ?",
    a: "Non. Kabanalouer ne prélève aucune commission sur vos revenus locatifs. Le paiement se fait directement entre vous et le voyageur.",
  },
];

async function getActiveSubscriptionCount(): Promise<number> {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { count } = await admin
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");
  return count ?? 0;
}

export default async function TarifsPage() {
  const usedSlots = await getActiveSubscriptionCount();
  const remaining = Math.max(0, FREE_LAUNCH_LIMIT - usedSlots);
  const hasOffer = remaining > 0;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-[#F8FAF9] border-b border-[#ebebeb] py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            Tarif transparent
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-charcoal-800 mb-5 leading-tight">
            Un tarif simple et transparent
          </h1>
          <p className="text-lg text-charcoal-500 max-w-lg mx-auto">
            Un seul abonnement annuel. Aucune commission, aucun frais caché.
          </p>
        </div>
      </section>

      {/* ── Pricing card ── */}
      <section className="py-20 bg-white">
        <div className="max-w-lg mx-auto px-4 sm:px-6">
          <div className="bg-[#F8FAF9] rounded-2xl border border-[#ebebeb] p-8">
            {/* Badge */}
            {hasOffer && (
              <div className="inline-flex items-center gap-2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full mb-5">
                Offre de lancement — {remaining} place{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""}
              </div>
            )}

            {/* Price */}
            <div className="mb-6">
              {hasOffer ? (
                <div className="flex items-end gap-3">
                  <span className="text-6xl font-bold text-primary">0 $</span>
                  <div className="mb-2">
                    <p className="text-sm text-charcoal-400 line-through">299 $/an</p>
                    <p className="text-sm text-charcoal-500">première année</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <span className="text-6xl font-bold text-primary">299 $</span>
                  <span className="text-charcoal-500 mb-2">/an</span>
                </div>
              )}
              <p className="text-sm text-charcoal-400 mt-1">par chalet · tout inclus</p>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-8">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                    ✓
                  </span>
                  <span className="text-charcoal-700 text-sm">{item}</span>
                </li>
              ))}
            </ul>

            <Link
              href={hasOffer ? "/signup?role=host" : "/devenir-hote"}
              className="w-full inline-flex items-center justify-center bg-primary text-white font-bold py-4 rounded-full hover:bg-primary/90 transition-colors text-base"
            >
              {hasOffer ? "Profiter de l'offre gratuite →" : "Inscrire mon chalet →"}
            </Link>
            <p className="text-xs text-charcoal-400 text-center mt-3">
              Aucune carte requise · Annulation avant facturation
            </p>
          </div>
        </div>
      </section>

      {/* ── Comparison table ── */}
      <section className="py-20 bg-[#F8FAF9]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-charcoal-800 text-center mb-10">
            Kabanalouer vs Airbnb
          </h2>
          <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 bg-charcoal-50 border-b border-[#ebebeb]">
              <div className="px-6 py-4 text-xs font-semibold text-charcoal-400 uppercase tracking-wider" />
              <div className="px-6 py-4 text-sm font-bold text-primary text-center">
                Kabanalouer
              </div>
              <div className="px-6 py-4 text-sm font-semibold text-charcoal-500 text-center">
                Airbnb
              </div>
            </div>
            {COMPARISON.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-3 border-b border-[#ebebeb] ${i % 2 === 0 ? "bg-white" : "bg-charcoal-50/50"}`}
              >
                <div className="px-6 py-4 text-sm text-charcoal-700 font-medium">
                  {row.feature}
                </div>
                <div className="px-6 py-4 text-center">
                  {row.kbl === true ? (
                    <span className="text-primary font-bold text-lg">✓</span>
                  ) : (
                    <span className="text-sm font-semibold text-primary">{row.kbl}</span>
                  )}
                </div>
                <div className="px-6 py-4 text-center">
                  {row.airbnb === true ? (
                    <span className="text-charcoal-400 text-lg">✓</span>
                  ) : row.airbnb === false ? (
                    <span className="text-red-400 text-lg font-bold">✗</span>
                  ) : (
                    <span className="text-sm text-charcoal-500">{row.airbnb}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-charcoal-400 text-center mt-4">
            Frais Airbnb à titre indicatif, peuvent varier selon les marchés.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-charcoal-800 text-center mb-10">
            Questions sur les tarifs
          </h2>
          <div className="space-y-3">
            {FAQ.map(({ q, a }) => (
              <details
                key={q}
                className="group border border-[#ebebeb] rounded-2xl bg-[#F8FAF9] overflow-hidden"
              >
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none font-semibold text-charcoal-800 text-sm select-none">
                  {q}
                  <svg
                    className="w-4 h-4 text-charcoal-400 shrink-0 ml-3 transition-transform group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-5 text-sm text-charcoal-500 leading-relaxed border-t border-[#ebebeb] pt-4">
                  {a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-primary py-16">
        <div className="max-w-2xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Prêt à afficher votre chalet ?</h2>
          <p className="text-white/80 text-lg mb-8">
            {hasOffer
              ? `Profitez de l'offre gratuite — il reste ${remaining} place${remaining > 1 ? "s" : ""}.`
              : "Rejoignez des centaines de propriétaires québécois sur Kabanalouer."}
          </p>
          <Link
            href="/signup?role=host"
            className="inline-block bg-white text-primary font-bold px-10 py-4 rounded-full hover:bg-charcoal-50 transition-colors text-lg"
          >
            Commencer gratuitement →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
