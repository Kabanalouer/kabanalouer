import EmailSequencesClient from "@/components/admin/EmailSequencesClient";

export const metadata = { title: "Séquences courriel — Administration" };

export default function AdminEmailsPage() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-charcoal-800">Séquences courriel</h1>
      <p className="mt-2 text-base text-charcoal-500">
        Tous les courriels envoyés automatiquement par Kabanalouer, par catégorie. Envoie une copie de test avec des données d’exemple (Chalet Authentik 50).
      </p>
      <EmailSequencesClient />
    </div>
  );
}
