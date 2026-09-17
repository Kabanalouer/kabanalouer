"use client";

import { useEffect, useRef, useState } from "react";

// Sauvegarde automatique générique par debounce — une seule instance couvre
// plusieurs sections d'un même formulaire tant que chaque section a sa propre
// clé stable (sectionKey) : un changement de clé "réarme" le hook sans
// déclencher de sauvegarde (on ne veut pas sauvegarder juste parce que
// l'hôte a changé d'onglet, seulement quand il modifie un champ).
//
// `save` reçoit la clé de section à sauvegarder — indispensable pour les
// flush (changement de section, démontage) : au moment où l'effet de
// changement de section s'exécute, l'état `activeSection` du composant
// appelant a déjà basculé vers la NOUVELLE section, donc le rappeler sans
// argument sauvegarderait les champs de la mauvaise section (souvent vide).
export function useAutosave(
  sectionKey: string,
  trigger: unknown,
  save: (sectionKey: string) => void,
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
  // — on la déclenche immédiatement (pour la section qu'on quitte, pas la
  // nouvelle) plutôt que de l'abandonner en silence.
  useEffect(() => {
    if (prevSectionRef.current !== sectionKey) {
      const leavingSection = prevSectionRef.current;
      prevSectionRef.current = sectionKey;
      skipNextRef.current = true;
      const hadPending = timerRef.current !== null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setPending(false);
      if (hadPending) saveRef.current(leavingSection);
    }
  }, [sectionKey]);

  // Démontage du formulaire (navigation ailleurs dans l'app) : même logique,
  // le beforeunload natif ne couvre que la fermeture d'onglet/rechargement.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        saveRef.current(prevSectionRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      save(sectionKey);
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, enabled]);

  return { pending };
}
