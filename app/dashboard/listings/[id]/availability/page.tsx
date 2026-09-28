import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { localePath } from "@/lib/localePath";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata() {
  return { title: "Disponibilités" };
}

// Ancienne page de disponibilités : le calendrier se gère maintenant dans la
// section Calendrier du formulaire d'annonce (une seule méthode à la fois).
export default async function AvailabilityPage({ params }: Props) {
  const { id } = await params;
  const locale = await getLocale();
  redirect(localePath(`/dashboard/listings/${id}/edit?section=calendrier`, locale));
}
