import type { DraftOwnerRow } from "@/lib/claims/draftTable";

// Onglets d'Admin → Brouillons. Fichier sans dépendance serveur : il est importé par le composant client.
// Chaque propriétaire est dans un seul onglet : celui où il y a d'abord quelque chose à faire.

export type DraftTab = "invitations" | "relances" | "ouverts" | "sans_reaction" | "actives" | "import" | "problemes" | "retires";

export const DRAFT_TABS: DraftTab[] = ["invitations", "relances", "ouverts", "sans_reaction", "actives", "import", "problemes", "retires"];

export const DRAFT_TAB_INFO: Record<DraftTab, { label: string; hint: string; empty: string }> = {
  invitations: {
    label: "Invitations à envoyer",
    hint: "Fiches importées et prêtes : vérifiez-les, puis cliquez sur « Envoyer l’invitation ».",
    empty: "Aucune invitation à envoyer pour l’instant.",
  },
  relances: {
    label: "Relances à envoyer",
    hint: "Relance J+3 ou J+10 due : l’invitation est partie et aucune fiche n’est activée.",
    empty: "Aucune relance à envoyer.",
  },
  ouverts: {
    label: "Ouvert, pas activé",
    hint: "Ont ouvert l’invitation ou une relance (ou revendiqué leurs fiches) mais n’ont pas activé leurs fiches : ce sont les plus chauds.",
    empty: "Personne n’a ouvert un courriel sans activer ses fiches.",
  },
  sans_reaction: {
    label: "Sans réaction",
    hint: "Invitation envoyée, jamais ouverte, pas de relance due pour l’instant. L’ouverture est indicative : certains logiciels de courriel bloquent le suivi.",
    empty: "Aucun propriétaire en attente de réaction.",
  },
  actives: {
    label: "Activés",
    hint: "Au moins une fiche est en ligne.",
    empty: "Aucun propriétaire n’a encore activé ses fiches.",
  },
  import: {
    label: "Import en cours",
    hint: "Les fiches s’importent (une toutes les 5 minutes). L’invitation sera possible quand tout sera importé.",
    empty: "Aucun import en cours.",
  },
  problemes: {
    label: "Problèmes",
    hint: "Aucune fiche n’a pu être créée : import refusé, retiré ou en échec après plusieurs essais. Voir Admin → Invitations, file d’import, pour l’erreur.",
    empty: "Aucun import n’a échoué.",
  },
  retires: {
    label: "Retirés",
    hint: "Le propriétaire a demandé le retrait de ses fiches, ou vous l’avez retiré des envois (bouton « Retirer ») : on ne lui écrit plus. « Rétablir » remet l’adresse dans les envois.",
    empty: "Aucun propriétaire retiré.",
  },
};

export function draftTab(row: Pick<DraftOwnerRow, "status" | "due" | "invite" | "reminder3" | "reminder10">): DraftTab {
  if (row.status === "retire") return "retires";
  if (row.status === "actif") return "actives";
  if (row.status === "sans_fiche") return "problemes";
  if (row.status === "import") return "import";
  if (row.due) return "relances";
  if (row.status === "pret") return "invitations";
  // Invité (ou revendiqué sans activer) : a-t-il ouvert l'invitation ou une relance ?
  const opened = row.status === "revendique" || !!(row.invite?.openedAt || row.reminder3?.openedAt || row.reminder10?.openedAt);
  return opened ? "ouverts" : "sans_reaction";
}

export function parseDraftTab(value: string | null | undefined): DraftTab | null {
  return DRAFT_TABS.find((t) => t === value) ?? null;
}
