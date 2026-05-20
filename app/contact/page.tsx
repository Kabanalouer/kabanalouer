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
      <section className="bg-[#F8FAF9] border-b border-gray-100 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            ✉️ Contact
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight">
            Contactez-nous
          </h1>
          <p className="text-lg text-gray-500 max-w-md mx-auto">
            Notre équipe est là pour vous aider. Nous répondons généralement dans les{" "}
            <strong className="text-gray-700">24 heures ouvrables</strong>.
          </p>
        </div>
      </section>

      {/* ── Form + Info ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">

            {/* Left — Form */}
            <div className="lg:col-span-3">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Envoyez-nous un message
              </h2>
              <ContactForm />
            </div>

            {/* Right — Info */}
            <div className="lg:col-span-2 space-y-8">

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
                    📧
                  </div>
                  <h3 className="font-semibold text-gray-900">Courriel</h3>
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
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
                    🕐
                  </div>
                  <h3 className="font-semibold text-gray-900">Heures de réponse</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Lundi au vendredi<br />
                  9h00 à 17h00
                </p>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
                    🌐
                  </div>
                  <h3 className="font-semibold text-gray-900">Réseaux sociaux</h3>
                </div>
                <div className="flex gap-3">
                  {/* Facebook */}
                  <span
                    aria-label="Facebook"
                    className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                    </svg>
                  </span>
                  {/* Instagram */}
                  <span
                    aria-label="Instagram"
                    className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
                    </svg>
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Bientôt disponibles</p>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── Quick FAQ ── */}
      <section className="py-20 bg-[#F8FAF9] border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
            Questions fréquentes
          </h2>
          <div className="space-y-3">
            {FAQ.map(({ q, a }) => (
              <details
                key={q}
                className="group border border-gray-100 rounded-2xl bg-white overflow-hidden"
              >
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none font-semibold text-gray-900 text-sm select-none">
                  {q}
                  <svg
                    className="w-4 h-4 text-gray-400 shrink-0 ml-3 transition-transform group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
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
