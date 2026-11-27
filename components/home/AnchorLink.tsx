"use client";

import type { MouseEvent, ReactNode } from "react";

// Lien vers une ancre de la même page (ex. « Voir la comparaison → » vers #comparatif) : la page défile en douceur
// jusqu'à la section, pour que le visiteur voie d'où il vient et où il arrive. Sans animation si le visiteur la réduit
// (prefers-reduced-motion). Sans JavaScript, le lien reste un lien d'ancre normal (saut direct).
export default function AnchorLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(href.slice(1));
    if (!target) return; // ancre absente : le comportement normal du navigateur s'applique
    e.preventDefault();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", href);
    // Le clavier et les lecteurs d'écran suivent : le focus passe à la section sans faire sauter la page.
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  };
  return (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  );
}
