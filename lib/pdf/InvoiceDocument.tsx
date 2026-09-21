import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

// Police : Helvetica (police coeur PDF, toujours disponible sans dépendance
// réseau) plutôt que Plus Jakarta Sans — enregistrer une police web exige une
// URL Google Fonts figée dans le code, un point de défaillance externe fragile
// pour un document légal généré à la demande. Rendu très proche visuellement.
const OLIVE = "#636e40";
const CHARCOAL_800 = "#262626";
const CHARCOAL_400 = "#9a9a9a";
const BORDER = "#ebebeb";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: CHARCOAL_800,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  logo: { width: 40, height: 40 },
  wordmark: { fontSize: 16, fontFamily: "Helvetica-Bold", color: OLIVE, marginTop: 8 },
  invoiceTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", color: CHARCOAL_800, textAlign: "right" },
  invoiceMeta: { fontSize: 9, color: CHARCOAL_400, textAlign: "right", marginTop: 4 },
  partiesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  partyBlock: { width: "45%" },
  partyLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: OLIVE,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  partyLine: { fontSize: 10, marginBottom: 2 },
  table: { marginBottom: 4 },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: OLIVE,
    paddingBottom: 6,
    marginBottom: 6,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: OLIVE,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingVertical: 7,
  },
  descCol: { width: "75%" },
  amountCol: { width: "25%", textAlign: "right" },
  totalsBlock: { marginTop: 16, marginLeft: "55%" },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalsLabel: { fontSize: 10, color: CHARCOAL_800 },
  totalsSub: { fontSize: 8, color: CHARCOAL_400 },
  totalsValue: { fontSize: 10, color: CHARCOAL_800, textAlign: "right" },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1.5,
    borderTopColor: OLIVE,
  },
  grandTotalLabel: { fontSize: 12, fontFamily: "Helvetica-Bold", color: OLIVE },
  grandTotalValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: OLIVE, textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 48,
    right: 48,
    fontSize: 8,
    color: CHARCOAL_400,
    textAlign: "center",
  },
});

export interface InvoiceLineItem {
  description: string;
  amount: number; // avant taxes, en dollars
}

export interface InvoiceData {
  invoiceNumber: string;
  transactionDate: string; // déjà formatée (ex. "15 janvier 2027")
  clientName: string;
  companyName?: string | null;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tpsAmount: number;
  tvqAmount: number;
  totalAmount: number;
  logoSrc?: string; // chemin absolu local (fs) ou URL — voir generateInvoicePdf()
}

function formatCad(amount: number): string {
  return `${amount.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
}

export default function InvoiceDocument({ data }: { data: InvoiceData }) {
  return (
    <Document title={`Facture ${data.invoiceNumber}`}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {data.logoSrc && <Image src={data.logoSrc} style={styles.logo} />}
            <Text style={styles.wordmark}>Kabanalouer</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>Facture</Text>
            <Text style={styles.invoiceMeta}>N° {data.invoiceNumber}</Text>
            <Text style={styles.invoiceMeta}>{data.transactionDate}</Text>
          </View>
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.partyBlock}>
            <Text style={styles.partyLabel}>Émise par</Text>
            <Text style={styles.partyLine}>Kabanalouer</Text>
            <Text style={styles.partyLine}>15, rue de la Rigole</Text>
            <Text style={styles.partyLine}>Bromont, QC J2L 1T2</Text>
          </View>
          <View style={styles.partyBlock}>
            <Text style={styles.partyLabel}>Facturée à</Text>
            <Text style={styles.partyLine}>{data.clientName}</Text>
            {data.companyName && <Text style={styles.partyLine}>{data.companyName}</Text>}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.descCol]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.amountCol]}>Montant</Text>
          </View>
          {data.lineItems.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.descCol}>{item.description}</Text>
              <Text style={styles.amountCol}>{formatCad(item.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Sous-total</Text>
            <Text style={styles.totalsValue}>{formatCad(data.subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <View>
              <Text style={styles.totalsLabel}>TPS (5 %)</Text>
              <Text style={styles.totalsSub}>N° 721912681 RT0001</Text>
            </View>
            <Text style={styles.totalsValue}>{formatCad(data.tpsAmount)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <View>
              <Text style={styles.totalsLabel}>TVQ (9,975 %)</Text>
              <Text style={styles.totalsSub}>N° 1038146251 TQ0001</Text>
            </View>
            <Text style={styles.totalsValue}>{formatCad(data.tvqAmount)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCad(data.totalAmount)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>Kabanalouer — kabanalouer.ca</Text>
      </Page>
    </Document>
  );
}
