import type { SupabaseClient } from "@supabase/supabase-js";

export type InvoiceTransactionType = "publication" | "boost_accueil" | "boost_region";

export interface CreateInvoiceParams {
  userId: string;
  listingId: string | null;
  transactionType: InvoiceTransactionType;
  amountBeforeTaxCents: number;
  // Montant total réellement chargé par Stripe (taxes incluses), en cents —
  // sert de référence exacte pour que total_amount corresponde toujours au
  // vrai montant facturé, peu importe la ventilation TPS/TVQ (voir plus bas).
  totalChargedCents: number;
  stripePaymentId?: string | null;
}

export interface CreatedInvoice {
  id: string;
  invoiceNumber: string;
}

// Répartit le montant réellement chargé par Stripe en TPS (5 %) + TVQ
// (9,975 %) sans jamais dévier du total réel : la TPS est calculée
// directement, la TVQ absorbe l'écart résiduel (total réel − sous-total −
// TPS). Pour un client au Québec (l'immense majorité), ça correspond
// exactement aux vrais taux ; dans tous les cas, sous-total + TPS + TVQ =
// total Stripe au cent près, garanti par construction — jamais une
// incohérence entre la facture et le vrai montant chargé.
function splitTax(amountBeforeTaxCents: number, totalChargedCents: number) {
  const tpsCents = Math.round(amountBeforeTaxCents * 0.05);
  const tvqCents = totalChargedCents - amountBeforeTaxCents - tpsCents;
  return { tpsCents, tvqCents };
}

// Crée une facture pour une transaction réellement payée. Générique et
// réutilisable pour publication ET boost (accueil/région) — appelée
// uniquement depuis le webhook Stripe (checkout.session.completed), jamais
// pour is_free_launch=true ni un montant à 0 $ (le rôle de l'appelant est de
// ne jamais invoquer cette fonction dans ces cas, voir le webhook).
export async function createInvoice(
  admin: SupabaseClient,
  params: CreateInvoiceParams
): Promise<CreatedInvoice | null> {
  if (params.amountBeforeTaxCents <= 0) return null;

  const year = new Date().getFullYear();
  const { data: sequenceNumber, error: rpcError } = await admin.rpc(
    "get_next_invoice_number",
    { p_year: year }
  );
  if (rpcError || sequenceNumber == null) {
    console.error("createInvoice: échec get_next_invoice_number", rpcError);
    return null;
  }

  const invoiceNumber = `${year}-${String(sequenceNumber).padStart(5, "0")}`;
  const { tpsCents, tvqCents } = splitTax(params.amountBeforeTaxCents, params.totalChargedCents);

  const { data, error } = await admin
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      year,
      sequence_number: sequenceNumber,
      user_id: params.userId,
      listing_id: params.listingId,
      transaction_type: params.transactionType,
      amount_before_tax: params.amountBeforeTaxCents / 100,
      tps_amount: tpsCents / 100,
      tvq_amount: tvqCents / 100,
      total_amount: params.totalChargedCents / 100,
      stripe_payment_id: params.stripePaymentId ?? null,
    })
    .select("id, invoice_number")
    .single();

  if (error) {
    console.error("createInvoice: échec insert invoices", error);
    return null;
  }

  return { id: data.id as string, invoiceNumber: data.invoice_number as string };
}
