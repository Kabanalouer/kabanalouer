import { createClient } from "@/lib/supabase/server";
import ListingForm from "@/components/dashboard/ListingForm";

export const metadata = { title: "Nouveau chalet — Kabanalouer" };

export default async function NewListingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ajouter un chalet</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Complétez les informations pour créer votre fiche. L&apos;IA peut générer votre
          titre et description automatiquement.
        </p>
      </div>
      <ListingForm userId={user!.id} />
    </div>
  );
}
