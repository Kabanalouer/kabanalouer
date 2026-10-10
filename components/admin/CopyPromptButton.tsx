"use client";

import { useState } from "react";

export default function CopyPromptButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // presse-papiers indisponible : le texte reste sélectionnable
        }
      }}
      className="shrink-0 rounded-full border border-primary/40 bg-white px-4 py-1.5 text-sm font-medium text-primary hover:bg-[#f5f6ec] transition-colors"
    >
      {copied ? "Copié ✓" : "Copier"}
    </button>
  );
}
