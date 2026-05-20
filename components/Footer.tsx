import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="text-white font-bold text-xl mb-3">Kabanalouer</div>
            <p className="text-sm leading-relaxed">
              La marketplace des chalets québécois. Contact direct entre propriétaires et voyageurs.
            </p>
          </div>

          {/* Voyageurs */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-xs uppercase tracking-widest">
              Voyageurs
            </h3>
            <ul className="space-y-2.5 text-sm">
              <FooterLink href="/chalets" label="Parcourir les chalets" />
              <FooterLink href="/regions" label="Toutes les régions" />
              <FooterLink href="/comment-ca-marche" label="Comment ça marche" />
            </ul>
          </div>

          {/* Hôtes */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-xs uppercase tracking-widest">
              Hôtes
            </h3>
            <ul className="space-y-2.5 text-sm">
              <FooterLink href="/signup" label="Inscrire mon chalet" />
              <FooterLink href="/devenir-hote" label="Pourquoi nous choisir ?" />
              <FooterLink href="/tarifs" label="Tarifs & abonnement" />
              <FooterLink href="/faq" label="FAQ hôtes" />
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-xs uppercase tracking-widest">
              Légal
            </h3>
            <ul className="space-y-2.5 text-sm">
              <FooterLink href="/a-propos" label="À propos" />
              <FooterLink href="/conditions" label="Conditions d'utilisation" />
              <FooterLink href="/confidentialite" label="Politique de confidentialité" />
              <FooterLink href="/contact" label="Nous contacter" />
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-sm">© 2026 Kabanalouer. Tous droits réservés.</p>
          <p className="text-sm">Fait avec ❤️ au Québec 🍁</p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link href={href} className="hover:text-white transition-colors">
        {label}
      </Link>
    </li>
  );
}
