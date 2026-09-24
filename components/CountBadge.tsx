// Pastilles de notification — couleur accent (orange brûlé), réservée aux
// signaux « nouveau » (voir CLAUDE.md § Couleurs). Chiffre plafonné à 9+.

export function CountBadge({ count, label, className = "" }: { count: number; label: string; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      role="status"
      aria-label={label}
      className={`bg-accent text-white text-xs font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center leading-none shrink-0 ${className}`}
    >
      <span aria-hidden="true">{count > 9 ? "9+" : count}</span>
    </span>
  );
}

// Point posé sur la photo de profil quand l'espace ne permet pas un chiffre ;
// le contour blanc le détache de n'importe quelle photo.
export function AvatarDot({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-accent ring-2 ring-white ${className}`}
    />
  );
}
