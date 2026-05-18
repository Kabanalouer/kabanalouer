"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_PHOTOS = 5;

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
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const canUpload = photos.length < MAX_PHOTOS;

  const uploadFiles = async (files: FileList) => {
    setUploading(true);
    setError("");
    const newUrls: string[] = [];
    const remaining = MAX_PHOTOS - photos.length;

    for (const file of Array.from(files).slice(0, remaining)) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 5 * 1024 * 1024) {
        setError(`"${file.name}" dépasse 5 Mo.`);
        continue;
      }
      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error: uploadError } = await supabase.storage
        .from("listing-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false });
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

  const handleDragStart = (i: number) => setDragIdx(i);

  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (overIdx !== i) setOverIdx(i);
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
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

  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null); };

  return (
    <div>
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {photos.map((url, i) => (
            <div
              key={url}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={(e) => handleDrop(e, i)}
              onDragEnd={handleDragEnd}
              className={[
                "relative w-20 h-20 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing shrink-0 group border border-gray-100 transition-all duration-150",
                dragIdx === i ? "opacity-40 shadow-lg scale-95" : "",
                overIdx === i && dragIdx !== i ? "ring-2 ring-primary ring-offset-1" : "",
              ].join(" ")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              {i === 0 && (
                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full leading-none pointer-events-none">
                  Principale
                </span>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removePhoto(url); }}
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

      <div className="flex items-center gap-3">
        {canUpload && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-dark transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Upload…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Ajouter des photos
              </>
            )}
          </button>
        )}
        <span className="text-xs text-gray-400">{photos.length}/{MAX_PHOTOS} photos</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && uploadFiles(e.target.files)}
      />

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
