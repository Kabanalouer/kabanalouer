"use client";

import { useEffect, useRef, useState } from "react";

// Sauvegarde automatique générique par debounce — une seule instance couvre
// plusieurs sections d'un même formulaire tant que chaque section a sa propre
// clé stable (sectionKey) : un changement de clé "réarme" le hook sans
// déclencher de sauvegarde (on ne veut pas sauvegarder juste parce que
// l'hôte a changé d'onglet, seulement quand il modifie un champ).
export function useAutosave(
  sectionKey: string,
  trigger: unknown,
  save: () => void,
  options: { delay?: number; enabled?: boolean } = {}
): { pending: boolean } {
  const { delay = 1750, enabled = true } = options;
  const [pending, setPending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextRef = useRef(true);
  const prevSectionRef = useRef(sectionKey);
  // Toujours à jour, pour que les flush (changement de section, démontage)
  // utilisent la dernière fonction de sauvegarde, jamais une fermeture périmée.
  const saveRef = useRef(save);
  saveRef.current = save;

  // Changement de section : on ne perd pas une sauvegarde encore en attente
  // — on la déclenche immédiatement plutôt que de l'abandonner en silence.
  useEffect(() => {
    if (prevSectionRef.current !== sectionKey) {
      prevSectionRef.current = sectionKey;
      skipNextRef.current = true;
      const hadPending = timerRef.current !== null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setPending(false);
      if (hadPending) saveRef.current();
    }
  }, [sectionKey]);

  // Démontage du formulaire (navigation ailleurs dans l'app) : même logique,
  // le beforeunload natif ne couvre que la fermeture d'onglet/rechargement.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        saveRef.current();
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }
    setPending(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setPending(false);
      save();
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, enabled]);

  return { pending };
}
