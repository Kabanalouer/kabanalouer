"use client";

import { useState } from "react";

export default function ShareButton() {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (copied) return;
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Fallback for browsers that block clipboard without HTTPS or permission
      const input = document.createElement("input");
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleShare}
      aria-label="Copier le lien de la fiche"
      className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
    >
      {copied ? (
        <>
          <svg className="w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-primary font-medium">Lien copié !</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span>Partager</span>
        </>
      )}
    </button>
  );
}
