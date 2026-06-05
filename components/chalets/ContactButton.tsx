"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!currentUserId) {
    return (
      <a
        href={`/login?next=/chalets/${listingId}`}
        className="block w-full bg-primary text-white py-4 rounded-xl font-bold text-center hover:bg-primary-dark transition-colors"
      >
        Contacter le propriétaire
      </a>
    );
  }

  if (currentUserId === hostId) {
    return (
      <a
        href="/dashboard"
        className="block w-full bg-gray-100 text-gray-600 py-4 rounded-xl font-bold text-center hover:bg-gray-200 transition-colors text-sm"
      >
        C&apos;est votre chalet → Tableau de bord
      </a>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary-dark transition-colors"
      >
        Contacter le propriétaire
      </button>

      {open && (
        <ContactModal
          listingId={listingId}
          hostId={hostId}
          hostName={hostName}
          listingTitle={listingTitle}
          senderId={currentUserId}
          onClose={() => setOpen(false)}
          onSent={() => router.push(`/messages?listing=${listingId}&with=${hostId}`)}
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
  senderId,
  onClose,
  onSent,
}: {
  listingId: string;
  hostId: string;
  hostName: string;
  listingTitle: string;
  senderId: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError("");

    const { data: profile } = await supabase
      .from("users")
      .select("preferred_language")
      .eq("id", senderId)
      .single();

    const { error } = await supabase.from("messages").insert({
      listing_id: listingId,
      sender_id: senderId,
      receiver_id: hostId,
      content: message.trim(),
      language: profile?.preferred_language || "fr",
    });

    if (error) {
      setError("Erreur lors de l'envoi. Réessayez.");
      setSending(false);
      return;
    }

    setSent(true);
    setTimeout(onSent, 1500);
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
            <h3 className="font-bold text-gray-900 text-lg mb-1">Message envoyé !</h3>
            <p className="text-gray-500 text-sm">Redirection vers votre messagerie…</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-gray-900">Contacter {hostName.split(" ")[0]}</h3>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{listingTitle}</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Votre message"
              className="w-full border border-gray-200 rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent mb-4"
            />

            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                className="flex-1 bg-primary text-white py-3 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {sending ? "Envoi…" : "Envoyer →"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
