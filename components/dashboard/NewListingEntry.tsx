"use client";

import { useState } from "react";
import ExistingListingCheck from "@/components/dashboard/ExistingListingCheck";
import NewListingStepZero from "@/components/dashboard/NewListingStepZero";

// « Inscrire mon chalet » : d'abord la vérification facultative d'une fiche déjà présente (CITQ),
// puis le choix créer à la main / importer depuis Airbnb.
export default function NewListingEntry({ initialImportUrl }: { initialImportUrl: string | null }) {
  const [checked, setChecked] = useState(false);
  if (!checked) return <ExistingListingCheck onContinue={() => setChecked(true)} />;
  return <NewListingStepZero initialImportUrl={initialImportUrl} />;
}
