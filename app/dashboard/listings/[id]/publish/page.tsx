import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { normalizePhotos } from "@/lib/photo";
import PublishPageClient from "@/components/dashboard/PublishPageClient";
import { MIN_PHOTOS } from "@/components/dashboard/PhotoUpload";

export const metadata = { title: "Publier mon annonce — Kabanalouer" };

const FREE_LAUNCH_LIMIT = 50;

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}

export default async function PublishPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { paid } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Stripe callback: subscription just activated → publish and redirect
  if (paid === "1") {
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subscription?.status === "active") {
      await adminSupabase()
        .from("listings")
        .update({ is_published: true })
        .eq("id", id)
        .eq("host_id", user.id);
      redirect(`/chalets/${id}?published=1`);
    }
  }

  const [{ data: listing }, { data: subscription }, { count: activeCount }] = await Promise.all([
    supabase.from("listings").select("is_published, photos, citq_number, title").eq("id", id).eq("host_id", user.id).single(),
    supabase.from("subscriptions").select("status, expires_at").eq("user_id", user.id).maybeSingle(),
    adminSupabase().from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
  ]);

  if (!listing) notFound();

  // Already published → redirect back to edit
  if (listing.is_published && subscription?.status === "active") {
    redirect(`/dashboard/listings/${id}/edit`);
  }

  const photos = normalizePhotos(listing.photos);
  const hasPhotos = photos.length >= MIN_PHOTOS;
  const hasCitq = (listing.citq_number as string | null ?? "").length === 6;
  const canPublish = hasPhotos && hasCitq;

  const slotsLeft = Math.max(0, FREE_LAUNCH_LIMIT - (activeCount ?? 0));
  const isFree = slotsLeft > 0;

  return (
    <div className="max-w-xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/dashboard/listings/${id}/edit`}
          className="inline-flex items-center gap-1.5 text-sm text-charcoal-500 hover:text-charcoal-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour à ma fiche
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-charcoal-800 mb-1">Publier mon annonce</h1>
      <p className="text-sm text-charcoal-400 mb-8 line-clamp-1">{listing.title as string}</p>

      <div className="bg-white rounded-2xl border border-[#ebebeb] p-6">
        <PublishPageClient
          listingId={id}
          canPublish={canPublish}
          missingPhotos={!hasPhotos}
          missingCitq={!hasCitq}
          minPhotos={MIN_PHOTOS}
          isFree={isFree}
          slotsLeft={slotsLeft}
          activeSubscriptionCount={activeCount ?? 0}
        />
      </div>
    </div>
  );
}
