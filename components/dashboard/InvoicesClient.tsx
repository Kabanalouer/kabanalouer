"use client";

import { useTranslations, useLocale } from "next-intl";

export interface InvoiceRow {
  id: string;
  listingTitle: string;
  transactionType: string;
  transactionDate: string;
  totalAmount: number;
}

function EyeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5L16.5 12M12 16.5V3" />
    </svg>
  );
}

export default function InvoicesClient({ rows }: { rows: InvoiceRow[] }) {
  const t = useTranslations("myInvoices");
  const locale = useLocale();

  const typeLabel = (type: string) => {
    if (type === "boost_accueil") return t("typeBoostHome");
    if (type === "boost_region") return t("typeBoostRegion");
    return t("typePublication");
  };

  const formatCad = (amount: number) =>
    `${amount.toLocaleString(locale === "en" ? "en-CA" : "fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "en" ? "en-CA" : "fr-CA", { day: "numeric", month: "short", year: "numeric" });

  if (rows.length === 0) {
    return (
      <p className="text-sm text-charcoal-400 border border-dashed border-charcoal-200 rounded-xl px-4 py-8 text-center">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="border border-[#ebebeb] rounded-2xl overflow-x-auto bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#ebebeb] text-left text-[11px] font-semibold text-charcoal-400 uppercase tracking-wide">
            <th className="px-4 py-3">{t("columnListing")}</th>
            <th className="px-4 py-3">{t("columnType")}</th>
            <th className="px-4 py-3">{t("columnDate")}</th>
            <th className="px-4 py-3 text-right">{t("columnAmount")}</th>
            <th className="px-4 py-3 text-center">{t("columnView")}</th>
            <th className="px-4 py-3 text-center">{t("columnDownload")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-[#ebebeb] last:border-0">
              <td className="px-4 py-3 text-charcoal-800 font-medium">{r.listingTitle}</td>
              <td className="px-4 py-3 text-charcoal-600">{typeLabel(r.transactionType)}</td>
              <td className="px-4 py-3 text-charcoal-600">{formatDate(r.transactionDate)}</td>
              <td className="px-4 py-3 text-right font-semibold text-charcoal-800">{formatCad(r.totalAmount)}</td>
              <td className="px-4 py-3 text-center">
                <a
                  href={`/api/invoices/${r.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t("columnView")}
                  className="inline-flex text-charcoal-400 hover:text-primary transition-colors"
                >
                  <EyeIcon />
                </a>
              </td>
              <td className="px-4 py-3 text-center">
                <a
                  href={`/api/invoices/${r.id}/pdf?download=1`}
                  title={t("columnDownload")}
                  className="inline-flex text-charcoal-400 hover:text-primary transition-colors"
                >
                  <DownloadIcon />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
