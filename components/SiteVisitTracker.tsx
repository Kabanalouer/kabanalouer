"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackFunnelStep } from "@/lib/funnel";

// Haut du tunnel voyageur : une visite du site public (une fois par visite).
// Les espaces privés (admin, tableau de bord proprio) ne comptent pas.
const PRIVATE = /^\/(en\/)?(admin|dashboard)(\/|$)/;

export default function SiteVisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname && !PRIVATE.test(pathname)) trackFunnelStep("t_visit");
  }, [pathname]);
  return null;
}
