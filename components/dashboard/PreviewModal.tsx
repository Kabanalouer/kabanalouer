"use client";

import { useEffect, useState } from "react";

type ViewMode = "desktop" | "mobile";

interface Props {
  listingId: string;
  onClose: () => void;
}

export default function PreviewModal({ listingId, onClose }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col" role="dialog" aria-modal="true">
      {/* Header */}
      <div className="relative flex items-center justify-between px-4 h-14 bg-white border-b border-gray-200 shrink-0">
        {/* Left: close */}
        <button
          onClick={onClose}
          aria-label="Fermer l'aperçu"
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Center: toggle */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode("desktop")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === "desktop" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <DesktopIcon />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            onClick={() => setViewMode("mobile")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === "mobile" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <MobileIcon />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>

        {/* Right: spacer to balance the X */}
        <div className="w-9" />
      </div>

      {/* Content — dark background */}
      <div className="flex-1 overflow-hidden flex items-stretch" style={{ background: "#1a1a1a" }}>
        {viewMode === "desktop" ? (
          /* Desktop: white rounded card ~90% wide with visible dark margins */
          <div className="flex-1 flex items-stretch justify-center py-5 px-[5%]">
            <div className="flex-1 rounded-xl overflow-hidden shadow-2xl">
              <iframe
                key="desktop"
                src={`/chalets/${listingId}`}
                className="w-full h-full border-none block bg-white"
                title="Aperçu desktop"
              />
            </div>
          </div>
        ) : (
          /* Mobile: phone frame centered */
          <div className="flex-1 flex items-start justify-center overflow-y-auto py-8 px-4">
            <div
              className="flex-shrink-0 rounded-[44px] p-[10px] shadow-2xl"
              style={{ width: 414, background: "#2d2d2d" }}
            >
              {/* Notch */}
              <div className="flex justify-center items-center h-8 mb-1">
                <div className="w-24 h-5 rounded-full" style={{ background: "#1a1a1a" }} />
              </div>
              {/* Screen */}
              <div className="overflow-hidden rounded-[36px]" style={{ height: 780 }}>
                <iframe
                  key="mobile"
                  src={`/chalets/${listingId}`}
                  className="border-none block bg-white"
                  style={{ width: 390, height: 780 }}
                  title="Aperçu mobile"
                />
              </div>
              {/* Home bar */}
              <div className="flex justify-center items-center h-7 mt-1">
                <div className="w-28 h-1.5 rounded-full" style={{ background: "#444" }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DesktopIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function MobileIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}
