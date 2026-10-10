"use client";

import { useEffect } from "react";
import { trackFunnelStep } from "@/lib/funnel";

interface Props {
  listingId: string;
  isOwner: boolean;
}

export default function ViewTracker({ listingId, isOwner }: Props) {
  useEffect(() => {
    if (isOwner) return;
    trackFunnelStep("t_listing_view");
    fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
  }, [listingId, isOwner]);

  return null;
}
