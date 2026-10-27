"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import ExistingListingCheck from "@/components/dashboard/ExistingListingCheck";
import NewListingStepZero from "@/components/dashboard/NewListingStepZero";

// « Inscrire mon chalet » : d'abord la vérification facultative d'une fiche déjà présente (CITQ),
// puis le choix créer à la main / importer depuis Airbnb.
export default function NewListingEntry({ initialImportUrl }: { initialImportUrl: string | null }) {
  // ?verifie=1 : le proprio vient de chercher son chalet par ville (page « Trouver mon chalet »), l'étape CITQ est déjà faite.
  const alreadySearched = useSearchParams().get("verifie") === "1";
  const [checked, setChecked] = useState(alreadySearched);
  if (!checked) return <ExistingListingCheck onContinue={() => setChecked(true)} />;
  return <NewListingStepZero initialImportUrl={initialImportUrl} />;
}
