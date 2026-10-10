"use client";

import { openConsentSettings } from "@/lib/consent";

// Pied de page : rouvre le bandeau de consentement pour changer d'avis.
export default function ManageCookiesLink({ label, className }: { label: string; className?: string }) {
  return (
    <button type="button" onClick={openConsentSettings} className={className}>
      {label}
    </button>
  );
}
