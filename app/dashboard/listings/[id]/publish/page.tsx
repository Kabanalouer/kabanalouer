import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getLocale } from "next-intl/server";
import { localePath } from "@/lib/localePath";

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

  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(localePath(`/login?next=${encodeURIComponent(localePath(`/dashboard/listings/${id}/publish${paid === "1" ? "?paid=1" : ""}`, locale))}`, locale));

  // Stripe callback: if subscription just activated, publish and redirect to public listing
  if (paid === "1") {
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("listing_id", id)
      .maybeSingle();

    if (subscription?.status === "active") {
      await adminSupabase()
        .from("listings")
        .update({ is_published: true })
        .eq("id", id)
        .eq("host_id", user.id);
      redirect(localePath(`/chalets/${id}?published=1`, locale));
    }
  }

  redirect(localePath(`/dashboard/listings/${id}/edit`, locale));
}
