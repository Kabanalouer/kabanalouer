"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

// Bandeau affiché juste après un import Airbnb (?imported=1 ou =duplicate).
// Le X le ferme et retire le paramètre de l'URL : il ne revient pas au rechargement.
export default function ImportedListingBanner({
  title,
  body,
  closeLabel,
}: {
  title: string;
  body: string;
  closeLabel: string;
}) {
  const [visible, setVisible] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  if (!visible) return null;

  return (
    <div role="status" className="mb-6 rounded-2xl border border-primary-100 bg-primary-50 pl-5 pr-2 py-4 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-charcoal-800">{title}</p>
        <p className="mt-1 text-sm text-charcoal-600">{body}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          router.replace(pathname, { scroll: false });
        }}
        aria-label={closeLabel}
        className="-mt-2 w-11 h-11 shrink-0 flex items-center justify-center rounded-full text-charcoal-500 hover:bg-primary-100 hover:text-charcoal-800 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
