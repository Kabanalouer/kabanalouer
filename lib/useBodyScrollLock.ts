"use client";

import { useEffect } from "react";

// Verrou de défilement de la page pendant qu'une surcouche (galerie plein
// écran, feuille modale) est ouverte. `overflow: hidden` seul ne suffit pas
// sur iOS Safari : le body reste défilable au doigt. On fige donc le body en
// `position: fixed` avec un décalage `top` égal au défilement courant, puis on
// restaure la position exacte à la fermeture. Compteur partagé : plusieurs
// surcouches imbriquées ne libèrent le verrou qu'à la dernière fermeture.

let lockCount = 0;
let savedScrollY = 0;
let savedStyles: Partial<Record<"position" | "top" | "left" | "right" | "width" | "overflow", string>> = {};
let savedHtmlOverflow = "";

function lock() {
  if (lockCount++ > 0) return;
  const { body, documentElement } = document;
  savedScrollY = window.scrollY;
  savedStyles = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    overflow: body.style.overflow,
  };
  savedHtmlOverflow = documentElement.style.overflow;
  documentElement.style.overflow = "hidden";
  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${savedScrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
}

function unlock() {
  if (lockCount === 0 || --lockCount > 0) return;
  const { body, documentElement } = document;
  documentElement.style.overflow = savedHtmlOverflow;
  body.style.position = savedStyles.position ?? "";
  body.style.top = savedStyles.top ?? "";
  body.style.left = savedStyles.left ?? "";
  body.style.right = savedStyles.right ?? "";
  body.style.width = savedStyles.width ?? "";
  body.style.overflow = savedStyles.overflow ?? "";
  // Défilement instantané : `scroll-behavior: smooth` global animerait sinon
  // le retour depuis le haut de la page.
  window.scrollTo({ top: savedScrollY, left: 0, behavior: "instant" as ScrollBehavior });
}

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
