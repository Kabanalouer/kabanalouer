import Link from "next/link";
import Image from "next/image";

function FooterLogo() {
  return (
    <Image
      src="/logo-wordmark.svg"
      alt="Kabanalouer"
      width={133}
      height={28}
      className="h-7 w-auto"
    />
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
