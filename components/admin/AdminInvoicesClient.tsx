"use client";

import { useState } from "react";
import Link from "next/link";

export interface AdminInvoiceRow {
  id: string;
  invoiceNumber: string;
  year: number;
  firstName: string;
  lastName: string;
  email: string;
  listingTitle: string;
  listingId: string | null;
  transactionDate: string;
  amountBeforeTax: number;
  totalAmount: number;
}

function formatCad(amount: number): string {
  return `${amount.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" });
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

export default function AdminInvoicesClient({
  rows,
  years,
}: {
  rows: AdminInvoiceRow[];
  years: number[];
}) {
  const [activeYear, setActiveYear] = useState(years[0]);
  const filtered = rows.filter((r) => r.year === activeYear);

  const totalBeforeTax = filtered.reduce((sum, r) => sum + r.amountBeforeTax, 0);
  const totalWithTax = filtered.reduce((sum, r) => sum + r.totalAmount, 0);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => setActiveYear(y)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              activeYear === y
                ? "bg-primary text-white"
                : "border border-[#ebebeb] text-charcoal-600 hover:border-charcoal-300"
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      <div className="border border-[#ebebeb] rounded-2xl overflow-x-auto bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#ebebeb] text-left text-[11px] font-semibold text-charcoal-400 uppercase tracking-wide">
              <th className="px-4 py-3">Prénom</th>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Chalet</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Avant taxes</th>
              <th className="px-4 py-3 text-right">Avec taxes</th>
              <th className="px-4 py-3">N° facture</th>
              <th className="px-4 py-3 text-center">Voir</th>
              <th className="px-4 py-3 text-center">Télécharger</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-charcoal-400">
                  Aucune facture pour {activeYear}.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b border-[#ebebeb] last:border-0">
                  <td className="px-4 py-3 text-charcoal-800">{r.firstName}</td>
                  <td className="px-4 py-3 text-charcoal-800">{r.lastName}</td>
                  <td className="px-4 py-3 text-charcoal-500">{r.email}</td>
                  <td className="px-4 py-3">
                    {r.listingId ? (
                      <Link href={`/chalets/${r.listingId}`} target="_blank" className="text-primary hover:underline">
                        {r.listingTitle}
                      </Link>
                    ) : (
                      r.listingTitle
                    )}
                  </td>
                  <td className="px-4 py-3 text-charcoal-600">{formatDate(r.transactionDate)}</td>
                  <td className="px-4 py-3 text-right text-charcoal-800">{formatCad(r.amountBeforeTax)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-charcoal-800">{formatCad(r.totalAmount)}</td>
                  <td className="px-4 py-3 text-charcoal-600">{r.invoiceNumber}</td>
                  <td className="px-4 py-3 text-center">
                    <a
                      href={`/api/invoices/${r.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Visualiser la facture"
                      className="inline-flex text-charcoal-400 hover:text-primary transition-colors"
                    >
                      <EyeIcon />
                    </a>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <a
                      href={`/api/invoices/${r.id}/pdf?download=1`}
                      title="Télécharger la facture"
                      className="inline-flex text-charcoal-400 hover:text-primary transition-colors"
                    >
                      <DownloadIcon />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-charcoal-800">
                <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-charcoal-800">Total {activeYear}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-charcoal-800">{formatCad(totalBeforeTax)}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-charcoal-800">{formatCad(totalWithTax)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
