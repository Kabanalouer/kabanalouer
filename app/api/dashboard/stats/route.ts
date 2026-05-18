import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Period = "7d" | "30d" | "year" | "all";

function calcResponseStats(
  messages: { sender_id: string; receiver_id: string; created_at: string }[],
  hostId: string
) {
  const convs = new Map<string, { firstMsg: Date; firstReply: Date | null }>();
  for (const msg of messages) {
    const incoming = msg.receiver_id === hostId;
    const partner = incoming ? msg.sender_id : msg.receiver_id;
    if (!convs.has(partner)) convs.set(partner, { firstMsg: new Date(0), firstReply: null });
    const c = convs.get(partner)!;
    if (incoming && c.firstMsg.getTime() === 0) c.firstMsg = new Date(msg.created_at);
    else if (!incoming && c.firstReply === null && c.firstMsg.getTime() > 0)
      c.firstReply = new Date(msg.created_at);
  }
  let replied = 0, totalMs = 0, replyN = 0;
  for (const c of convs.values()) {
    if (c.firstReply) {
      replied++;
      const ms = c.firstReply.getTime() - c.firstMsg.getTime();
      if (ms > 0) { totalMs += ms; replyN++; }
    }
  }
  return {
    responseRate: convs.size > 0 ? Math.round((replied / convs.size) * 100) : null,
    avgResponseMs: replyN > 0 ? totalMs / replyN : null,
  };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") ?? "all") as Period;

  const since = (() => {
    const now = new Date();
    if (period === "7d") return new Date(now.getTime() - 7 * 86_400_000).toISOString();
    if (period === "30d") return new Date(now.getTime() - 30 * 86_400_000).toISOString();
    if (period === "year") return new Date(now.getFullYear(), 0, 1).toISOString();
    return null;
  })();

  const userId = user.id;

  const { data: listings } = await supabase
    .from("listings")
    .select("id, views_search, views_listing")
    .eq("host_id", userId);

  const listingIds = (listings ?? []).map((l) => l.id);

  // Messages filtered by period
  let messagesQuery = supabase
    .from("messages")
    .select("sender_id, receiver_id, created_at")
    .or(`receiver_id.eq.${userId},sender_id.eq.${userId}`)
    .order("created_at");
  if (since) messagesQuery = messagesQuery.gte("created_at", since);
  const { data: messages } = await messagesQuery;

  // Contacts count (messages received)
  let contactsQuery = supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", userId);
  if (since) contactsQuery = contactsQuery.gte("created_at", since);
  const { count: totalContacts } = await contactsQuery;

  // Reviews filtered by period
  let reviews: { listing_id: string; rating: number }[] = [];
  if (listingIds.length > 0) {
    let reviewsQuery = supabase
      .from("reviews")
      .select("listing_id, rating")
      .in("listing_id", listingIds);
    if (since) reviewsQuery = reviewsQuery.gte("created_at", since);
    const { data } = await reviewsQuery;
    reviews = data ?? [];
  }

  const { responseRate, avgResponseMs } = calcResponseStats(messages ?? [], userId);
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / totalReviews
    : null;

  // Views are global counters — only meaningful for "all" period
  const totalImpressions = since === null
    ? (listings ?? []).reduce((s, l) => s + ((l as Record<string, number>).views_search ?? 0), 0)
    : null;
  const totalConsultations = since === null
    ? (listings ?? []).reduce((s, l) => s + ((l as Record<string, number>).views_listing ?? 0), 0)
    : null;

  return NextResponse.json({
    totalContacts: totalContacts ?? 0,
    responseRate,
    avgResponseMs,
    totalReviews,
    avgRating,
    totalImpressions,
    totalConsultations,
  });
}
