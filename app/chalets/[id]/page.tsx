import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactButton from "@/components/chalets/ContactButton";
import AvailabilityView from "@/components/chalets/AvailabilityView";
import ListingMap from "@/components/chalets/ListingMap";
import ExpandableText from "@/components/chalets/ExpandableText";
import RoomsCarousel from "@/components/chalets/RoomsCarousel";
import PhotoGallery from "@/components/chalets/PhotoGallery";
import { normalizePhotos } from "@/lib/photo";

const DEFAULT_PHOTO =
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80";

const AMENITY_EMOJI: Record<string, string> = {
  "Bord de l'eau":                              "🌊",
  "Piscine intérieure":                         "🏊",
  "Piscine extérieure":                         "🏊",
  "Ski in / Ski out":                           "⛷️",
  "Situé sur un resort":                        "🏔️",
  "Spa":                                        "♨️",
  "Sauna":                                      "🧖",
  "Chalet en bois rond":                        "🪵",
  "Foyer intérieur au bois":                    "🔥",
  "Foyer extérieur (firepit)":                  "🔥",
  "BBQ":                                        "🍖",
  "Table de billard":                           "🎱",
  "Babyfoot":                                   "⚽",
  "Table de ping-pong":                         "🏓",
  "Arcades":                                    "🕹️",
  "Jeux de société":                            "🎲",
  "Livres et Revues":                           "📚",
  "Gym":                                        "💪",
  "Wifi":                                       "📶",
  "Espace de travail dédié (télétravail)":      "💻",
  "Climatisation":                              "❄️",
  "Télévision avec câble":                      "📺",
  "Télévision intelligente":                    "📺",
  "Système audio (musique)":                    "🎵",
  "Cuisine complète avec vaisselle et chaudrons": "🍳",
  "Literie et serviettes incluses":             "🛏️",
  "Buanderie":                                  "👕",
  "Terrasse":                                   "🪑",
  "Module de jeux pour enfant":                 "🛝",
  "Borne de recharge pour véhicule électrique": "⚡",
};

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select("title, region, description")
    .eq("id", id)
    .eq("is_published", true)
    .single();
  if (!data) return {};
  return {
    title: `${data.title} — Kabanalouer`,
    description: data.description?.slice(0, 155),
  };
}

export default async function ListingPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: listing }, { data: { user } }] = await Promise.all([
    supabase
      .from("listings")
      .select("*, host:host_id(id, name, avatar_url, created_at)")
      .eq("id", id)
      .eq("is_published", true)
      .single(),
    supabase.auth.getUser(),
  ]);

  if (!listing) notFound();

  // Increment view count (fire and forget — don't block page render)
  void supabase.rpc("increment_listing_views", { p_listing_id: id });

  const { data: availability } = await supabase
    .from("availability")
    .select("date, source")
    .eq("listing_id", id)
    .eq("is_blocked", true)
    .order("date", { ascending: true });

  const { data: rooms } = await supabase
    .from("rooms")
    .select("*")
    .eq("listing_id", id)
    .order("sort_order");

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, author:author_id(name, avatar_url)")
    .eq("listing_id", id)
    .order("created_at", { ascending: false });

  const rawPhotos = normalizePhotos(listing.photos);
  const photos = rawPhotos.length > 0 ? rawPhotos : [{ url: DEFAULT_PHOTO, caption: "" }];

  const amenities: string[] = Array.isArray(listing.amenities) ? listing.amenities : [];
  const nearbyActivities: string[] = Array.isArray(listing.nearby_activities) ? listing.nearby_activities as string[] : [];

  const NEARBY_EMOJI: Record<string, string> = {
    "Glissades d'eau / Parc aquatique":           "💦",
    "Vélo de montagne":                           "🚵",
    "Piste cyclable":                             "🚲",
    "Randonnée pédestre":                         "🥾",
    "Pêche":                                      "🎣",
    "Accès à un lac":                             "🏞️",
    "Accès à un lac avec embarcation à moteur":   "⛵",
    "Plage":                                      "🏖️",
    "Parcours arbre-en-arbre":                    "🌲",
    "Tyrolienne":                                 "🪂",
    "Paintball":                                  "🎯",
    "Go Kart":                                    "🏎️",
    "Cinéparc":                                   "🚗",
    "Équitation":                                 "🐴",
    "Golf":                                       "⛳",
    "Escalade":                                   "🧗",
    "Croisière / Excursion nautique":             "🚢",
    "Ski alpin":                                  "⛷️",
    "Motoneige":                                  "🏔️",
    "Traîneau à chiens":                          "🐕",
    "Sentiers de raquettes":                      "👣",
    "Ski de fond":                                "🎿",
    "Pêche sur glace":                            "🎣",
    "Glissade sur tube":                          "🛷",
    "Patinage / Hockey extérieur":                "⛸️",
    "Fatbike":                                    "🚵",
    "Cabane à sucre":                             "🍁",
    "Magasinage (shopping)":                      "🛍️",
    "Musée":                                      "🏛️",
    "Restaurant / Bistro":                        "🍽️",
    "Microbrasserie":                             "🍺",
    "Spa nordique":                               "♨️",
    "Casino":                                     "🎰",
    "Cinéma":                                     "🎬",
    "Village touristique":                        "🏘️",
  };

  const NEARBY_CATEGORIES: Record<string, string[]> = {
    "Été": [
      "Glissades d'eau / Parc aquatique", "Vélo de montagne", "Piste cyclable",
      "Randonnée pédestre", "Pêche", "Accès à un lac",
      "Accès à un lac avec embarcation à moteur", "Plage", "Parcours arbre-en-arbre",
      "Tyrolienne", "Paintball", "Go Kart", "Cinéparc", "Équitation",
      "Golf", "Escalade", "Croisière / Excursion nautique",
    ],
    "Hiver": [
      "Ski alpin", "Motoneige", "Traîneau à chiens", "Sentiers de raquettes",
      "Ski de fond", "Pêche sur glace", "Glissade sur tube", "Équitation",
      "Patinage / Hockey extérieur", "Fatbike",
    ],
    "4 saisons": [
      "Cabane à sucre", "Magasinage (shopping)", "Musée", "Restaurant / Bistro",
      "Microbrasserie", "Spa nordique", "Casino", "Cinéma", "Village touristique",
    ],
  };
  const avgRating =
    reviews && reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

  // AI review summary (server-side, only if 5+ reviews)
  let aiSummary: string | null = null;
  if (reviews && reviews.length >= 5 && process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 250,
        system: [{ type: "text", text: "Tu es un assistant qui résume des avis de voyageurs sur des chalets québécois. Style : chaleureux, synthétique, 2-3 phrases max.", cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: `Résume ces ${reviews.length} avis :\n${reviews.map((r) => `"${r.comment}" (${r.rating}/5)`).join("\n")}` }],
      });
      aiSummary = msg.content[0].type === "text" ? msg.content[0].text : null;
    } catch { /* silently fail */ }
  }

  const host = listing.host as { id: string; name: string; avatar_url: string; created_at: string } | null;

  // Subtitle calculations
  const city = (listing.city as string | null) ?? (() => {
    const addr = listing.address as string | null;
    if (!addr) return null;
    const parts = addr.split(",");
    return parts.length >= 2 ? parts[parts.length - 1].trim() : null;
  })();

  const allRooms = rooms ?? [];
  const bedroomsFromRooms = allRooms.filter((r) => r.type === "bedroom");
  const bedroomCount = bedroomsFromRooms.length > 0 ? bedroomsFromRooms.length : listing.bedrooms;

  const totalBeds = (() => {
    if (allRooms.length === 0) return null;
    const bedroomBeds = bedroomsFromRooms.reduce((sum, room) => {
      const beds = Array.isArray(room.beds) ? room.beds as { type: string; quantity: number }[] : [];
      return sum + beds.filter((b) => b.type !== "sofa_bed").reduce((s, b) => s + b.quantity, 0);
    }, 0);
    const sofaBeds = allRooms.filter((r) => r.type === "living_room").reduce((sum, room) => {
      const beds = Array.isArray(room.beds) ? room.beds as { type: string; quantity: number }[] : [];
      return sum + beds.filter((b) => b.type === "sofa_bed").reduce((s, b) => s + b.quantity, 0);
    }, 0);
    const total = bedroomBeds + sofaBeds;
    return total > 0 ? total : null;
  })();

  const subtitleParts = [
    city ? `${city}, ${listing.region}` : listing.region,
    `${listing.capacity} personne${listing.capacity > 1 ? "s" : ""}`,
    `${bedroomCount} chambre${bedroomCount > 1 ? "s" : ""}`,
    totalBeds !== null && totalBeds > 0 ? `${totalBeds} lit${totalBeds > 1 ? "s" : ""}` : null,
    `${listing.bathrooms} salle${listing.bathrooms > 1 ? "s" : ""} de bain`,
  ].filter(Boolean);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* ── Breadcrumb ── */}
        <nav className="text-sm text-gray-400 mb-4">
          <Link href="/chalets" className="hover:text-primary transition-colors">Chalets</Link>
          <span className="mx-2">›</span>
          <Link href={`/chalets?region=${listing.region}`} className="hover:text-primary transition-colors">{listing.region}</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-600 truncate">{listing.title}</span>
        </nav>

        {/* ── Title + subtitle ── */}
        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-2">
            {listing.title}
          </h1>
          <p className="text-sm text-gray-500">
            {subtitleParts.join(" · ")}
          </p>
        </div>

        {/* ── Photo gallery ── */}
        <PhotoGallery photos={photos} title={listing.title} />

        {/* ── Two-column layout ── */}
        <div className="flex gap-10 items-start">
          {/* ── Left column ── */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* Host */}
            {host && (
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shrink-0 overflow-hidden">
                  {host.avatar_url ? (
                    <Image src={host.avatar_url} alt={host.name} width={56} height={56} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-white font-bold text-xl">
                      {(host.name?.[0] ?? "?").toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    Hôte : {host.name?.split(" ")[0] ?? "l'hôte"}
                  </p>
                  <p className="text-sm text-gray-400">{hostSince(host.created_at)}</p>
                </div>
              </div>
            )}

            <hr className="border-gray-100" />

            {/* Description */}
            {listing.description && (
              <div>
                <h2 className="font-semibold text-gray-900 mb-3">À propos de ce chalet</h2>
                <ExpandableText text={listing.description} />
              </div>
            )}

            {/* Rooms */}
            {rooms && rooms.length > 0 && (
              <>
                <hr className="border-gray-100" />
                <div>
                  <h2 className="font-semibold text-gray-900 mb-4">Chambres et espaces</h2>
                  <RoomsCarousel
                    rooms={rooms.map((r) => ({
                      id: r.id,
                      type: r.type,
                      name: r.name,
                      capacity: r.capacity,
                      beds: Array.isArray(r.beds) ? r.beds as { type: string; quantity: number }[] : [],
                      photos: Array.isArray(r.photos) ? r.photos as string[] : [],
                    }))}
                  />
                </div>
              </>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <>
                <hr className="border-gray-100" />
                <div>
                  <h2 className="font-semibold text-gray-900 mb-4">Équipements</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {amenities.map((a) => (
                      <div key={a} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-base">{AMENITY_EMOJI[a] ?? "✓"}</span>
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Nearby activities */}
            {nearbyActivities.length > 0 && (
              <>
                <hr className="border-gray-100" />
                <div>
                  <h2 className="font-semibold text-gray-900 mb-1">À proximité</h2>
                  <p className="text-sm text-gray-400 mb-4">À moins de 30 minutes du chalet</p>
                  <div className="space-y-5">
                    {Object.entries(NEARBY_CATEGORIES).map(([cat, items]) => {
                      const catItems = items.filter((i) => nearbyActivities.includes(i));
                      if (catItems.length === 0) return null;
                      return (
                        <div key={cat}>
                          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">{cat}</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {catItems.map((a) => (
                              <div key={a} className="flex items-center gap-2 text-sm text-gray-700">
                                <span className="text-base">{NEARBY_EMOJI[a] ?? "✓"}</span>
                                {a}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Practical info */}
            <>
              <hr className="border-gray-100" />
              <div>
                <h2 className="font-semibold text-gray-900 mb-4">Informations pratiques</h2>
                <div className="space-y-2 text-sm text-gray-700">
                  {listing.checkin_time && (
                    <div className="flex items-center gap-2">
                      <span className="text-base">🔑</span>
                      <span>Arrivée : à partir de {(listing.checkin_time as string).replace(":", "h")}</span>
                    </div>
                  )}
                  {listing.checkout_time && (
                    <div className="flex items-center gap-2">
                      <span className="text-base">🧳</span>
                      <span>Départ : avant {(listing.checkout_time as string).replace(":", "h")}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-base">{listing.checkin_type === "in_person" ? "🤝" : "🔑"}</span>
                    <span>
                      {listing.checkin_type === "in_person"
                        ? "Accueil sur place — Remise des clés en personne à l'arrivée"
                        : "Arrivée autonome — Accès par code numérique ou boîte à clés"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🐾</span>
                    <span>{listing.pets_allowed ? "Animaux acceptés" : "Animaux non acceptés"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">{listing.smoking_allowed ? "🚬" : "🚭"}</span>
                    <span>{listing.smoking_allowed ? "Fumeurs acceptés" : "Fumeurs non acceptés"}</span>
                  </div>
                  {listing.citq_number && (
                    <div className="flex items-center gap-2">
                      <span className="text-base">🏷️</span>
                      <span>Numéro CITQ : {listing.citq_number as string}</span>
                    </div>
                  )}
                </div>
              </div>
            </>

            {/* Availability */}
            <hr className="border-gray-100" />
            <div>
              <h2 className="font-semibold text-gray-900 mb-4">Disponibilités</h2>
              <AvailabilityView
                blocked={(availability ?? []) as { date: string; source: "manual" | "ical" }[]}
              />
            </div>

            {/* Map */}
            {listing.latitude && listing.longitude && (
              <>
                <hr className="border-gray-100" />
                <div>
                  <h2 className="font-semibold text-gray-900 mb-4">Localisation</h2>
                  <ListingMap lat={listing.latitude as number} lng={listing.longitude as number} />
                </div>
              </>
            )}

            {/* Reviews */}
            <hr className="border-gray-100" />
            <div>
              <div className="flex items-center gap-3 mb-5">
                <h2 className="font-semibold text-gray-900">
                  Avis {reviews && reviews.length > 0 && `(${reviews.length})`}
                </h2>
                {avgRating > 0 && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-semibold text-sm">{avgRating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* AI summary */}
              {aiSummary && (
                <div className="bg-ai-light rounded-2xl p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-ai bg-white px-2.5 py-1 rounded-full">
                      ✦ Résumé IA
                    </span>
                    <span className="text-xs text-ai/60">Synthèse de {reviews!.length} avis</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{aiSummary}</p>
                </div>
              )}

              {reviews && reviews.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-5">
                  {reviews.slice(0, 6).map((review) => {
                    const author = review.author as unknown as { name: string; avatar_url: string } | null;
                    return (
                      <div key={review.id} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-gray-500">
                              {(author?.name?.[0] ?? "?").toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{author?.name ?? "Voyageur"}</p>
                            <div className="flex gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <svg key={i} className={`w-3 h-3 fill-current ${i < review.rating ? "text-yellow-400" : "text-gray-200"}`} viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Aucun avis pour l&apos;instant.</p>
              )}
            </div>
          </div>

          {/* ── Right column — Pricing card ── */}
          <div className="w-80 shrink-0 sticky top-24 hidden lg:block">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
              {/* Price */}
              <div className="mb-4">
                {listing.price_on_request ? (
                  <div>
                    <span className="text-xl font-bold text-gray-900">Prix sur demande</span>
                    <p className="text-xs text-gray-400 mt-1">Contactez l&apos;hôte pour obtenir une soumission personnalisée.</p>
                  </div>
                ) : listing.price_low > 0 ? (
                  <>
                    <p className="text-xs text-gray-400 mb-0.5">À partir de</p>
                    <span className="text-3xl font-bold text-gray-900">{listing.price_low} $</span>
                    <span className="text-gray-500 text-sm"> / nuit</span>
                  </>
                ) : (
                  <span className="text-xl font-bold text-gray-900">Prix sur demande</span>
                )}
              </div>

              {/* Season breakdown */}
              {!listing.price_on_request && (listing.price_low > 0 || listing.price_high > 0 || listing.price_peak > 0) && (
                <div className="space-y-1.5 text-sm mb-5 bg-gray-50 rounded-xl p-3">
                  {listing.price_low > 0 && <SeasonRow label="Basse saison" price={listing.price_low} />}
                  {listing.price_high > 0 && <SeasonRow label="Haute saison" price={listing.price_high} />}
                  {listing.price_peak > 0 && <SeasonRow label="Fêtes / Vacances" price={listing.price_peak} />}
                </div>
              )}

              {/* Capacity */}
              <div className="flex items-center gap-3 text-sm text-gray-500 mb-6">
                <span>👥 {listing.capacity} personnes</span>
                <span>·</span>
                <span>🛏 {listing.bedrooms} chambre{listing.bedrooms > 1 ? "s" : ""}</span>
              </div>

              {/* CTA */}
              <ContactButton
                listingId={listing.id}
                hostId={host?.id ?? ""}
                hostName={host?.name ?? "l'hôte"}
                listingTitle={listing.title}
                currentUserId={user?.id ?? null}
              />

              <p className="text-xs text-gray-400 text-center mt-3">
                Contact direct · Zéro frais de service
              </p>
            </div>
          </div>
        </div>

        {/* Mobile CTA */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 p-4 z-40">
          <ContactButton
            listingId={listing.id}
            hostId={host?.id ?? ""}
            hostName={host?.name ?? "l'hôte"}
            listingTitle={listing.title}
            currentUserId={user?.id ?? null}
          />
        </div>
      </main>

      <div className="lg:hidden h-24" />
      <Footer />
    </div>
  );
}

function hostSince(createdAt: string): string {
  const months =
    (new Date().getFullYear() - new Date(createdAt).getFullYear()) * 12 +
    (new Date().getMonth() - new Date(createdAt).getMonth());
  if (months < 1) return "Nouveau";
  if (months < 12) return `Hôte depuis ${months} mois`;
  const years = Math.floor(months / 12);
  return `Hôte depuis ${years} an${years > 1 ? "s" : ""}`;
}

function SeasonRow({ label, price }: { label: string; price: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900">{price} $</span>
    </div>
  );
}
