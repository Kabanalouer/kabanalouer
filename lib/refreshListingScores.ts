import type { SupabaseClient } from "@supabase/supabase-js";
import { computeScore } from "@/lib/listingScore";
import type { AmenityValue } from "@/lib/amenities-catalog";

// Recalcule la colonne listings.score (même formule que le tableau de bord du proprio) pour toutes
// les fiches publiées. Cette colonne sert au classement : fiches revendiquées d'abord, puis score
// décroissant, puis plus récentes. Sans ce recalcul elle reste figée à la valeur de l'import (0 pour
// les fiches créées par un proprio). Ne touche à rien d'autre que la colonne score.

const CHUNK = 100;

type ListingRow = {
  id: string;
  host_id: string;
  title: string | null;
  description: string | null;
  amenities: unknown;
  nearby_activities: unknown;
  citq_number: string | null;
  ical_url: string | null;
  photos: unknown;
  score: number | null;
};

export async function refreshListingScores(admin: SupabaseClient): Promise<{ checked: number; updated: number }> {
  const { data: rows } = await admin
    .from("listings")
    .select("id, host_id, title, description, amenities, nearby_activities, citq_number, ical_url, photos, score")
    .eq("is_published", true)
    .eq("is_test", false);
  const listings = (rows ?? []) as ListingRow[];
  if (listings.length === 0) return { checked: 0, updated: 0 };

  const today = new Date().toISOString().slice(0, 10);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const hostIds = [...new Set(listings.map((l) => l.host_id))];
  const profiles = new Map<string, { bio: boolean; avatar: boolean }>();
  const reviewTotals = new Map<string, { total: number; recent: number }>();
  const roomsByListing = new Map<string, boolean[]>();
  const withFutureBlocked = new Set<string>();

  for (let i = 0; i < hostIds.length; i += CHUNK) {
    const { data } = await admin.from("users").select("id, bio, avatar_url").in("id", hostIds.slice(i, i + CHUNK));
    for (const u of data ?? []) {
      profiles.set(u.id as string, { bio: !!(u.bio as string | null)?.trim(), avatar: !!(u.avatar_url as string | null)?.trim() });
    }
  }

  for (let i = 0; i < listings.length; i += CHUNK) {
    const ids = listings.slice(i, i + CHUNK).map((l) => l.id);
    const [{ data: reviews }, { data: rooms }, { data: avail }] = await Promise.all([
      admin.from("reviews").select("listing_id, created_at").in("listing_id", ids),
      admin.from("rooms").select("listing_id, photos").in("listing_id", ids),
      admin.from("availability").select("listing_id").in("listing_id", ids).gte("date", today).eq("source", "manual"),
    ]);
    for (const r of reviews ?? []) {
      const prev = reviewTotals.get(r.listing_id as string) ?? { total: 0, recent: 0 };
      reviewTotals.set(r.listing_id as string, {
        total: prev.total + 1,
        recent: prev.recent + (new Date(r.created_at as string) >= sixMonthsAgo ? 1 : 0),
      });
    }
    for (const room of rooms ?? []) {
      const list = roomsByListing.get(room.listing_id as string) ?? [];
      list.push(Array.isArray(room.photos) && room.photos.length > 0);
      roomsByListing.set(room.listing_id as string, list);
    }
    for (const a of avail ?? []) withFutureBlocked.add(a.listing_id as string);
  }

  let updated = 0;
  for (const l of listings) {
    const profile = profiles.get(l.host_id);
    const rooms = roomsByListing.get(l.id) ?? [];
    const rc = reviewTotals.get(l.id) ?? { total: 0, recent: 0 };
    const score = computeScore({
      photoCount: Array.isArray(l.photos) ? l.photos.length : 0,
      title: l.title ?? "",
      description: l.description ?? "",
      amenities: Array.isArray(l.amenities) ? (l.amenities as AmenityValue[]) : [],
      nearbyActivities: Array.isArray(l.nearby_activities) ? (l.nearby_activities as string[]) : [],
      citqNumber: l.citq_number ?? "",
      icalUrl: l.ical_url,
      hasFutureBlocked: withFutureBlocked.has(l.id),
      roomsAllHavePhotos: rooms.length > 0 && rooms.every(Boolean),
      bioFilled: profile?.bio ?? false,
      avatarFilled: profile?.avatar ?? false,
      reviewCount: rc.total,
      recentReviewCount: rc.recent,
    });
    if (score === l.score) continue;
    const { error } = await admin.from("listings").update({ score }).eq("id", l.id);
    if (!error) updated++;
  }
  return { checked: listings.length, updated };
}
