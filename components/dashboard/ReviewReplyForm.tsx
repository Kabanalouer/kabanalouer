"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface Props {
  reviewId: string;
  existingReply: string | null;
  allowEdit?: boolean;
}

export default function ReviewReplyForm({ reviewId, existingReply, allowEdit = true }: Props) {
  const router = useRouter();
  const t = useTranslations("reviews");
  const [reply, setReply] = useState(existingReply ?? "");
  const [open, setOpen] = useState(!existingReply);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/reviews/${reviewId}/reply`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: reply.trim() }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t("errorSaving"));
      setSaving(false);
      return;
    }
    setSaving(false);
    setOpen(false);
    router.refresh();
  };

  if (!open && existingReply) {
    return (
      <div className="mt-3 pl-4 border-l-2 border-[#ebebeb]">
        <p className="text-xs font-semibold text-charcoal-600 mb-1">{t("replyLabel")}</p>
        <p className="text-sm text-charcoal-500 leading-relaxed">{existingReply}</p>
        {allowEdit && (
          <button
            onClick={() => setOpen(true)}
            className="mt-2 text-xs text-primary hover:underline"
          >
            {t("replyEdit")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={3}
        placeholder={t("replyPlaceholder")}
        className="w-full border border-[#ebebeb] rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={handleSave}
          disabled={saving || !reply.trim()}
          className="bg-primary text-white px-4 py-2 rounded-full text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? t("replySaving") : t("replySave")}
        </button>
        {allowEdit && existingReply && (
          <button onClick={() => { setOpen(false); setReply(existingReply); }} className="text-xs text-charcoal-400 hover:text-charcoal-600">
            {t("replyCancel")}
          </button>
        )}
      </div>
    </div>
  );
}
