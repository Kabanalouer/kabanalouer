"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { PhotoItem } from "@/lib/photo";

const MAX_PHOTOS = 80;
const MAX_DIM = 3840;
const MAX_SIZE_MB = 2;
export const MIN_PHOTOS = 5;

// ── Image compression ────────────────────────────────────────────────────────

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Fichier illisible.")); };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Conversion échouée."))),
      "image/webp",
      quality
    );
  });
}

async function compressToWebP(
  file: File
): Promise<{ blob: Blob; sizeMb: number } | { error: string }> {
  try {
    const img = await loadImage(file);
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    const longest = Math.max(w, h);
    if (longest > MAX_DIM) {
      const scale = MAX_DIM / longest;
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { error: "Canvas non disponible." };
    ctx.drawImage(img, 0, 0, w, h);
    for (const quality of [0.85, 0.75, 0.65, 0.5]) {
      const blob = await canvasToBlob(canvas, quality);
      const sizeMb = blob.size / 1024 / 1024;
      if (sizeMb <= MAX_SIZE_MB) return { blob, sizeMb };
    }
    return { error: "Impossible de compresser cette photo sous 2 Mo." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur de compression." };
  }
}

// ── Component ────────────────────────────────────────────────────────────────

interface ProcessingItem {
  id: string;
  filename: string;
  phase: "compressing" | "uploading" | "error";
  error?: string;
}

export default function PhotoUpload({
  photos,
  userId,
  listingId,
  onChange,
}: {
  photos: PhotoItem[];
  userId: string;
  listingId?: string;
  onChange: (photos: PhotoItem[]) => void;
}) {
  const [processing, setProcessing] = useState<ProcessingItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchState = useRef<{ idx: number; startX: number; startY: number; dragging: boolean } | null>(null);
  const photosRef = useRef(photos);
  useEffect(() => { photosRef.current = photos; }, [photos]);
  const supabase = createClient();

  const totalCount = photos.length + processing.length;
  const canUpload = totalCount < MAX_PHOTOS;

  // Passive-false touchmove for reorder drag
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (e: TouchEvent) => {
      if (!touchState.current?.dragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const item = el?.closest("[data-photo-idx]");
      if (item) {
        const i = parseInt(item.getAttribute("data-photo-idx") ?? "-1", 10);
        if (i >= 0 && i !== touchState.current.idx) setOverIdx(i);
      }
    };
    container.addEventListener("touchmove", handler, { passive: false });
    return () => container.removeEventListener("touchmove", handler);
  }, []);

  // ── Supabase save ──────────────────────────────────────────────────────────

  const savePhotos = (list?: PhotoItem[]) => {
    const toSave = list ?? photosRef.current;
    if (!listingId) return;
    setSaving(true);
    supabase
      .from("listings")
      .update({ photos: toSave })
      .eq("id", listingId)
      .eq("host_id", userId)
      .then(() => setSaving(false));
  };

  // ── Upload with compression ────────────────────────────────────────────────

  const uploadFiles = async (files: FileList) => {
    const imageFiles = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, MAX_PHOTOS - totalCount);
    if (!imageFiles.length) return;

    const slots: ProcessingItem[] = imageFiles.map((f, i) => ({
      id: `proc-${Date.now()}-${i}`,
      filename: f.name,
      phase: "compressing",
    }));
    setProcessing((prev) => [...prev, ...slots]);

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const slotId = slots[i].id;

      const compressed = await compressToWebP(file);
      if ("error" in compressed) {
        setProcessing((prev) =>
          prev.map((p) => (p.id === slotId ? { ...p, phase: "error", error: compressed.error } : p))
        );
        setTimeout(() => setProcessing((prev) => prev.filter((p) => p.id !== slotId)), 5000);
        continue;
      }

      setProcessing((prev) =>
        prev.map((p) => (p.id === slotId ? { ...p, phase: "uploading" } : p))
      );

      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
      const { data, error } = await supabase.storage
        .from("listing-photos")
        .upload(path, compressed.blob, { contentType: "image/webp", cacheControl: "3600", upsert: false });

      if (error) {
        setProcessing((prev) =>
          prev.map((p) => (p.id === slotId ? { ...p, phase: "error", error: "Erreur lors de l'upload." } : p))
        );
        setTimeout(() => setProcessing((prev) => prev.filter((p) => p.id !== slotId)), 5000);
        continue;
      }

      const { data: urlData } = supabase.storage.from("listing-photos").getPublicUrl(data.path);
      const newItem: PhotoItem = {
        url: urlData.publicUrl,
        caption: "",
        sizeMb: Math.round(compressed.sizeMb * 10) / 10,
      };

      setProcessing((prev) => prev.filter((p) => p.id !== slotId));
      onChange([...photosRef.current, newItem]);
    }
  };

  const removePhoto = async (url: string) => {
    const path = url.split("/listing-photos/")[1];
    if (path) await supabase.storage.from("listing-photos").remove([path]);
    onChange(photos.filter((p) => p.url !== url));
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) void uploadFiles(e.dataTransfer.files);
  };

  const updateCaption = (i: number, caption: string) => {
    const next = photos.map((p, j) => (j === i ? { ...p, caption } : p));
    onChange(next);
  };

  // ── Reorder ────────────────────────────────────────────────────────────────

  const applyReorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...photos];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
    savePhotos(next);
  };

  const onDragStart = (i: number) => setDragIdx(i);
  const onDragEnd = () => { setDragIdx(null); setOverIdx(null); };
  const onDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setOverIdx(i); };
  const onDrop = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx !== null) applyReorder(dragIdx, i);
    onDragEnd();
  };

  const onTouchStartDetect = (e: React.TouchEvent, i: number) => {
    const t = e.touches[0];
    touchState.current = { idx: i, startX: t.clientX, startY: t.clientY, dragging: false };
    const onMove = (ev: TouchEvent) => {
      if (!touchState.current) return;
      const dx = ev.touches[0].clientX - touchState.current.startX;
      const dy = ev.touches[0].clientY - touchState.current.startY;
      if (!touchState.current.dragging && Math.hypot(dx, dy) > 8) {
        touchState.current.dragging = true;
        setDragIdx(i);
      }
    };
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", () => window.removeEventListener("touchmove", onMove), { once: true });
  };

  const onTouchEnd = () => {
    if (touchState.current?.dragging && overIdx !== null) applyReorder(touchState.current.idx, overIdx);
    touchState.current = null;
    setDragIdx(null);
    setOverIdx(null);
  };

  // ── Photo tile (inline render, not a subcomponent to avoid remount) ─────────

  const renderPhotoTile = (item: PhotoItem, i: number, badge: string, aspectClass: string) => (
    <div
      key={item.url}
      data-photo-idx={i}
      draggable
      onDragStart={() => onDragStart(i)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, i)}
      onDrop={(e) => onDrop(e, i)}
      onTouchStart={(e) => onTouchStartDetect(e, i)}
      onTouchEnd={onTouchEnd}
      className={`relative ${aspectClass} group rounded-xl transition-all duration-150 cursor-grab active:cursor-grabbing overflow-hidden ${
        dragIdx === i
          ? "opacity-40 scale-95"
          : overIdx === i && dragIdx !== null
          ? "ring-2 ring-primary ring-offset-2 scale-[1.03]"
          : "hover:ring-1 hover:ring-charcoal-200"
      }`}
    >
      <Image
        src={item.url}
        alt={badge}
        fill
        className="object-cover pointer-events-none"
        sizes="(max-width: 640px) 90vw, 600px"
        draggable={false}
      />
      {/* Drag handle */}
      <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-md p-0.5 pointer-events-none">
        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-6 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
        </svg>
      </div>
      {/* Badge */}
      <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full pointer-events-none">
        {badge}
      </span>
      {/* Size */}
      {item.sizeMb !== undefined && (
        <span className="absolute bottom-1.5 right-1.5 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full pointer-events-none">
          {item.sizeMb.toFixed(1)} Mo
        </span>
      )}
      {/* Delete */}
      <button
        type="button"
        onClick={() => void removePhoto(item.url)}
        className="absolute top-1.5 right-1.5 bg-white rounded-full p-1 shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
        aria-label="Supprimer"
      >
        <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {/* Caption (cover only — shown below as overlay hint, full field in caption area) */}
    </div>
  );

  const renderEmptySlot = (label: string, slotKey: string) => (
    <button
      key={slotKey}
      type="button"
      onClick={() => canUpload && inputRef.current?.click()}
      className={`relative aspect-square rounded-xl border-2 border-dashed border-[#ebebeb] flex flex-col items-center justify-center gap-1.5 transition-colors ${
        canUpload
          ? "hover:border-primary hover:bg-primary-50 cursor-pointer"
          : "cursor-default opacity-40"
      }`}
    >
      <svg className="w-6 h-6 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      <span className="text-[11px] text-charcoal-400 font-medium">{label}</span>
    </button>
  );

  const renderProcessingSlot = (proc: ProcessingItem) => (
    <div
      key={proc.id}
      className={`relative aspect-square rounded-xl flex flex-col items-center justify-center gap-2 px-3 ${
        proc.phase === "error" ? "bg-red-50 border border-red-100" : "bg-charcoal-100"
      }`}
    >
      {proc.phase === "compressing" && (
        <>
          <svg className="w-7 h-7 text-charcoal-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-xs text-charcoal-400 text-center">Compression…</span>
        </>
      )}
      {proc.phase === "uploading" && (
        <>
          <svg className="w-7 h-7 text-primary animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <span className="text-xs text-primary text-center animate-pulse">Upload…</span>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20 rounded-b-xl overflow-hidden">
            <div className="h-full bg-primary rounded-full w-1/2 animate-[progressSlide_1.2s_ease-in-out_infinite]" />
          </div>
        </>
      )}
      {proc.phase === "error" && (
        <>
          <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span className="text-xs text-red-500 text-center leading-tight">{proc.error}</span>
        </>
      )}
    </div>
  );

  // ── Data slices ────────────────────────────────────────────────────────────

  const cover = photos[0] ?? null;
  const others = photos.slice(5);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && void uploadFiles(e.target.files)}
      />

      {/* Upload zone */}
      {canUpload ? (
        <div
          onDrop={handleFileDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-[#ebebeb] rounded-2xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary-50 transition-colors"
        >
          <div className="flex flex-col items-center gap-2">
            <svg className="w-8 h-8 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-charcoal-500">
              <span className="text-primary font-semibold">Cliquez pour uploader</span> ou glissez des photos ici
            </p>
            <p className="text-xs text-charcoal-400">JPG, PNG, WebP · Compressées automatiquement en WebP</p>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-[#ebebeb] rounded-2xl p-5 text-center bg-charcoal-50">
          <p className="text-sm font-semibold text-charcoal-500">Limite de {MAX_PHOTOS} photos atteinte</p>
          <p className="text-xs text-charcoal-400 mt-1">Supprimez des photos pour en ajouter de nouvelles.</p>
        </div>
      )}

      {saving && <span className="text-xs text-charcoal-400 animate-pulse">Sauvegarde…</span>}

      {/* ── Sections 1 & 2: Cover + thumbnails gallery ───────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-charcoal-700 mb-0.5">Photo de couverture et 4 miniatures</h3>
        <p className="text-xs text-charcoal-400 mb-3">Vos 5 premières photos s&apos;afficheront comme ceci sur votre annonce.</p>

        {/* Gallery layout — mirrors the public listing page */}
        <div className="flex gap-1.5 h-[340px]">
          {/* Cover — left ~60% */}
          <div className="flex-[3] min-w-0">
            {photos[0] ? (
              renderPhotoTile(photos[0], 0, "Couverture", "h-full")
            ) : (
              <button
                type="button"
                onClick={() => canUpload && inputRef.current?.click()}
                className={`h-full w-full rounded-xl border-2 border-dashed border-[#ebebeb] flex flex-col items-center justify-center gap-2 transition-colors ${canUpload ? "hover:border-primary hover:bg-primary-50 cursor-pointer" : "opacity-40 cursor-default"}`}
              >
                <svg className="w-8 h-8 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs text-charcoal-400 font-medium">Couverture</span>
              </button>
            )}
          </div>

          {/* Thumbnails — right ~40%, 2×2 grid */}
          <div className="flex-[2] min-w-0 grid grid-cols-2 grid-rows-2 gap-1.5">
            {[1, 2, 3, 4].map((photoIdx) => {
              const photo = photos[photoIdx];
              const label = `Miniature ${photoIdx}`;
              if (photo) return renderPhotoTile(photo, photoIdx, label, "h-full");
              return (
                <button
                  key={`empty-${photoIdx}`}
                  type="button"
                  onClick={() => canUpload && inputRef.current?.click()}
                  className={`h-full w-full rounded-xl border-2 border-dashed border-[#ebebeb] flex flex-col items-center justify-center gap-1 transition-colors ${canUpload ? "hover:border-primary hover:bg-primary-50 cursor-pointer" : "opacity-40 cursor-default"}`}
                >
                  <svg className="w-5 h-5 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-[10px] text-charcoal-400">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Captions for the 5 gallery photos */}
        {(photos[0] || photos.slice(1, 5).some(Boolean)) && (
          <div className="mt-2 space-y-1.5">
            {photos[0] && (
              <div>
                <input
                  type="text"
                  value={photos[0].caption}
                  maxLength={140}
                  placeholder="Légende de la couverture (optionnel)"
                  onMouseDown={(e) => e.stopPropagation()}
                  onChange={(e) => updateCaption(0, e.target.value)}
                  onBlur={() => savePhotos()}
                  className="w-full text-xs border border-[#ebebeb] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-charcoal-300 transition"
                />
              </div>
            )}
            {photos.slice(1, 5).length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((photoIdx) => {
                  const photo = photos[photoIdx];
                  if (!photo) return <div key={photoIdx} />;
                  return (
                    <input
                      key={photoIdx}
                      type="text"
                      value={photo.caption}
                      maxLength={140}
                      placeholder={`Légende miniature ${photoIdx}`}
                      onMouseDown={(e) => e.stopPropagation()}
                      onChange={(e) => updateCaption(photoIdx, e.target.value)}
                      onBlur={() => savePhotos()}
                      className="w-full text-xs border border-[#ebebeb] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-charcoal-300 transition"
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Processing slots */}
      {processing.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {processing.map(renderProcessingSlot)}
        </div>
      )}

      {/* ── Section 3: Other photos ───────────────────────────────────────── */}
      {others.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-charcoal-700 mb-0.5">Autres photos</h3>
          <p className="text-xs text-charcoal-400 mb-2">Le reste de vos photos s&apos;afficheront dans le carrousel, lorsque le voyageur cliquera sur &laquo;&nbsp;Voir toutes les photos&nbsp;&raquo;.</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {others.map((item, j) => {
              const i = j + 5;
              return renderPhotoTile(item, i, `Photo ${i + 1}`, "aspect-square");
            })}
          </div>
          {/* Captions for other photos */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-1.5">
            {others.map((item, j) => {
              const i = j + 5;
              return (
                <div key={item.url}>
                  <input
                    type="text"
                    value={item.caption}
                    maxLength={140}
                    placeholder="Légende"
                    onMouseDown={(e) => e.stopPropagation()}
                    onChange={(e) => updateCaption(i, e.target.value)}
                    onBlur={() => savePhotos()}
                    className="w-full text-xs border border-[#ebebeb] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-charcoal-300 transition"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="space-y-1 text-xs text-charcoal-400">
        <p className={photos.length >= MIN_PHOTOS ? "text-green-600" : "text-amber-600"}>
          {totalCount}/{MAX_PHOTOS} photos
        </p>
        <p>Minimum de photos : {MIN_PHOTOS}</p>
        <p>Maximum de photos : {MAX_PHOTOS}</p>
        <p>Astuce : Glissez et déposez vos photos pour réorganiser l&apos;ordre d&apos;affichage.</p>
      </div>
    </div>
  );
}
