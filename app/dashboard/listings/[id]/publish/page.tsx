import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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

  // Stripe callback: if subscription just activated, publish and redirect to public listing
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

  // All other cases: redirect to edit page where the publish section lives
  redirect(`/dashboard/listings/${id}/edit`);
}
