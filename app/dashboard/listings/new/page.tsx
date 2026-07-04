import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewListingStepZero from "@/components/dashboard/NewListingStepZero";

export const metadata = { title: "Nouveau chalet" };

export default async function NewListingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="max-w-3xl">
      <NewListingStepZero />
    </div>
  );
}
