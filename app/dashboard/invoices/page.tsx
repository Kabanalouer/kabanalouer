import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import InvoicesClient, { type InvoiceRow } from "@/components/dashboard/InvoicesClient";

export const metadata = { title: "Mes factures" };

export default async function InvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = await getTranslations("myInvoices");

  // RLS ("Les proprios voient leurs propres factures") filtre déjà à
  // user_id = auth.uid() — le .eq() ci-dessous est une deuxième garantie,
  // jamais les factures des autres proprios.
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, transaction_type, transaction_date, total_amount, listing:listing_id(title)")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false });

  const rows: InvoiceRow[] = (invoices ?? []).map((inv) => {
    const listing = Array.isArray(inv.listing) ? inv.listing[0] : inv.listing;
    return {
      id: inv.id as string,
      listingTitle: (listing as { title?: string } | null)?.title ?? "",
      transactionType: inv.transaction_type as string,
      transactionDate: inv.transaction_date as string,
      totalAmount: inv.total_amount as number,
    };
  });

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-charcoal-800">{t("heading")}</h1>
      </div>
      <InvoicesClient rows={rows} />
    </div>
  );
}
