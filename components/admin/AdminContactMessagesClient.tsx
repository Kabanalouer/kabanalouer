"use client";

import { useState, useMemo, useCallback } from "react";

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type FilterKey = "all" | "unread" | "read";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function preview(text: string, max = 60) {
  const single = text.replace(/\s+/g, " ").trim();
  return single.length > max ? single.slice(0, max) + "…" : single;
}

const FILTER_LABELS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "unread", label: "Non lus" },
  { key: "read", label: "Lus" },
];

export default function AdminContactMessagesClient({
  initialMessages,
}: {
  initialMessages: ContactMessage[];
}) {
  const [messages, setMessages] = useState<ContactMessage[]>(initialMessages);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [modalMsg, setModalMsg] = useState<ContactMessage | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return messages.filter((m) => {
      if (filter === "unread" && m.isRead) return false;
      if (filter === "read" && !m.isRead) return false;
      if (
        q &&
        !m.name.toLowerCase().includes(q) &&
        !m.email.toLowerCase().includes(q) &&
        !m.subject.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [messages, filter, search]);

  const unreadCount = messages.filter((m) => !m.isRead).length;

  const patchRead = useCallback(async (id: string, isRead: boolean) => {
    setMarkingId(id);
    try {
      await fetch("/api/admin/contact-messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isRead }),
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isRead } : m))
      );
    } finally {
      setMarkingId(null);
    }
  }, []);

  async function openModal(msg: ContactMessage) {
    setModalMsg(msg);
    if (!msg.isRead) {
      await patchRead(msg.id, true);
      setModalMsg((prev) => (prev?.id === msg.id ? { ...prev, isRead: true } : prev));
    }
  }

  function closeModal() {
    setModalMsg(null);
  }

  return (
    <div>
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 max-w-xs mb-8">
        <div className="bg-white rounded-xl border border-[#ebebeb] px-5 py-4">
          <p className="text-xs text-charcoal-400 mb-1">Total reçus</p>
          <p className="text-2xl font-bold text-charcoal-800">{messages.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#ebebeb] px-5 py-4">
          <p className="text-xs text-charcoal-400 mb-1">Non lus</p>
          <p className="text-2xl font-bold text-[#f04e45]">{unreadCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`text-sm px-4 py-1.5 rounded-full font-medium border transition-colors ${
                filter === key
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-charcoal-600 border-[#ebebeb] hover:border-charcoal-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            placeholder="Nom, email ou sujet…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm pl-9 pr-4 py-1.5 rounded-full border border-[#ebebeb] bg-white text-charcoal-700 placeholder-charcoal-300 hover:border-charcoal-300 focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <span className="ml-auto text-xs text-charcoal-400">
          {filtered.length} message{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="border-b border-[#ebebeb]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide">
                  Expéditeur
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide">
                  Sujet
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide hidden md:table-cell">
                  Aperçu
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide whitespace-nowrap">
                  Reçu le
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide">
                  Statut
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr
                  key={m.id}
                  className={`border-b border-[#ebebeb] last:border-0 transition-colors cursor-pointer ${
                    !m.isRead ? "bg-[#fff8f8] hover:bg-[#fff3f3]" : "hover:bg-charcoal-50"
                  }`}
                  onClick={() => openModal(m)}
                >
                  {/* Expéditeur */}
                  <td className="px-4 py-3">
                    <p className={`font-medium truncate max-w-[150px] ${!m.isRead ? "text-charcoal-800" : "text-charcoal-600"}`}>
                      {m.name || "—"}
                    </p>
                    <p className="text-xs text-charcoal-400 truncate max-w-[150px]">{m.email}</p>
                  </td>

                  {/* Sujet */}
                  <td className="px-4 py-3">
                    <p className={`truncate max-w-[180px] ${!m.isRead ? "font-semibold text-charcoal-800" : "text-charcoal-600"}`}>
                      {m.subject}
                    </p>
                  </td>

                  {/* Aperçu */}
                  <td className="px-4 py-3 text-charcoal-400 hidden md:table-cell">
                    <p className="truncate max-w-[200px]">{preview(m.message)}</p>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-charcoal-400 whitespace-nowrap text-xs">
                    {fmtDateShort(m.createdAt)}
                  </td>

                  {/* Statut */}
                  <td className="px-4 py-3">
                    {m.isRead ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-charcoal-100 text-charcoal-500">
                        Lu
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-[#f04e45]">
                        Non lu
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openModal(m)}
                      className="text-xs text-primary font-semibold hover:text-primary/80 transition-colors"
                    >
                      Voir
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-charcoal-400">
                    Aucun message ne correspond aux filtres sélectionnés.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalMsg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-5 gap-4">
              <div className="min-w-0">
                <h2 className="font-bold text-charcoal-800 text-base leading-snug">
                  {modalMsg.subject}
                </h2>
                <p className="text-xs text-charcoal-400 mt-0.5">{fmtDate(modalMsg.createdAt)}</p>
              </div>
              <button
                onClick={closeModal}
                className="shrink-0 text-charcoal-300 hover:text-charcoal-600 transition-colors mt-0.5"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Expéditeur */}
            <div className="bg-charcoal-50 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#f5f6ec] text-primary flex items-center justify-center text-xs font-bold uppercase shrink-0">
                {(modalMsg.name[0] ?? "?").toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-charcoal-800 text-sm">{modalMsg.name}</p>
                <p className="text-xs text-charcoal-400 truncate">{modalMsg.email}</p>
              </div>
            </div>

            {/* Message */}
            <div className="text-sm text-charcoal-700 leading-relaxed whitespace-pre-wrap mb-6 border-l-2 border-[#ebebeb] pl-4">
              {modalMsg.message}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={`mailto:${modalMsg.email}?subject=${encodeURIComponent("Re: " + modalMsg.subject)}`}
                className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                Répondre par email
              </a>
              {modalMsg.isRead && (
                <button
                  onClick={async () => {
                    await patchRead(modalMsg.id, false);
                    setModalMsg((prev) => (prev ? { ...prev, isRead: false } : null));
                  }}
                  disabled={markingId === modalMsg.id}
                  className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-[#ebebeb] text-charcoal-600 hover:bg-charcoal-50 disabled:opacity-50 transition-colors"
                >
                  {markingId === modalMsg.id ? "En cours…" : "Marquer comme non lu"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
