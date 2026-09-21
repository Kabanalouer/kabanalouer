import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import InvoiceDocument, { type InvoiceData } from "@/lib/pdf/InvoiceDocument";

const TRANSACTION_LABELS: Record<string, string> = {
  publication: "Publication annuelle",
  boost_accueil: "Boost accueil",
  boost_region: "Boost région",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  // RLS ("Les proprios voient leurs propres factures" / "Les admins voient
  // toutes les factures") filtre déjà l'accès — un proprio qui demande la
  // facture d'un autre reçoit simplement 0 ligne, jamais besoin d'une
  // vérification applicative séparée.
  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "invoice_number, transaction_date, transaction_type, amount_before_tax, tps_amount, tvq_amount, total_amount, client:user_id(name, company_name), listing:listing_id(title)"
    )
    .eq("id", id)
    .single();

  if (!invoice) return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });

  const client = Array.isArray(invoice.client) ? invoice.client[0] : invoice.client;
  const listing = Array.isArray(invoice.listing) ? invoice.listing[0] : invoice.listing;

  const listingTitle = (listing as { title?: string } | null)?.title ?? "";
  const label = TRANSACTION_LABELS[invoice.transaction_type as string] ?? "Achat";

  const data: InvoiceData = {
    invoiceNumber: invoice.invoice_number as string,
    transactionDate: new Date(invoice.transaction_date as string).toLocaleDateString("fr-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    clientName: (client as { name?: string } | null)?.name ?? "",
    companyName: (client as { company_name?: string | null } | null)?.company_name ?? null,
    lineItems: [
      { description: listingTitle ? `${label} — ${listingTitle}` : label, amount: invoice.amount_before_tax as number },
    ],
    subtotal: invoice.amount_before_tax as number,
    tpsAmount: invoice.tps_amount as number,
    tvqAmount: invoice.tvq_amount as number,
    totalAmount: invoice.total_amount as number,
    logoSrc: path.resolve(process.cwd(), "public/logo-wordmark.png"),
  };

  const buffer = await renderToBuffer(InvoiceDocument({ data }));
  const download = request.nextUrl.searchParams.get("download") === "1";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="facture-${data.invoiceNumber}.pdf"`,
    },
  });
}
