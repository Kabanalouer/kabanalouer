"use client";

import { useEffect } from "react";
import { trackFunnelStep, type FunnelStep } from "@/lib/funnel";

// Compte une étape de tunnel à l'affichage d'une page (une fois par visite).
export default function FunnelStepTracker({ step }: { step: FunnelStep }) {
  useEffect(() => {
    trackFunnelStep(step);
  }, [step]);
  return null;
}
