"use client";

import { useEffect } from "react";

interface Props {
  listingId: string;
  isOwner: boolean;
}

export default function ViewTracker({ listingId, isOwner }: Props) {
  useEffect(() => {
    if (isOwner) return;
    fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
  }, [listingId, isOwner]);

  return null;
}
