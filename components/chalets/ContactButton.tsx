"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import QuoteAuthModal from "@/components/chalets/QuoteAuthModal";

export default function ContactButton({
  listingId,
  hostId,
  hostName,
  listingTitle,
  currentUserId,
}: {
  listingId: string;
  hostId: string;
  hostName: string;
  listingTitle: string;
  currentUserId: string | null;
}) {
  const t = useTranslations("listing");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const router = useRouter();

  if (!currentUserId) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAuthModalOpen(true)}
          className="block w-full bg-primary text-white py-4 rounded-xl font-bold text-center hover:bg-primary-dark transition-colors"
        >
          {t("mobileContactCta")}
        </button>

        {authModalOpen && (
          <QuoteAuthModal
            onClose={() => setAuthModalOpen(false)}
            onAuthenticated={() => {
              setAuthModalOpen(false);
              router.refresh();
            }}
          />
        )}
      </>
    );
  }

  if (currentUserId === hostId) {
    return (
      <a
        href="/dashboard"
        className="block w-full bg-charcoal-100 text-charcoal-600 py-4 rounded-xl font-bold text-center hover:bg-charcoal-200 transition-colors text-sm"
      >
        {t("ownListingCta")}
      </a>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary-dark transition-colors"
      >
        {t("mobileContactCta")}
      </button>

      {open && (
        <ContactModal
          listingId={listingId}
          hostId={hostId}
          hostName={hostName}
          listingTitle={listingTitle}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ContactModal({
  listingId,
  hostId,
  hostName,
  listingTitle,
  onClose,
}: {
  listingId: string;
  hostId: string;
  hostName: string;
  listingTitle: string;
  onClose: () => void;
}) {
  const t = useTranslations("listing");
  const tc = useTranslations("common");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError("");

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, receiverId: hostId, content: message.trim() }),
    });

    if (!res.ok) {
      setError(t("sendError"));
      setSending(false);
      return;
    }

    setSent(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-bold text-charcoal-900 text-heading-3 mb-1">{t("messageSent")}</h3>
            <p className="text-charcoal-500 text-base mb-6">{t("messageSentHint", { name: hostName.split(" ")[0] })}</p>
            <div className="flex gap-3">
              <Link
                href={`/messages?listing=${listingId}&with=${hostId}`}
                className="flex-1 text-center border border-charcoal-100 text-charcoal-600 py-3 rounded-xl text-sm font-medium hover:bg-charcoal-50 transition-colors"
              >
                {t("viewConversation")}
              </Link>
              <button
                onClick={onClose}
                className="flex-1 bg-primary text-white py-3 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors"
              >
                {tc("close")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-heading-3 font-bold text-charcoal-900">{t("contactModalTitle", { name: hostName.split(" ")[0] })}</h3>
                <p className="text-sm text-charcoal-400 mt-0.5 line-clamp-1">{listingTitle}</p>
              </div>
              <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder={t("yourMessagePlaceholder")}
              className="w-full border border-charcoal-100 rounded-xl p-4 text-base resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent mb-4"
            />

            {error && <p className="text-sm text-error-500 mb-3">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 border border-charcoal-100 text-charcoal-600 py-3 rounded-xl text-sm font-medium hover:bg-charcoal-50 transition-colors"
              >
                {tc("cancel")}
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                className="flex-1 bg-primary text-white py-3 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {sending ? t("sending") : t("sendCta")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
