import Link from "next/link";

// ── Logo wordmark (coral, fond clair) ─────────────────────────────────────────
function FooterLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 360 80"
      fill="none"
      className="h-7 w-auto"
      aria-label="Kabanalouer"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M40 8 L72 42 L66 42 L66 68 L48 68 L48 56 C48 51.5817 44.4183 48 40 48 C35.5817 48 32 51.5817 32 56 L32 68 L14 68 L14 42 L8 42 Z"
        fill="#f04e45"
      />
      <rect x="54" y="20" width="5" height="13" fill="#f04e45" />
      <text
        x="88"
        y="52"
        fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
        fontSize="34"
        fontWeight="800"
        letterSpacing="-1.3"
        fill="#f04e45"
      >
        kabanalouer
      </text>
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="bg-charcoal-50 border-t border-[#ebebeb]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">

        {/* ── Columns ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="md:col-span-1">
            <FooterLogo />
            <p className="text-sm text-charcoal-400 leading-relaxed mt-4 max-w-xs">
              La marketplace de la location de chalet au Québec. Contact direct entre voyageurs et propriétaires.
            </p>
          </div>

          {/* Voyageurs */}
          <div>
            <h3 className="text-xs font-semibold text-charcoal-800 uppercase tracking-[0.08em] mb-4">
              Voyageurs
            </h3>
            <ul className="space-y-3 text-sm">
              <FooterLink href="/chalets" label="Parcourir les chalets" />
              <FooterLink href="/regions" label="Toutes les régions" />
              <FooterLink href="/comment-ca-marche" label="Comment ça marche" />
            </ul>
          </div>

          {/* Hôtes */}
          <div>
            <h3 className="text-xs font-semibold text-charcoal-800 uppercase tracking-[0.08em] mb-4">
              Hôtes
            </h3>
            <ul className="space-y-3 text-sm">
              <FooterLink href="/signup" label="Inscrire mon chalet" />
              <FooterLink href="/devenir-hote" label="Pourquoi nous choisir ?" />
              <FooterLink href="/tarifs" label="Tarifs et abonnement" />
              <FooterLink href="/faq-hotes" label="FAQ hôtes" />
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h3 className="text-xs font-semibold text-charcoal-800 uppercase tracking-[0.08em] mb-4">
              Légal
            </h3>
            <ul className="space-y-3 text-sm">
              <FooterLink href="/a-propos" label="À propos" />
              <FooterLink href="/conditions" label="Conditions d'utilisation" />
              <FooterLink href="/confidentialite" label="Politique de confidentialité" />
              <FooterLink href="/contact" label="Nous contacter" />
            </ul>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-[#ebebeb] pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-charcoal-400">
            © 2026 Kabanalouer · Tous droits réservés
          </p>
          <p className="text-xs text-charcoal-400">
            Fait avec soin au Québec
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="text-charcoal-500 hover:text-charcoal-800 transition-colors"
      >
        {label}
      </Link>
    </li>
  );
}
