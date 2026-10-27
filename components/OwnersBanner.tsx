import Image from "next/image";

// Bannière « Votre chalet en ligne aujourd'hui » : un seul composant, utilisé partout (bas de /devenir-hote,
// accueil, recherche, pages région, ville, thème). Référence : la bannière de /devenir-hote (2026-10-26).
// Les boutons arrivent en enfants : sur /devenir-hote ils portent le suivi et l'accès proprio, ailleurs ce sont des liens.

const BTN_MOTION =
  "transition-[background-color,transform] duration-[140ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";

export const OWNERS_BANNER_PRIMARY_BTN = `inline-flex items-center justify-center gap-2.5 min-h-14 py-3 px-[26px] rounded-full bg-white text-primary-800 text-base font-extrabold text-center hover:bg-primary-50 ${BTN_MOTION}`;
export const OWNERS_BANNER_SECONDARY_BTN = `inline-flex items-center justify-center gap-2.5 min-h-14 py-3 px-6 rounded-full border-[1.5px] border-white bg-[rgba(21,24,13,0.35)] text-white text-base font-bold text-center sm:whitespace-nowrap hover:bg-white/10 ${BTN_MOTION}`;

// Icônes des boutons de la bannière : loupe (Trouver mon chalet) et plus (Créer mon annonce).
export function BannerSearchIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function BannerPlusIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function OwnersBanner({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="relative mx-auto max-w-[1240px] rounded-[20px] overflow-hidden bg-primary-800">
      <Image
        src="/images/devenir-hote/chalet-soiree.jpg"
        alt=""
        fill
        loading="lazy"
        sizes="(max-width: 1240px) 100vw, 1240px"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[rgba(21,24,13,0.85)] via-[rgba(21,24,13,0.55)] via-60% to-[rgba(21,24,13,0.3)]" />
      <div className="relative px-6 py-10 sm:p-[clamp(40px,6vw,88px)] flex flex-col gap-[22px] max-w-[680px]">
        <h2 className="m-0 text-[clamp(34px,4.4vw,56px)] leading-[1.04] font-extrabold tracking-display text-white text-balance">{title}</h2>
        <p className="m-0 text-lg leading-[1.55] text-white/90">{subtitle}</p>
        <div className="flex flex-wrap gap-3">{children}</div>
      </div>
    </div>
  );
}
