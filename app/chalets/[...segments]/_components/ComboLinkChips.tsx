import Link from "next/link";

// Rangée de liens en pastilles vers des pages région/ville × type (maillage
// interne, voir lib/comboLandings.ts). Rien n'est rendu sans lien.
export default function ComboLinkChips({
  title,
  links,
  className = "",
}: {
  title: string;
  links: { href: string; label: string; count?: number }[];
  className?: string;
}) {
  if (links.length === 0) return null;
  return (
    <div className={className}>
      <h2 className="text-heading-2 font-bold text-charcoal-900 mb-4">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="px-4 py-2 rounded-full border border-charcoal-100 text-sm text-charcoal-700 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
          >
            {l.label}
            {typeof l.count === "number" && <span className="text-charcoal-400"> · {l.count}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
