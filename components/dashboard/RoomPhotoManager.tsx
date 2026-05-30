"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_PHOTOS = 5;

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

async function compressToWebP(file: File): Promise<{ blob: Blob } | { error: string }> {
  try {
    const img = await loadImage(file);
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    const longest = Math.max(w, h);
    if (longest > 2400) {
      const scale = 2400 / longest;
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
      if (blob.size / 1024 / 1024 <= 8) return { blob };
    }
    return { error: "Impossible de compresser cette photo." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur de compression." };
  }
}

export default function RoomPhotoManager({
  photos,
  userId,
  onChange,
}: {
  photos: string[];
  userId: string;
  onChange: (photos: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const canUpload = photos.length < MAX_PHOTOS;

  const uploadFiles = async (files: FileList | File[]) => {
    setUploading(true);
    setError("");
    const newUrls: string[] = [];
    const remaining = MAX_PHOTOS - photos.length;

    for (const file of Array.from(files).slice(0, remaining)) {
      if (!file.type.startsWith("image/")) continue;
      const compressed = await compressToWebP(file);
      if ("error" in compressed) { setError(compressed.error); continue; }
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
      const { data, error: uploadError } = await supabase.storage
        .from("listing-photos")
        .upload(path, compressed.blob, { cacheControl: "3600", upsert: false, contentType: "image/webp" });
      if (uploadError) { setError("Erreur lors de l'upload."); continue; }
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

  // Photo grid drag-to-reorder
  const handleGridDragStart = (i: number) => setDragIdx(i);
  const handleGridDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (overIdx !== i) setOverIdx(i);
  };
  const handleGridDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== targetIdx) {
      const reordered = [...photos];
      const [moved] = reordered.splice(dragIdx, 1);
      reordered.splice(targetIdx, 0, moved);
      onChange(reordered);
    }
    setDragIdx(null);
    setOverIdx(null);
  };
  const handleGridDragEnd = () => { setDragIdx(null); setOverIdx(null); };

  // Drop zone (file drop from OS)
  const handleZoneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) setIsDragOver(true);
  };
  const handleZoneDragLeave = () => setIsDragOver(false);
  const handleZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) void uploadFiles(e.dataTransfer.files);
  };

  return (
    <div>
      {/* Photo thumbnails grid */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {photos.map((url, i) => (
            <div
              key={url}
              draggable
              onDragStart={() => handleGridDragStart(i)}
              onDragOver={(e) => handleGridDragOver(e, i)}
              onDrop={(e) => handleGridDrop(e, i)}
              onDragEnd={handleGridDragEnd}
              className={[
                "relative w-20 h-20 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing shrink-0 group border border-[#ebebeb] transition-all duration-150",
                dragIdx === i ? "opacity-40 shadow-lg scale-95" : "",
                overIdx === i && dragIdx !== i ? "ring-2 ring-primary ring-offset-1" : "",
              ].join(" ")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); void removePhoto(url); }}
                className="absolute top-1 right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                aria-label="Supprimer cette photo"
              >
                <svg className="w-2.5 h-2.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {canUpload && (
        <div
          onDragOver={handleZoneDragOver}
          onDragLeave={handleZoneDragLeave}
          onDrop={handleZoneDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={[
            "rounded-xl border-2 border-dashed px-4 py-6 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors select-none",
            isDragOver
              ? "border-[#636e40] bg-[#f5f6ec]"
              : "border-[#ebebeb] bg-charcoal-50 hover:border-[#636e40] hover:bg-[#f5f6ec]",
          ].join(" ")}
        >
          {uploading ? (
            <>
              <svg className="w-5 h-5 text-[#636e40] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-xs text-charcoal-500">Upload en cours…</p>
            </>
          ) : (
            <>
              <svg className="w-6 h-6 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
              <p className="text-sm font-medium text-charcoal-700">Glissez vos photos ici</p>
              <p className="text-xs text-charcoal-400">ou cliquez pour sélectionner</p>
            </>
          )}
        </div>
      )}

      <p className="text-xs text-charcoal-400 mt-2">{photos.length}/{MAX_PHOTOS} photos</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/webp,image/jpeg,image/png"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && void uploadFiles(e.target.files)}
      />

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
