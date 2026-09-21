import { createClient } from "@/lib/supabase/server";
import AdminInvoicesClient, { type AdminInvoiceRow } from "@/components/admin/AdminInvoicesClient";

export const metadata = { title: "Facturation — Administration" };

export default async function AdminInvoicesPage() {
  const supabase = await createClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, year, transaction_date, transaction_type, amount_before_tax, total_amount, listing_id, client:user_id(name, email), listing:listing_id(title)"
    )
    .order("transaction_date", { ascending: false });

  const rows: AdminInvoiceRow[] = (invoices ?? []).map((inv) => {
    const client = Array.isArray(inv.client) ? inv.client[0] : inv.client;
    const listing = Array.isArray(inv.listing) ? inv.listing[0] : inv.listing;
    const name = ((client as { name?: string } | null)?.name ?? "").trim();
    const [firstName, ...rest] = name.split(/\s+/);

    return {
      id: inv.id as string,
      invoiceNumber: inv.invoice_number as string,
      year: inv.year as number,
      firstName: firstName || "",
      lastName: rest.join(" "),
      email: (client as { email?: string } | null)?.email ?? "",
      listingTitle: (listing as { title?: string } | null)?.title ?? "Chalet sans titre",
      listingId: inv.listing_id as string | null,
      transactionDate: inv.transaction_date as string,
      amountBeforeTax: inv.amount_before_tax as number,
      totalAmount: inv.total_amount as number,
    };
  });

  const years = Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => b - a);
  if (years.length === 0) years.push(new Date().getFullYear());

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-charcoal-800">Facturation</h1>
        <p className="text-sm text-charcoal-400 mt-0.5">
          {rows.length} facture{rows.length !== 1 ? "s" : ""} au total
        </p>
      </div>
      <AdminInvoicesClient rows={rows} years={years} />
    </div>
  );
}
