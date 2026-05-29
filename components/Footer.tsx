import Link from "next/link";


function FooterLogo() {
  return (
    <object
      type="image/svg+xml"
      data="/logo-wordmark.svg"
      aria-hidden="true"
      className="block h-[42px] w-auto pointer-events-none"
      style={{ width: 200, height: 42 }}
    />
  );
}

export default function Footer() {
  return (
    <footer className="w-full block bg-charcoal-50 border-t border-[#ebebeb]">
      <div className="px-6 lg:px-8 py-14">

        {/* ── Columns ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="md:col-span-1">
            <FooterLogo />
            <p className="text-sm text-charcoal-400 leading-relaxed mt-4 max-w-xs">
              Payez votre location de chalet moins cher en contactant les propriétaires directement, sans commissions, ni frais de service.
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
              Proprios
            </h3>
            <ul className="space-y-3 text-sm">
              <FooterLink href="/devenir-hote" label="Inscrire mon chalet" />
              <FooterLink href="/devenir-hote" label="Pourquoi nous choisir ?" />
              <FooterLink href="/tarifs" label="Tarifs et abonnement" />
              <FooterLink href="/faq-hotes" label="FAQ proprios" />
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
            Fait avec{" "}
            <svg className="inline w-3.5 h-3.5 text-primary align-[-2px]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            {" "}au Québec.
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
