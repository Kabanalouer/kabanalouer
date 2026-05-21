import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForm from "./ContactForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nous contacter",
  description:
    "Contactez l'équipe Kabanalouer. Nous sommes là pour vous aider, que vous soyez voyageur ou propriétaire de chalet.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Nous contacter | Kabanalouer",
    description:
      "Contactez l'équipe Kabanalouer. Nous sommes là pour vous aider, que vous soyez voyageur ou propriétaire de chalet.",
    url: "/contact",
  },
};

const FAQ = [
  {
    q: "Je suis voyageur, comment contacter un propriétaire ?",
    a: "Utilisez la messagerie intégrée sur la fiche du chalet. Créez un compte gratuit pour envoyer un message directement à l'hôte.",
  },
  {
    q: "J'ai un problème avec mon annonce ?",
    a: "Connectez-vous à votre tableau de bord et vérifiez les différentes sections de votre annonce. Si le problème persiste, écrivez-nous via ce formulaire.",
  },
  {
    q: "Comment annuler mon abonnement ?",
    a: "Contactez-nous via ce formulaire avec votre courriel d'inscription et nous traiterons votre demande dans les 24 heures ouvrables.",
  },
];

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-[#F8FAF9] border-b border-[#ebebeb] py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            Contact
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-charcoal-800 mb-5 leading-tight">
            Contactez-nous
          </h1>
          <p className="text-lg text-charcoal-500 max-w-md mx-auto">
            Notre équipe est là pour vous aider. Nous répondons généralement dans les{" "}
            <strong className="text-charcoal-700">24 heures ouvrables</strong>.
          </p>
        </div>
      </section>

      {/* ── Form + Info ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">

            {/* Left — Form */}
            <div className="lg:col-span-3">
              <h2 className="text-xl font-bold text-charcoal-800 mb-6">
                Envoyez-nous un message
              </h2>
              <ContactForm />
            </div>

            {/* Right — Info */}
            <div className="lg:col-span-2 space-y-8">

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-charcoal-800">Courriel</h3>
                </div>
                <a
                  href="mailto:info@kabanalouer.ca"
                  className="text-primary hover:underline text-sm font-medium"
                >
                  info@kabanalouer.ca
                </a>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-charcoal-800">Heures de réponse</h3>
                </div>
                <p className="text-sm text-charcoal-600 leading-relaxed">
                  Lundi au vendredi<br />
                  9h00 à 17h00
                </p>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253M3 12a8.96 8.96 0 01.284-2.253" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-charcoal-800">Réseaux sociaux</h3>
                </div>
                <div className="flex gap-3">
                  {/* Facebook */}
                  <span
                    aria-label="Facebook"
                    className="w-9 h-9 rounded-xl border border-[#ebebeb] flex items-center justify-center text-charcoal-400 cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                    </svg>
                  </span>
                  {/* Instagram */}
                  <span
                    aria-label="Instagram"
                    className="w-9 h-9 rounded-xl border border-[#ebebeb] flex items-center justify-center text-charcoal-400 cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
                    </svg>
                  </span>
                </div>
                <p className="text-xs text-charcoal-400 mt-2">Bientôt disponibles</p>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── Quick FAQ ── */}
      <section className="py-20 bg-[#F8FAF9] border-t border-[#ebebeb]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-charcoal-800 text-center mb-10">
            Questions fréquentes
          </h2>
          <div className="space-y-3">
            {FAQ.map(({ q, a }) => (
              <details
                key={q}
                className="group border border-[#ebebeb] rounded-2xl bg-white overflow-hidden"
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

      <Footer />
    </div>
  );
}
