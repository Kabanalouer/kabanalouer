import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/siteUrl";
import AvailabilityCalendar from "@/components/dashboard/AvailabilityCalendar";
import ICalSync from "@/components/dashboard/ICalSync";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  return { title: "Disponibilités" };
}

export default async function AvailabilityPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: listing }, { data: availability }] = await Promise.all([
    supabase
      .from("listings")
      .select("id, title, ical_url, ical_last_sync")
      .eq("id", id)
      .eq("host_id", user.id)
      .single(),
    supabase
      .from("availability")
      .select("date, source")
      .eq("listing_id", id)
      .eq("is_blocked", true)
      .order("date", { ascending: true }),
  ]);

  if (!listing) notFound();

  const blocked = (availability ?? []) as { date: string; source: "manual" | "ical" }[];

  const appUrl = SITE_URL;
  const exportUrl = `${appUrl}/api/listings/${id}/ical`;

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/dashboard/listings" className="hover:text-gray-600 transition-colors">
          Mes chalets
        </Link>
        <span>›</span>
        <span className="text-gray-600 truncate max-w-xs">{listing.title}</span>
        <span>›</span>
        <span className="text-gray-900">Disponibilités</span>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disponibilités</h1>
          <p className="text-gray-500 text-sm mt-1">
            Les dates non bloquées sont automatiquement disponibles pour les voyageurs.
          </p>
        </div>
        <Link
          href={`/dashboard/listings/${id}/edit`}
          className="shrink-0 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-2 rounded-xl transition-colors"
        >
          ← Retour au chalet
        </Link>
      </div>

      <div className="space-y-6">
        <AvailabilityCalendar listingId={id} initialBlocked={blocked} />
        <ICalSync
          listingId={id}
          initialUrl={listing.ical_url ?? null}
          initialLastSync={listing.ical_last_sync ?? null}
        />
      </div>
    </div>
  );
}
