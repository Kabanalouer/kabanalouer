"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function PhotoUpload({
  photos,
  userId,
  listingId,
  onChange,
}: {
  photos: string[];
  userId: string;
  listingId?: string;
  onChange: (photos: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const touchState = useRef<{ idx: number; startX: number; startY: number; dragging: boolean } | null>(null);
  const supabase = createClient();

  // Attach passive:false touch listener so we can preventDefault during drag
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const onTouchMove = (e: TouchEvent) => {
      if (!touchState.current?.dragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const itemEl = el?.closest("[data-photo-idx]");
      if (itemEl) {
        const i = parseInt(itemEl.getAttribute("data-photo-idx") ?? "-1", 10);
        if (i >= 0 && i !== touchState.current.idx) setOverIdx(i);
      }
    };
    grid.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => grid.removeEventListener("touchmove", onTouchMove);
  }, []);

  // ── Upload ──────────────────────────────────────────────────────────────────

  const uploadFiles = async (files: FileList) => {
    setUploading(true);
    setError("");
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 5 * 1024 * 1024) { setError(`"${file.name}" dépasse 5 Mo.`); continue; }
      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error: uploadError } = await supabase.storage
        .from("listing-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) { setError("Erreur lors de l'upload. Vérifiez le bucket Supabase Storage."); continue; }
      const { data: urlData } = supabase.storage.from("listing-photos").getPublicUrl(data.path);
      newUrls.push(urlData.publicUrl);
    }

    onChange([...photos, ...newUrls]);
    setUploading(false);
  };

  const removePhoto = async (url: string) => {
    const path = url.split("/listing-photos/")[1];
    if (path) await supabase.storage.from("listing-photos").remove([path]);
    onChange(photos.filter((p) => p !== url));
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) void uploadFiles(e.dataTransfer.files);
  };

  // ── Reorder + auto-save ─────────────────────────────────────────────────────

  const applyReorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...photos];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
    if (!listingId) return;
    setSaving(true);
    supabase
      .from("listings")
      .update({ photos: next })
      .eq("id", listingId)
      .eq("host_id", userId)
      .then(() => setSaving(false));
  };

  // Desktop drag
  const onDragStart = (i: number) => setDragIdx(i);
  const onDragEnd = () => { setDragIdx(null); setOverIdx(null); };
  const onDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setOverIdx(i); };
  const onDrop = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx !== null) applyReorder(dragIdx, i);
    onDragEnd();
  };

  // Mobile touch
  const onTouchStart = (e: React.TouchEvent, i: number) => {
    const t = e.touches[0];
    touchState.current = { idx: i, startX: t.clientX, startY: t.clientY, dragging: false };
  };

  const onTouchStartDetect = (e: React.TouchEvent, i: number) => {
    onTouchStart(e, i);
    // Start drag immediately on touch (visual feedback)
    const onMove = (ev: TouchEvent) => {
      if (!touchState.current) return;
      const dx = ev.touches[0].clientX - touchState.current.startX;
      const dy = ev.touches[0].clientY - touchState.current.startY;
      if (!touchState.current.dragging && Math.hypot(dx, dy) > 8) {
        touchState.current.dragging = true;
        setDragIdx(i);
      }
    };
    window.addEventListener("touchmove", onMove, { once: false, passive: true });
    window.addEventListener("touchend", () => window.removeEventListener("touchmove", onMove), { once: true });
  };

  const onTouchEnd = () => {
    if (touchState.current?.dragging && overIdx !== null) {
      applyReorder(touchState.current.idx, overIdx);
    }
    touchState.current = null;
    setDragIdx(null);
    setOverIdx(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Drop zone (file upload) */}
      <div
        onDrop={handleFileDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary-50 transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && void uploadFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Upload en cours…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500">
              <span className="text-primary font-semibold">Cliquez pour uploader</span> ou glissez des photos ici
            </p>
            <p className="text-xs text-gray-400">JPG, PNG, WebP · Max 5 Mo par photo</p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">{error}</p>}

      {/* Photo grid — draggable */}
      {photos.length > 0 && (
        <div ref={gridRef} className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {photos.map((url, i) => (
            <div
              key={url}
              data-photo-idx={i}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragEnd={onDragEnd}
              onDragOver={(e) => onDragOver(e, i)}
              onDrop={(e) => onDrop(e, i)}
              onTouchStart={(e) => onTouchStartDetect(e, i)}
              onTouchEnd={onTouchEnd}
              className={`relative aspect-square group rounded-xl transition-all duration-150 cursor-grab active:cursor-grabbing ${
                dragIdx === i
                  ? "opacity-40 scale-95 shadow-2xl z-10"
                  : overIdx === i && dragIdx !== null
                  ? "ring-2 ring-primary ring-offset-2 scale-[1.03]"
                  : "hover:ring-1 hover:ring-gray-300"
              }`}
            >
              <Image
                src={url}
                alt={`Photo ${i + 1}`}
                fill
                className="object-cover rounded-xl pointer-events-none"
                sizes="150px"
                draggable={false}
              />
              {/* Drag handle icon */}
              <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-md p-0.5 pointer-events-none">
                <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-6 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                </svg>
              </div>
              {i === 0 && (
                <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full pointer-events-none">
                  Principale
                </span>
              )}
              <button
                type="button"
                onClick={() => void removePhoto(url)}
                className="absolute top-1.5 right-1.5 bg-white rounded-full p-1 shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                aria-label="Supprimer"
              >
                <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {photos.length}/15 photos · La première photo sera la photo principale
        </p>
        {saving && <span className="text-xs text-gray-400 animate-pulse">Sauvegarde…</span>}
      </div>
    </div>
  );
}
