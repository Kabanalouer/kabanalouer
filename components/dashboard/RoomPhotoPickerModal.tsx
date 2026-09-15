"use client";

import { useState } from "react";
import type { PhotoItem } from "@/lib/photo";

export default function RoomPhotoPickerModal({
  availablePhotos,
  alreadyInRoom,
  remainingSlots,
  onConfirm,
  onClose,
}: {
  availablePhotos: PhotoItem[];
  alreadyInRoom: string[];
  remainingSlots: number;
  onConfirm: (urls: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  // Une photo déjà assignée à cette chambre ne se propose pas une deuxième
  // fois — elle reste réutilisable ailleurs (galerie générale, autres
  // chambres), aucune exclusivité entre ces listes.
  const selectable = availablePhotos.filter((p) => !alreadyInRoom.includes(p.url));

  const toggle = (url: string) => {
    setSelected((prev) => {
      if (prev.includes(url)) return prev.filter((u) => u !== url);
      if (prev.length >= remainingSlots) return prev;
      return [...prev, url];
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="p-6 pb-4 border-b border-[#ebebeb]">
          <h2 className="text-lg font-bold text-charcoal-800">Choisir une photo existante</h2>
          <p className="text-sm text-charcoal-500 mt-1">
            Sélectionnez une ou plusieurs photos déjà présentes dans la galerie de l&apos;annonce.
          </p>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {selectable.length === 0 ? (
            <p className="text-sm text-charcoal-400 text-center py-8">
              Toutes les photos de la galerie sont déjà assignées à cette chambre.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {selectable.map((photo) => {
                const isSelected = selected.includes(photo.url);
                const atLimit = !isSelected && selected.length >= remainingSlots;
                return (
                  <button
                    key={photo.url}
                    type="button"
                    onClick={() => toggle(photo.url)}
                    disabled={atLimit}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-colors ${
                      isSelected
                        ? "border-primary"
                        : atLimit
                        ? "border-[#ebebeb] opacity-40 cursor-not-allowed"
                        : "border-[#ebebeb] hover:border-primary/40"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={photo.caption || "Photo de l'annonce"} className="w-full h-full object-cover" />
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 6l3 3 5-5" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 pt-4 border-t border-[#ebebeb] flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-[#ebebeb] text-charcoal-700 py-2.5 rounded-full text-sm font-semibold hover:bg-charcoal-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            disabled={selected.length === 0}
            className="flex-1 bg-primary text-white py-2.5 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selected.length > 0 ? `Ajouter (${selected.length})` : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}
