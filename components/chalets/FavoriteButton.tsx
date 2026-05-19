"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function FavoriteButton({
  listingId,
  initialIsFavorite,
  currentUserId,
  className,
}: {
  listingId: string;
  initialIsFavorite: boolean;
  currentUserId: string | null;
  className?: string;
}) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUserId) {
      router.push("/login");
      return;
    }
    if (loading) return;
    setLoading(true);
    const next = !isFavorite;
    setIsFavorite(next);
    if (next) {
      await supabase.from("favorites").insert({ user_id: currentUserId, listing_id: listingId });
    } else {
      await supabase.from("favorites").delete().eq("user_id", currentUserId).eq("listing_id", listingId);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={`p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors disabled:opacity-60 ${className ?? ""}`}
    >
      {isFavorite ? (
        <svg className="w-4 h-4 text-red-500 fill-current" viewBox="0 0 24 24">
          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-gray-400 hover:text-red-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )}
    </button>
  );
}
