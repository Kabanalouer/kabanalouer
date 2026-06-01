"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PreviewModal from "./PreviewModal";
import DeleteListingModal from "./DeleteListingModal";
import { createClient } from "@/lib/supabase/client";
import AmenitiesPicker from "./AmenitiesPicker";
import NearbyActivitiesPicker from "./NearbyActivitiesPicker";
import PhotoUpload, { MIN_PHOTOS } from "./PhotoUpload";
import RoomsSection from "./RoomsSection";
import LocationSection from "./LocationSection";
import AvailabilityCalendar, { type BlockedEntry } from "./AvailabilityCalendar";
import ICalSync from "./ICalSync";
import type { PhotoItem } from "@/lib/photo";
import PromotionsSection from "./PromotionsSection";
import FeaturedListingSection from "./FeaturedListingSection";
import AnalyseSection from "./AnalyseSection";
import { computeScore, getScoreLevel } from "@/lib/listingScore";


type FormState = {
  title: string;
  description: string;
  region: string;
  address: string;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  price_low: number;
  price_high: number;
  price_peak: number;
  amenities: string[];
  photos: PhotoItem[];
  citq_number: string;
  checkin_time: string;
  checkout_time: string;
  pets_allowed: boolean;
  smoking_allowed: boolean;
  min_age: number;
  checkin_type: "autonomous" | "in_person";
  nearby_activities: string[];
  price_on_request: boolean;
};

function timeSlots(startH: number, endH: number): string[] {
  const slots: string[] = [];
  for (let h = startH; h <= endH; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    if (h < endH) slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
}

const CHECKIN_SLOTS = timeSlots(8, 23);
const CHECKOUT_SLOTS = timeSlots(7, 18);

type SectionId =
  | "photos"
  | "titre"
  | "description"
  | "capacite"
  | "chambres"
  | "equipements"
  | "proximite"
  | "calendrier"
  | "localisation"
  | "tarifs"
  | "infos"
  | "promotions"
  | "analyse"
  | "vedette"
  | "publier";

const SECTIONS: Array<{
  id: SectionId;
  label: string;
  emoji: string;
  isComplete: (f: FormState) => boolean;
}> = [
  { id: "photos",       label: "Photos",               emoji: "📷", isComplete: (f) => (f.photos as PhotoItem[]).length >= MIN_PHOTOS },
  { id: "titre",        label: "Titre",                emoji: "✏️", isComplete: (f) => f.title.trim().length > 0 },
  { id: "description",  label: "Description",          emoji: "📝", isComplete: (f) => f.description.trim().length > 0 },
  { id: "capacite",     label: "Nombre de voyageurs",  emoji: "👥", isComplete: (f) => f.capacity > 0 && f.bedrooms > 0 },
  { id: "chambres",     label: "Chambres",             emoji: "🛏", isComplete: () => true },
  { id: "equipements",  label: "Caractéristiques",     emoji: "✨", isComplete: (f) => f.amenities.length >= 3 },
  { id: "proximite",    label: "À proximité",          emoji: "🗺️", isComplete: () => true },
  { id: "tarifs",       label: "Tarifs",               emoji: "💰", isComplete: (f) => f.price_on_request || f.price_low >= 50 },
  { id: "calendrier",   label: "Calendrier",           emoji: "📅", isComplete: () => true },
  { id: "localisation", label: "Localisation",         emoji: "📍", isComplete: (f) => f.region.trim().length > 0 },
  { id: "infos",        label: "Infos générales",      emoji: "ℹ️",  isComplete: (f) => f.citq_number.length === 6 },
  { id: "promotions",   label: "Promotions",           emoji: "",   isComplete: () => true },
  { id: "analyse",      label: "Analyse de mon annonce", emoji: "", isComplete: () => true },
];

// Fields saved per section
const SECTION_FIELDS: Record<SectionId, (keyof FormState)[]> = {
  photos:       ["photos"],
  titre:        ["title"],
  description:  ["description"],
  capacite:     ["capacity", "bedrooms", "bathrooms"],
  equipements:  ["amenities"],
  proximite:    ["nearby_activities"],
  chambres:     [],
  calendrier:   [],
  localisation: [],
  tarifs:       ["price_low", "price_on_request"],
  infos:        ["citq_number", "checkin_time", "checkout_time", "pets_allowed", "smoking_allowed", "min_age", "checkin_type"],
  promotions:   [],
  analyse:      [],
  vedette:      [],
  publier:      [],
};

const inputCls =
  "w-full border border-[#ebebeb] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition";

const FREE_LAUNCH_LIMIT = 50;

const INDICATOR_SECTION_IDS = new Set<SectionId>([
  "photos", "titre", "description", "capacite", "chambres",
  "equipements", "proximite", "tarifs", "calendrier", "localisation", "infos", "promotions",
]);
const TITLE_MAX = 50;
const DESC_MAX = 2500;
const PUBLISH_FEATURES = [
  "Annonce visible sur Kabanalouer",
  "Messagerie avec les voyageurs",
  "Calendrier de disponibilités",
  "Synchronisation iCal",
  "Tableau de bord et statistiques",
  "Accès illimité pendant 1 an",
];

export default function EditListingForm({
  userId,
  listingId,
  initialData,
  isPublished: initialPublished,
  initialCity,
  initialLat,
  initialLng,
  subscriptionStatus: initialSubStatus,
  subscriptionExpiresAt: initialSubExpiresAt,
  activeSubscriptionCount,
  initialBlocked,
  icalUrl,
  icalLastSync,
  listingCreatedAt,
  viewsListing,
}: {
  userId: string;
  listingId: string;
  initialData: Partial<FormState>;
  isPublished: boolean;
  initialCity: string;
  initialLat: number | null;
  initialLng: number | null;
  subscriptionStatus: string | null;
  subscriptionExpiresAt: string | null;
  activeSubscriptionCount: number;
  initialBlocked: BlockedEntry[];
  icalUrl: string | null;
  icalLastSync: string | null;
  listingCreatedAt: string;
  viewsListing: number;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    region: "",
    address: "",
    capacity: 4,
    bedrooms: 2,
    bathrooms: 1,
    price_low: 0,
    price_high: 0,
    price_peak: 0,
    amenities: [],
    photos: [] as PhotoItem[],
    citq_number: "",
    checkin_time: "16:00",
    checkout_time: "11:00",
    pets_allowed: false,
    smoking_allowed: false,
    min_age: 21,
    checkin_type: "autonomous" as const,
    nearby_activities: [],
    price_on_request: false,
    ...initialData,
  });

  const [activeSection, setActiveSection] = useState<SectionId>("photos");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isPublished, setIsPublished] = useState(initialPublished);
  const [subStatus, setSubStatus] = useState<string | null>(initialSubStatus);
  const [subExpiresAt, setSubExpiresAt] = useState<string | null>(initialSubExpiresAt);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const canPreview = !!form.title.trim() && form.photos.length > 0;
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [roomsHasBeds, setRoomsHasBeds] = useState(false);
  const [roomsAllHavePhotos, setRoomsAllHavePhotos] = useState(false);
  const [promotionsHasActive, setPromotionsHasActive] = useState(false);
  const [scoreDbData, setScoreDbData] = useState({ bioFilled: false, avatarFilled: false, reviewCount: 0, recentReviewCount: 0 });
  const [scoreDbLoaded, setScoreDbLoaded] = useState(false);
  const [locationValid, setLocationValid] = useState(!!(initialLat && initialLng));
  const [showPublishErrors, setShowPublishErrors] = useState(false);
  const [calendarMode, setCalendarMode] = useState<"manual" | "ical">(() => icalUrl ? "ical" : "manual");
  const [showCalendarWarning, setShowCalendarWarning] = useState(false);
  const [uniqueContacts, setUniqueContacts] = useState<number>(0);

  const switchCalendarMode = (mode: "manual" | "ical") => {
    if (mode === calendarMode) return;
    const hasManualDates = initialBlocked.some((e) => e.source === "manual");
    const hasIcalUrl = !!icalUrl;
    setShowCalendarWarning(
      (mode === "ical" && hasManualDates) || (mode === "manual" && hasIcalUrl)
    );
    setCalendarMode(mode);
  };

  useEffect(() => {
    supabase
      .from("rooms")
      .select("beds, photos")
      .eq("listing_id", listingId)
      .then(({ data }) => {
        if (!data) return;
        setRoomsHasBeds(
          data.some((r) => {
            const beds = Array.isArray(r.beds) ? (r.beds as { type: string; quantity: number }[]) : [];
            return beds.some((b) => b.quantity > 0);
          })
        );
        setRoomsAllHavePhotos(
          data.length > 0 &&
          data.every((r) => Array.isArray(r.photos) && (r.photos as string[]).length > 0)
        );
      });
  }, [activeSection]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    void Promise.all([
      supabase.from("users").select("bio, avatar_url").eq("id", userId).single(),
      supabase.from("reviews").select("created_at").eq("listing_id", listingId),
      supabase.from("promotions").select("id").eq("listing_id", listingId).eq("is_active", true).limit(1),
    ]).then(([userRes, reviewsRes, promoRes]) => {
      const u = userRes.data;
      const reviews = reviewsRes.data ?? [];
      setScoreDbData({
        bioFilled: !!u?.bio?.trim(),
        avatarFilled: !!u?.avatar_url?.trim(),
        reviewCount: reviews.length,
        recentReviewCount: reviews.filter((r) => new Date(r.created_at) >= sixMonthsAgo).length,
      });
      setPromotionsHasActive((promoRes.data?.length ?? 0) > 0);
      setScoreDbLoaded(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    supabase
      .from("messages")
      .select("sender_id")
      .eq("listing_id", listingId)
      .eq("receiver_id", userId)
      .then(({ data }) => {
        if (!data) return;
        const distinct = new Set(data.map((m) => m.sender_id as string)).size;
        setUniqueContacts(distinct);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const REQUIRED_SECTION_IDS = new Set<SectionId>([
    "photos", "titre", "description", "capacite", "chambres",
    "equipements", "tarifs", "localisation", "infos",
  ]);

  const sectionValid: Partial<Record<SectionId, boolean>> = {
    photos: form.photos.length >= MIN_PHOTOS,
    titre: form.title.trim().length > 0,
    description: form.description.trim().length > 0,
    capacite: form.capacity >= 1 && form.bedrooms >= 1,
    chambres: roomsHasBeds,
    equipements: form.amenities.length >= 3,
    tarifs: form.price_on_request || form.price_low >= 50,
    localisation: locationValid,
    infos: form.citq_number.length === 6,
  };

  const incompleteSectionIds = (Object.entries(sectionValid) as [SectionId, boolean][])
    .filter(([, valid]) => !valid)
    .map(([id]) => id);

  const allRequiredComplete = incompleteSectionIds.length === 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const hasFutureBlocked = initialBlocked.some((b) => new Date(b.date) >= today);
  const hasAvailability = !!(icalUrl?.trim()) || hasFutureBlocked;

  const indicatorValid: Partial<Record<SectionId, boolean>> = {
    ...sectionValid,
    chambres: roomsHasBeds && roomsAllHavePhotos,
    proximite: form.nearby_activities.length > 0,
    calendrier: hasAvailability,
    promotions: promotionsHasActive,
  };

  const sidebarScore = scoreDbLoaded
    ? computeScore({
        photoCount: form.photos.length,
        title: form.title,
        description: form.description,
        amenities: form.amenities,
        nearbyActivities: form.nearby_activities,
        citqNumber: form.citq_number,
        icalUrl,
        hasFutureBlocked,
        roomsAllHavePhotos,
        bioFilled: scoreDbData.bioFilled,
        avatarFilled: scoreDbData.avatarFilled,
        reviewCount: scoreDbData.reviewCount,
        recentReviewCount: scoreDbData.recentReviewCount,
      })
    : null;

  // Title limit flash
  const [titleAtLimit, setTitleAtLimit] = useState(false);
  const titleLimitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Description limit flash
  const [descAtLimit, setDescAtLimit] = useState(false);
  const descLimitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Title AI
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [titleGenerating, setTitleGenerating] = useState(false);
  const [titleGenError, setTitleGenError] = useState("");
  const [showTitleContextWarning, setShowTitleContextWarning] = useState(false);
  const [savedTitle, setSavedTitle] = useState<string | null>(null);

  // Description AI
  const [descGenerating, setDescGenerating] = useState(false);
  const [descGenError, setDescGenError] = useState("");
  const [showDescContextWarning, setShowDescContextWarning] = useState(false);
  const [savedDescription, setSavedDescription] = useState<string | null>(null);
  const [showDescRestoreButtons, setShowDescRestoreButtons] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSaveSection = async () => {
    const fields = SECTION_FIELDS[activeSection];
    if (!fields.length) return;

    if (activeSection === "infos" && form.citq_number.length !== 6) {
      setSaveError("Le numéro CITQ doit contenir exactement 6 chiffres.");
      return;
    }

    setSaving(true);
    setSaveError("");

    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      payload[field] = form[field];
    }

    const { error } = await supabase
      .from("listings")
      .update(payload)
      .eq("id", listingId)
      .eq("host_id", userId);

    setSaving(false);
    if (error) {
      setSaveError("Erreur lors de l'enregistrement. Réessayez.");
    } else {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
      setSavedTitle(null);
      setSavedDescription(null);
      setShowDescRestoreButtons(false);
    }
  };

  const handleActivateFree = async () => {
    setPublishLoading(true);
    setPublishError("");
    const res = await fetch("/api/subscriptions/activate-free", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    if (!res.ok) {
      const data = await res.json();
      setPublishError(data.error ?? "Une erreur s'est produite.");
      setPublishLoading(false);
      return;
    }
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    setIsPublished(true);
    setSubStatus("active");
    setSubExpiresAt(expires.toISOString());
    setPublishLoading(false);
  };

  const handleStripeCheckout = async () => {
    setPublishLoading(true);
    setPublishError("");
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    if (!res.ok) {
      setPublishError("Impossible de démarrer le paiement. Réessayez.");
      setPublishLoading(false);
      return;
    }
    const { url } = await res.json();
    if (url) window.location.href = url;
    else {
      setPublishError("URL de paiement manquante.");
      setPublishLoading(false);
    }
  };

  const handleTitleChange = (value: string) => {
    if (value.length > TITLE_MAX) {
      set("title", value.slice(0, TITLE_MAX));
      if (titleLimitTimer.current) clearTimeout(titleLimitTimer.current);
      setTitleAtLimit(true);
      titleLimitTimer.current = setTimeout(() => setTitleAtLimit(false), 1500);
    } else {
      set("title", value);
    }
  };

  const handleDescriptionChange = (value: string) => {
    if (value.length > DESC_MAX) {
      set("description", value.slice(0, DESC_MAX));
      if (descLimitTimer.current) clearTimeout(descLimitTimer.current);
      setDescAtLimit(true);
      descLimitTimer.current = setTimeout(() => setDescAtLimit(false), 1500);
    } else {
      set("description", value);
    }
  };

  const contextScore = [
    form.region.trim().length > 0,
    form.capacity > 0,
    form.bedrooms > 0,
    form.amenities.length >= 3,
    form.nearby_activities.length > 0,
  ].filter(Boolean).length;

  const goToNextIncompleteSection = () => {
    const next = SECTIONS.find((s) => s.id !== "publier" && !s.isComplete(form));
    if (next) setActiveSection(next.id);
  };

  const handleGenerateTitles = async (force = false) => {
    if (!force && contextScore < 3) { setShowTitleContextWarning(true); return; }
    setShowTitleContextWarning(false);
    setTitleGenerating(true);
    setTitleGenError("");
    setTitleSuggestions([]);
    try {
      const res = await fetch("/api/ai/suggest-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_title: form.title, region: form.region, city: initialCity,
          capacity: form.capacity, bedrooms: form.bedrooms, amenities: form.amenities,
          nearby_activities: form.nearby_activities,
        }),
      });
      const data = await res.json();
      if (!res.ok) setTitleGenError(data.error ?? "Erreur lors de la génération.");
      else setTitleSuggestions(data.suggestions ?? []);
    } catch { setTitleGenError("Erreur lors de la génération."); }
    setTitleGenerating(false);
  };

  const handleGenerateDescription = async (force = false) => {
    if (!force && contextScore < 3) { setShowDescContextWarning(true); return; }
    setShowDescContextWarning(false);
    setDescGenerating(true);
    setDescGenError("");
    try {
      const res = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title, region: form.region, city: initialCity,
          capacity: form.capacity, bedrooms: form.bedrooms, bathrooms: form.bathrooms,
          amenities: form.amenities, nearby_activities: form.nearby_activities,
          price_low: form.price_low, price_on_request: form.price_on_request,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDescGenError(data.error ?? "Erreur lors de la génération.");
      } else {
        const hadOriginal = form.description.trim().length > 0;
        if (hadOriginal) setSavedDescription(form.description);
        handleDescriptionChange(data.description ?? "");
        if (hadOriginal) setShowDescRestoreButtons(true);
      }
    } catch { setDescGenError("Erreur lors de la génération."); }
    setDescGenerating(false);
  };

  const hasSaveButton = SECTION_FIELDS[activeSection].length > 0;

  return (
    <>
    {previewOpen && (
      <PreviewModal listingId={listingId} onClose={() => setPreviewOpen(false)} />
    )}
    {deleteModalOpen && (
      <DeleteListingModal
        listingId={listingId}
        listingTitle={form.title}
        onClose={() => setDeleteModalOpen(false)}
        onDeleted={() => router.push("/dashboard/listings?deleted=1")}
      />
    )}
    <div className="flex flex-col lg:flex-row gap-6 items-start">

      {/* ── Left nav ────────────────────────────────────────────────────── */}
      <aside className="w-full lg:w-56 shrink-0">

        {/* Mobile: horizontal scrollable tabs */}
        <div className="flex lg:hidden gap-1 overflow-x-auto pb-1 scrollbar-none">
          {SECTIONS.map((s) => {
            const mobileActive = activeSection === s.id;
            let mobileIndicator: React.ReactNode = null;
            if (s.id === "analyse") {
              if (sidebarScore !== null) {
                const { color } = getScoreLevel(sidebarScore);
                mobileIndicator = <span className="ml-1 text-xs font-semibold tabular-nums" style={{ color }}>{sidebarScore}</span>;
              }
            } else if (INDICATOR_SECTION_IDS.has(s.id)) {
              const valid = indicatorValid[s.id];
              mobileIndicator = valid
                ? <span className="ml-1 text-green-500 text-xs">✓</span>
                : <span className="ml-1 w-1.5 h-1.5 rounded-full bg-red-500 inline-block align-middle" />;
            }
            return (
              <button
                key={s.id}
                onClick={() => { setActiveSection(s.id); setSaveError(""); setJustSaved(false); }}
                className={[
                  "whitespace-nowrap px-3 py-2 rounded-full text-sm font-medium transition-colors shrink-0 inline-flex items-center",
                  mobileActive
                    ? "bg-primary text-white"
                    : "bg-white border border-[#ebebeb] text-charcoal-600 hover:bg-charcoal-50",
                ].join(" ")}
              >
                {s.label}
                {mobileIndicator}
              </button>
            );
          })}
        </div>

        {/* Desktop: vertical list */}
        <div className="hidden lg:flex flex-col gap-1">
          {SECTIONS.map((s) => {
            const active = activeSection === s.id;
            let indicator: React.ReactNode = null;
            if (s.id === "analyse") {
              if (sidebarScore !== null) {
                const { color } = getScoreLevel(sidebarScore);
                indicator = (
                  <span className="text-xs font-semibold shrink-0 tabular-nums" style={{ color }}>
                    {sidebarScore}
                  </span>
                );
              }
            } else if (INDICATOR_SECTION_IDS.has(s.id)) {
              const valid = indicatorValid[s.id];
              indicator = valid
                ? <span className="text-green-500 text-xs shrink-0">✓</span>
                : <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 inline-block" />;
            }
            return (
              <button
                key={s.id}
                onClick={() => { setActiveSection(s.id); setSaveError(""); setJustSaved(false); }}
                className={[
                  "flex items-center justify-between gap-3 py-2.5 text-sm text-left transition-colors",
                  active
                    ? "pl-3 border-l-[3px] border-[#636e40] font-semibold text-[#636e40]"
                    : "pl-4 font-medium text-charcoal-600 hover:text-charcoal-800",
                ].join(" ")}
              >
                <span>{s.label}</span>
                {indicator}
              </button>
            );
          })}

          {/* Bottom actions */}
          <div className="mt-4 pt-4 border-t border-[#ebebeb] space-y-2">
            {/* Publish button */}
            {isPublished && subStatus === "active" ? (
              <button
                onClick={() => { setActiveSection("publier"); setSaveError(""); setJustSaved(false); }}
                className="w-full py-2.5 rounded-full text-sm font-semibold border border-[#ebebeb] text-charcoal-600 bg-white hover:bg-charcoal-50 transition-colors flex items-center justify-center gap-1.5"
              >
                Annonce publiée <span className="text-green-600">✓</span>
              </button>
            ) : (
              <button
                onClick={() => { setActiveSection("publier"); setSaveError(""); setJustSaved(false); }}
                className="w-full py-2.5 rounded-full text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors flex items-center justify-center"
              >
                Publier mon annonce
              </button>
            )}
            <div>
              <button
                type="button"
                onClick={() => { setActiveSection("vedette"); setSaveError(""); setJustSaved(false); }}
                disabled={!isPublished}
                className={`w-full py-2.5 rounded-full text-sm font-semibold border transition-colors flex items-center justify-center ${isPublished ? "border-[#636e40] text-[#636e40] bg-white hover:bg-[#636e40]/5" : "border-[#ebebeb] text-charcoal-300 bg-charcoal-50 cursor-not-allowed"}`}
              >
                Booster mon annonce
              </button>
              {!isPublished && (
                <p className="text-xs text-charcoal-400 text-center mt-1.5">
                  Publiez votre annonce pour activer cette option
                </p>
              )}
            </div>
            <button
              onClick={() => setPreviewOpen(true)}
              disabled={!canPreview}
              title={!canPreview ? "Ajoutez un titre et au moins une photo pour prévisualiser votre annonce." : undefined}
              className={`w-full py-2.5 rounded-full text-sm font-semibold border transition-colors flex items-center justify-center ${canPreview ? "border-primary text-primary bg-white hover:bg-primary/5" : "border-[#ebebeb] text-charcoal-300 bg-charcoal-50 cursor-not-allowed"}`}
            >
              Aperçu de mon annonce
            </button>
            <button
              onClick={() => setDeleteModalOpen(true)}
              className="w-full text-xs text-charcoal-400 hover:text-charcoal-600 transition-colors py-1"
            >
              Supprimer mon annonce
            </button>
          </div>
        </div>

        {/* Mobile bottom actions */}
        <div className="flex lg:hidden flex-col gap-2 mt-3">
          {/* Publish button */}
          {isPublished && subStatus === "active" ? (
            <button
              onClick={() => { setActiveSection("publier"); setSaveError(""); setJustSaved(false); }}
              className="w-full py-2.5 rounded-full text-sm font-semibold border border-[#ebebeb] text-charcoal-600 bg-white hover:bg-charcoal-50 transition-colors flex items-center justify-center gap-1.5"
            >
              Annonce publiée <span className="text-green-600">✓</span>
            </button>
          ) : (
            <button
              onClick={() => { setActiveSection("publier"); setSaveError(""); setJustSaved(false); }}
              className="w-full py-2.5 rounded-full text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors flex items-center justify-center"
            >
              Publier mon annonce
            </button>
          )}
          <div>
            <button
              type="button"
              onClick={() => { setActiveSection("vedette"); setSaveError(""); setJustSaved(false); }}
              disabled={!isPublished}
              className={`w-full py-2.5 rounded-full text-sm font-semibold border transition-colors flex items-center justify-center ${isPublished ? "border-[#636e40] text-[#636e40] bg-white hover:bg-[#636e40]/5" : "border-[#ebebeb] text-charcoal-300 bg-charcoal-50 cursor-not-allowed"}`}
            >
              Booster mon annonce
            </button>
            {!isPublished && (
              <p className="text-xs text-charcoal-400 text-center mt-1.5">
                Publiez votre annonce pour activer cette option
              </p>
            )}
          </div>
          <button
            onClick={() => setPreviewOpen(true)}
            disabled={!canPreview}
            title={!canPreview ? "Ajoutez un titre et au moins une photo pour prévisualiser votre annonce." : undefined}
            className={`w-full py-2.5 rounded-full text-sm font-semibold border transition-colors flex items-center justify-center ${canPreview ? "border-primary text-primary bg-white hover:bg-primary/5" : "border-[#ebebeb] text-charcoal-300 bg-charcoal-50 cursor-not-allowed"}`}
          >
            Aperçu de mon annonce
          </button>
          <button
            onClick={() => setDeleteModalOpen(true)}
            className="w-full text-xs text-charcoal-400 hover:text-charcoal-600 transition-colors py-1 text-center"
          >
            Supprimer mon annonce
          </button>
        </div>
      </aside>

      {/* ── Content area ────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-2xl border border-[#ebebeb] p-6">

          {/* Section: Photos */}
          {activeSection === "photos" && (
            <SectionShell title="Photos" emoji="📷">
              <PhotoUpload
                photos={form.photos}
                userId={userId}
                listingId={listingId}
                onChange={(photos) => set("photos", photos)}
              />
            </SectionShell>
          )}

          {/* Section: Titre */}
          {activeSection === "titre" && (
            <SectionShell title="Titre" emoji="✏️">
              <p className="text-sm text-charcoal-400 -mt-3 mb-4">Maximum de {TITLE_MAX} caractères.</p>

              {/* AI generate button */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => void handleGenerateTitles()}
                  disabled={titleGenerating}
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-full px-4 py-2 transition-colors disabled:opacity-50"
                >
                  {titleGenerating ? (
                    <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  )}
                  {titleGenerating ? "Génération en cours…" : "Générer avec l'IA"}
                </button>

                {showTitleContextWarning && !titleGenerating && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <p className="text-sm text-amber-800 mb-3">Pour un meilleur résultat, complétez d&apos;abord les sections Caractéristiques, Région et Capacité, puis revenez ici.</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleGenerateTitles(true)}
                        className="text-xs font-medium text-amber-700 border border-amber-300 bg-white rounded-full px-3 py-1.5 hover:bg-amber-50 transition-colors"
                      >
                        Générer quand même
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowTitleContextWarning(false); goToNextIncompleteSection(); }}
                        className="text-xs font-medium text-white bg-amber-600 rounded-full px-3 py-1.5 hover:bg-amber-700 transition-colors"
                      >
                        Continuer la fiche
                      </button>
                    </div>
                  </div>
                )}

                {titleGenError && <p className="mt-2 text-xs text-red-500">{titleGenError}</p>}
              </div>

              <label className="block text-sm font-medium text-charcoal-700 mb-1.5">
                Titre <Req />
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => { if (savedTitle !== null) setSavedTitle(null); handleTitleChange(e.target.value); }}
                className={inputCls}
                placeholder="ex. Chalet rustique au bord du lac, Laurentides"
              />
              <p className={`text-xs tabular-nums mt-1 text-right transition-colors duration-200 ${titleAtLimit ? "text-red-500" : "text-charcoal-400"}`}>
                {form.title.length}/{TITLE_MAX}
              </p>

              {/* Suggestions */}
              {titleSuggestions.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-charcoal-400">Cliquez pour utiliser :</p>
                  <div className="flex flex-col gap-2">
                    {titleSuggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          if (form.title.trim()) setSavedTitle(form.title);
                          handleTitleChange(s);
                          setTitleSuggestions([]);
                        }}
                        className="text-left text-sm px-4 py-2.5 rounded-xl border border-[#ebebeb] hover:border-primary hover:bg-primary/5 text-charcoal-700 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Restore original title */}
              {savedTitle !== null && titleSuggestions.length === 0 && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => { handleTitleChange(savedTitle); setSavedTitle(null); }}
                    className="text-sm text-charcoal-500 border border-[#ebebeb] bg-charcoal-50 hover:bg-charcoal-100 rounded-full px-4 py-2 transition-colors"
                  >
                    Restaurer le titre original
                  </button>
                </div>
              )}
              <RequiredNote />
            </SectionShell>
          )}

          {/* Section: Description */}
          {activeSection === "description" && (
            <SectionShell title="Description" emoji="📝">
              <p className="text-sm text-charcoal-400 -mt-3 mb-4">Maximum de {DESC_MAX} caractères.</p>

              {/* AI generate button */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => void handleGenerateDescription()}
                  disabled={descGenerating}
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-full px-4 py-2 transition-colors disabled:opacity-50"
                >
                  {descGenerating ? (
                    <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  )}
                  {descGenerating ? "Génération en cours…" : "Générer avec l'IA"}
                </button>

                {showDescContextWarning && !descGenerating && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <p className="text-sm text-amber-800 mb-3">Pour un meilleur résultat, complétez d&apos;abord les sections Caractéristiques, Région et Capacité, puis revenez ici.</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleGenerateDescription(true)}
                        className="text-xs font-medium text-amber-700 border border-amber-300 bg-white rounded-full px-3 py-1.5 hover:bg-amber-50 transition-colors"
                      >
                        Générer quand même
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowDescContextWarning(false); goToNextIncompleteSection(); }}
                        className="text-xs font-medium text-white bg-amber-600 rounded-full px-3 py-1.5 hover:bg-amber-700 transition-colors"
                      >
                        Continuer la fiche
                      </button>
                    </div>
                  </div>
                )}

                {descGenError && <p className="mt-2 text-xs text-red-500">{descGenError}</p>}
              </div>

              <label className="block text-sm font-medium text-charcoal-700 mb-1.5">
                Description <Req />
              </label>
              <textarea
                value={form.description}
                onChange={(e) => {
                  if (showDescRestoreButtons) { setShowDescRestoreButtons(false); setSavedDescription(null); }
                  handleDescriptionChange(e.target.value);
                }}
                className={`${inputCls} resize-none`}
                rows={32}
                placeholder="Décrivez l'atmosphère, les points forts, les activités à proximité…"
              />
              <p className={`text-xs tabular-nums mt-1 text-right transition-colors duration-200 ${descAtLimit ? "text-red-500" : "text-charcoal-400"}`}>
                {form.description.length}/{DESC_MAX}
              </p>

              {/* Restore original description */}
              {showDescRestoreButtons && savedDescription !== null && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowDescRestoreButtons(false); setSavedDescription(null); }}
                    className="text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-full px-5 py-2.5 transition-colors"
                  >
                    Utiliser cette description
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDescriptionChange(savedDescription);
                      setShowDescRestoreButtons(false);
                      setSavedDescription(null);
                    }}
                    className="text-sm font-medium text-charcoal-600 border border-[#ebebeb] bg-charcoal-50 hover:bg-charcoal-100 rounded-full px-5 py-2.5 transition-colors"
                  >
                    Restaurer l&apos;original
                  </button>
                </div>
              )}
              <RequiredNote />
            </SectionShell>
          )}

          {/* Section: Capacité */}
          {activeSection === "capacite" && (
            <SectionShell title="Nombre de voyageurs" emoji="👥">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Voyageurs */}
                <div>
                  <Label>Capacité maximale (personnes) <Req /></Label>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => set("capacity", Math.max(1, form.capacity - 1))}
                      disabled={form.capacity <= 1}
                      className="w-9 h-9 rounded-full border border-[#ebebeb] flex items-center justify-center text-charcoal-600 hover:border-charcoal-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.capacity >= 40 ? "40 et +" : String(form.capacity)}
                      onFocus={(e) => { if (form.capacity >= 40) e.target.select(); }}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        if (raw === "") return;
                        const v = parseInt(raw);
                        if (!isNaN(v)) set("capacity", Math.min(40, Math.max(1, v)));
                      }}
                      onBlur={() => { if (form.capacity < 1) set("capacity", 1); }}
                      className="w-20 text-center text-sm font-semibold text-charcoal-800 border border-[#ebebeb] rounded-xl py-2 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      onClick={() => set("capacity", Math.min(40, form.capacity + 1))}
                      disabled={form.capacity >= 40}
                      className="w-9 h-9 rounded-full border border-[#ebebeb] flex items-center justify-center text-charcoal-600 hover:border-charcoal-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    </button>
                  </div>
                </div>
                {/* Chambres */}
                <div>
                  <Label>Nombre de chambre(s) <Req /></Label>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => set("bedrooms", Math.max(1, form.bedrooms - 1))}
                      disabled={form.bedrooms <= 1}
                      className="w-9 h-9 rounded-full border border-[#ebebeb] flex items-center justify-center text-charcoal-600 hover:border-charcoal-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={String(form.bedrooms)}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        if (raw === "") return;
                        const v = parseInt(raw);
                        if (!isNaN(v)) set("bedrooms", Math.min(20, Math.max(1, v)));
                      }}
                      onBlur={() => { if (form.bedrooms < 1) set("bedrooms", 1); }}
                      className="w-14 text-center text-sm font-semibold text-charcoal-800 border border-[#ebebeb] rounded-xl py-2 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      onClick={() => set("bedrooms", Math.min(20, form.bedrooms + 1))}
                      disabled={form.bedrooms >= 20}
                      className="w-9 h-9 rounded-full border border-[#ebebeb] flex items-center justify-center text-charcoal-600 hover:border-charcoal-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    </button>
                  </div>
                </div>
                {/* Salles de bain */}
                <div>
                  <Label>Nombre de salle de bain</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => set("bathrooms", Math.max(1, form.bathrooms - 1))}
                      disabled={form.bathrooms <= 1}
                      className="w-9 h-9 rounded-full border border-[#ebebeb] flex items-center justify-center text-charcoal-600 hover:border-charcoal-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={String(form.bathrooms)}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        if (raw === "") return;
                        const v = parseInt(raw);
                        if (!isNaN(v)) set("bathrooms", Math.min(10, Math.max(1, v)));
                      }}
                      onBlur={() => { if (form.bathrooms < 1) set("bathrooms", 1); }}
                      className="w-14 text-center text-sm font-semibold text-charcoal-800 border border-[#ebebeb] rounded-xl py-2 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      onClick={() => set("bathrooms", Math.min(10, form.bathrooms + 1))}
                      disabled={form.bathrooms >= 10}
                      className="w-9 h-9 rounded-full border border-[#ebebeb] flex items-center justify-center text-charcoal-600 hover:border-charcoal-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    </button>
                  </div>
                </div>
              </div>
              <RequiredNote />
            </SectionShell>
          )}

          {/* Section: Chambres */}
          {activeSection === "chambres" && (
            <SectionShell title="Chambres" emoji="🛏">
              <p className="text-sm font-medium text-charcoal-700 -mt-3 mb-5">
                Ajoutez au moins 1 chambre avec lit <Req />
              </p>
              <RoomsSection userId={userId} listingId={listingId} />
            </SectionShell>
          )}

          {/* Section: Équipements */}
          {activeSection === "equipements" && (
            <SectionShell title="Caractéristiques" emoji="✨">
              <p className="text-sm font-medium text-charcoal-700 -mt-3 mb-4">
                Sélectionnez au moins 3 caractéristiques <Req />
              </p>
              <AmenitiesPicker
                selected={form.amenities}
                onChange={(amenities) => set("amenities", amenities)}
              />
              <RequiredNote />
            </SectionShell>
          )}

          {/* Section: À proximité */}
          {activeSection === "proximite" && (
            <SectionShell title="À proximité" emoji="🗺️">
              <p className="text-sm text-charcoal-400 mb-5">À moins de 30 minutes du chalet</p>
              <NearbyActivitiesPicker
                selected={form.nearby_activities}
                onChange={(activities) => set("nearby_activities", activities)}
              />
            </SectionShell>
          )}

          {/* Section: Calendrier */}
          {activeSection === "calendrier" && (
            <SectionShell title="Calendrier" emoji="📅">
              {/* Mode selector */}
              <div className="flex gap-2 mb-6 -mt-1">
                <button
                  type="button"
                  onClick={() => switchCalendarMode("manual")}
                  className={`flex-1 py-2.5 px-4 rounded-full text-sm font-semibold transition-colors ${
                    calendarMode === "manual"
                      ? "bg-primary text-white"
                      : "border border-[#ebebeb] text-charcoal-600 hover:border-charcoal-400"
                  }`}
                >
                  Bloquer des dates manuellement
                </button>
                <button
                  type="button"
                  onClick={() => switchCalendarMode("ical")}
                  className={`flex-1 py-2.5 px-4 rounded-full text-sm font-semibold transition-colors ${
                    calendarMode === "ical"
                      ? "bg-primary text-white"
                      : "border border-[#ebebeb] text-charcoal-600 hover:border-charcoal-400"
                  }`}
                >
                  Synchroniser avec un calendrier externe (iCal)
                </button>
              </div>

              {/* Warning */}
              {showCalendarWarning && (
                <div className="mb-5 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <p className="text-sm text-amber-800">
                    Vos dates bloquées manuellement seront retirées si vous changez de méthode.
                  </p>
                </div>
              )}

              <div className="space-y-8">
                {calendarMode === "manual" ? (
                  <AvailabilityCalendar listingId={listingId} initialBlocked={initialBlocked} />
                ) : (
                  <>
                    <ICalSync
                      listingId={listingId}
                      initialUrl={icalUrl}
                      initialLastSync={icalLastSync}
                    />
                    {icalUrl ? (
                      <AvailabilityCalendar
                        listingId={listingId}
                        initialBlocked={initialBlocked.filter((e) => e.source === "ical")}
                        readOnly
                      />
                    ) : (
                      <p className="text-sm text-charcoal-400 text-center py-6">
                        Votre calendrier apparaîtra ici une fois votre URL iCal synchronisée.
                      </p>
                    )}
                  </>
                )}
              </div>
            </SectionShell>
          )}

          {/* Section: Localisation */}
          {activeSection === "localisation" && (
            <SectionShell title="Localisation" emoji="📍">
              <LocationSection
                listingId={listingId}
                userId={userId}
                initialAddress={form.address}
                initialCity={initialCity}
                initialRegion={form.region}
                initialLat={initialLat}
                initialLng={initialLng}
                onRegionChange={(r) => set("region", r)}
                onSaved={(hasPos) => setLocationValid(hasPos)}
              />
            </SectionShell>
          )}

          {/* Section: Tarifs */}
          {activeSection === "tarifs" && (
            <SectionShell title="Tarifs" emoji="💰">
              {/* Pricing mode cards */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button type="button" onClick={() => set("price_on_request", false)}
                  className={`text-left p-4 rounded-xl border-2 transition-colors ${!form.price_on_request ? "border-primary bg-primary/5" : "border-[#ebebeb] bg-white hover:border-charcoal-300"}`}>
                  <svg className="w-5 h-5 text-charcoal-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-semibold text-sm text-charcoal-800">À partir de</p>
                  <p className="text-xs text-charcoal-500 mt-0.5 leading-snug">Affichez un prix de base sur votre fiche et générez des demandes de devis de la part des voyageurs pour leur donner le vrai prix selon les dates de leur séjour.</p>
                </button>
                <button type="button" onClick={() => set("price_on_request", true)}
                  className={`text-left p-4 rounded-xl border-2 transition-colors ${form.price_on_request ? "border-primary bg-primary/5" : "border-[#ebebeb] bg-white hover:border-charcoal-300"}`}>
                  <svg className="w-5 h-5 text-charcoal-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  <p className="font-semibold text-sm text-charcoal-800">Sur demande</p>
                  <p className="text-xs text-charcoal-500 mt-0.5 leading-snug">Aucun prix affiché sur votre fiche. Les voyageurs vous contactent pour obtenir une soumission personnalisée.</p>
                </button>
              </div>

              {/* Conditional price field */}
              {!form.price_on_request ? (
                <div className="max-w-xs">
                  <Label>Prix à partir de ($/nuit) <Req /> <span className="font-normal text-charcoal-400 text-xs">(minimum 50 $)</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400 text-sm">$</span>
                    <input
                      type="number"
                      min={0}
                      value={form.price_low || ""}
                      onChange={(e) => set("price_low", parseInt(e.target.value) || 0)}
                      className={`${inputCls} pl-7`}
                      placeholder="189"
                    />
                  </div>
                  <p className="text-sm text-charcoal-400 mt-3 leading-relaxed">
                    Ce prix sera affiché sur votre fiche publique. Vous communiquez le prix final directement avec le voyageur.
                  </p>
                  {form.price_low > 0 && (
                    <div className="mt-4 bg-charcoal-50 rounded-xl px-4 py-3 text-sm text-charcoal-600">
                      Aperçu : <span className="font-semibold text-charcoal-800">À partir de {form.price_low} $/nuit</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-charcoal-50 rounded-xl px-4 py-4 text-sm text-charcoal-600 leading-relaxed">
                  Votre fiche affichera :{" "}
                  <span className="font-semibold text-charcoal-800">«&nbsp;Prix sur demande — Contactez le propriétaire&nbsp;»</span>
                </div>
              )}
              <RequiredNote />
            </SectionShell>
          )}

          {/* Section: Infos générales */}
          {activeSection === "infos" && (
            <SectionShell title="Informations générales" emoji="ℹ️">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Numéro CITQ <Req /></label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.citq_number}
                    onChange={(e) => set("citq_number", e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className={inputCls}
                    placeholder="ex. 123456"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Heure du check-in <Req /></label>
                    <select
                      value={form.checkin_time}
                      onChange={(e) => set("checkin_time", e.target.value)}
                      className={inputCls}
                    >
                      {CHECKIN_SLOTS.map((t) => (
                        <option key={t} value={t}>{t.replace(":", "h")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Heure du check-out <Req /></label>
                    <select
                      value={form.checkout_time}
                      onChange={(e) => set("checkout_time", e.target.value)}
                      className={inputCls}
                    >
                      {CHECKOUT_SLOTS.map((t) => (
                        <option key={t} value={t}>{t.replace(":", "h")}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Type d&apos;arrivée <Req /></label>
                  <CheckinTypeField value={form.checkin_type} onChange={(v) => set("checkin_type", v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Animaux acceptés</label>
                    <ToggleField value={form.pets_allowed} onChange={(v) => set("pets_allowed", v)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Fumeur accepté</label>
                    <ToggleField value={form.smoking_allowed} onChange={(v) => set("smoking_allowed", v)} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Âge minimum requis pour louer le chalet</label>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => set("min_age", Math.max(18, form.min_age - 1))}
                      disabled={form.min_age <= 18}
                      className="w-9 h-9 rounded-full border border-[#ebebeb] flex items-center justify-center text-charcoal-600 hover:border-charcoal-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                    </button>
                    <span className="w-20 text-center text-sm font-semibold text-charcoal-800">{form.min_age} ans</span>
                    <button
                      type="button"
                      onClick={() => set("min_age", Math.min(30, form.min_age + 1))}
                      disabled={form.min_age >= 30}
                      className="w-9 h-9 rounded-full border border-[#ebebeb] flex items-center justify-center text-charcoal-600 hover:border-charcoal-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    </button>
                  </div>
                </div>
              </div>
              <RequiredNote />
            </SectionShell>
          )}

          {/* Section: Publier */}
          {activeSection === "publier" && (() => {
            const slotsLeft = Math.max(0, FREE_LAUNCH_LIMIT - activeSubscriptionCount);
            const isFree = slotsLeft > 0;
            const canPublish = allRequiredComplete;
            const expiryDate = subExpiresAt ? new Date(subExpiresAt) : null;
            const daysUntilExpiry = expiryDate
              ? Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;
            const oneYearFromNow = new Date();
            oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

            if (isPublished && subStatus === "active") {
              const publishedDate = new Date(listingCreatedAt + (listingCreatedAt.includes("T") ? "" : "T12:00:00"));
              return (
                <SectionShell title="Publier mon annonce" emoji="🚀">
                  <div className="space-y-5 max-w-md">
                    {/* Encadré vert annonce publiée */}
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-base font-bold text-green-700">Annonce publiée</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-charcoal-400 text-xs mb-0.5">Publiée le</p>
                          <p className="font-semibold text-charcoal-800">
                            {publishedDate.toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" })}
                          </p>
                        </div>
                        {expiryDate && (
                          <div>
                            <p className="text-charcoal-400 text-xs mb-0.5">Renouvellement le</p>
                            <p className="font-semibold text-charcoal-800">
                              {expiryDate.toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats de performance */}
                    <div>
                      <p className="text-sm font-semibold text-charcoal-700 mb-3">Mes stats</p>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-charcoal-400 text-xs mb-0.5">Consultations</p>
                          <p className="font-semibold text-charcoal-800">{(viewsListing ?? 0).toLocaleString("fr-CA")}</p>
                        </div>
                        <div>
                          <p className="text-charcoal-400 text-xs mb-0.5">Contacts reçus</p>
                          <p className="font-semibold text-charcoal-800">{uniqueContacts.toLocaleString("fr-CA")}</p>
                        </div>
                        <div>
                          <p className="text-charcoal-400 text-xs mb-0.5">Taux de conversion</p>
                          <p className="font-semibold text-charcoal-800">
                            {viewsListing > 0 ? `${((uniqueContacts / viewsListing) * 100).toFixed(1)} %` : "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {daysUntilExpiry !== null && daysUntilExpiry <= 30 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-sm text-amber-800 font-medium mb-2">
                          Votre abonnement expire dans {daysUntilExpiry} jour{daysUntilExpiry > 1 ? "s" : ""}
                        </p>
                        <Link
                          href="/dashboard/subscription"
                          className="text-sm text-amber-700 font-semibold hover:underline"
                        >
                          Renouveler maintenant →
                        </Link>
                      </div>
                    )}

                  </div>
                </SectionShell>
              );
            }

            return (
              <SectionShell title="Publier mon annonce" emoji="🚀">
                <div className="max-w-md space-y-5">
                  {showPublishErrors && !canPublish && (
                    <PublishErrorBox
                      incompleteSectionIds={incompleteSectionIds}
                      onNavigate={(id) => { setActiveSection(id as SectionId); setShowPublishErrors(false); }}
                    />
                  )}

                  {isFree ? (
                    <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1 text-xs font-semibold">
                      Offre de lancement
                    </div>
                  ) : null}

                  <div>
                    <h3 className="text-base font-bold text-charcoal-800 mb-1">
                      {isFree ? "Publiez votre chalet gratuitement" : "Publiez votre chalet"}
                    </h3>
                    {isFree && (
                      <>
                        <div className="flex items-center justify-between mb-1 mt-3">
                          <span className="text-xs text-charcoal-600">Places gratuites restantes</span>
                          <span className="text-xs font-bold text-primary">{slotsLeft} / {FREE_LAUNCH_LIMIT}</span>
                        </div>
                        <div className="w-full bg-charcoal-100 rounded-full h-1.5">
                          <div
                            className="bg-primary rounded-full h-1.5"
                            style={{ width: `${(activeSubscriptionCount / FREE_LAUNCH_LIMIT) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-charcoal-400 mt-1">
                          Il reste <strong className="text-charcoal-700">{slotsLeft} place{slotsLeft > 1 ? "s" : ""} gratuite{slotsLeft > 1 ? "s" : ""}</strong> sur {FREE_LAUNCH_LIMIT}
                        </p>
                      </>
                    )}
                  </div>

                  <ul className="space-y-1.5">
                    {PUBLISH_FEATURES.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-charcoal-700">
                        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div>
                    {isFree ? (
                      <>
                        <p className="text-sm text-charcoal-400 line-through mb-0.5">299 $/an</p>
                        <p className="text-2xl font-extrabold text-primary mb-1">GRATUIT</p>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-extrabold text-charcoal-800 mb-0.5">299 $</p>
                        <p className="text-sm text-charcoal-400 mb-1">par année</p>
                      </>
                    )}
                  </div>

                  {publishError && (
                    <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{publishError}</p>
                  )}

                  {isFree ? (
                    <>
                      <button
                        onClick={() => {
                          if (!canPublish) { setShowPublishErrors(true); return; }
                          void handleActivateFree();
                        }}
                        disabled={publishLoading}
                        className="w-full bg-primary text-white py-3 rounded-full font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
                      >
                        {publishLoading ? "Activation…" : "Activer mon annonce gratuitement"}
                      </button>
                      <p className="text-xs text-charcoal-400">
                        Valide jusqu&apos;au{" "}
                        {oneYearFromNow.toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          if (!canPublish) { setShowPublishErrors(true); return; }
                          void handleStripeCheckout();
                        }}
                        disabled={publishLoading}
                        className="w-full bg-primary text-white py-3 rounded-full font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
                      >
                        {publishLoading ? "Redirection vers le paiement…" : "Payer et publier — 299 $/an"}
                      </button>
                      <p className="text-xs text-charcoal-400">Paiement sécurisé par Stripe · Annulable à tout moment</p>
                    </>
                  )}
                </div>
              </SectionShell>
            );
          })()}

          {/* Section: Vedette */}
          {activeSection === "vedette" && (
            <SectionShell title="Annonce vedette">
              <FeaturedListingSection listingId={listingId} region={form.region} />
            </SectionShell>
          )}

          {/* Section: Promotions */}
          {activeSection === "promotions" && (
            <SectionShell title="Promotions">
              <PromotionsSection listingId={listingId} />
            </SectionShell>
          )}

          {/* Section: Analyse */}
          {activeSection === "analyse" && (
            <SectionShell title="Analyse de mon annonce">
              <AnalyseSection
                userId={userId}
                listingId={listingId}
                photoCount={form.photos.length}
                title={form.title}
                description={form.description}
                amenities={form.amenities}
                nearbyActivities={form.nearby_activities}
                citqNumber={form.citq_number}
                icalUrl={icalUrl}
                initialBlocked={initialBlocked}
                region={form.region}
                capacity={form.capacity}
                onNavigate={(s) => { setActiveSection(s as SectionId); setSaveError(""); setJustSaved(false); }}
              />
            </SectionShell>
          )}

          {/* Save bar */}
          {hasSaveButton && (
            <div className="mt-6 pt-5 border-t border-[#ebebeb] flex items-center gap-3">
              <button
                onClick={handleSaveSection}
                disabled={saving}
                className="bg-primary text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <><Spinner />Enregistrement…</>
                ) : justSaved ? (
                  "Enregistré ✓"
                ) : (
                  "Enregistrer"
                )}
              </button>
              {saveError && <p className="text-sm text-red-500">{saveError}</p>}
            </div>
          )}
        </div>

      </div>
    </div>
    </>
  );
}

function Req() {
  return <span className="text-[#636e40] font-medium">*</span>;
}

function RequiredNote() {
  return <p className="mt-6 text-xs text-charcoal-400">* Champs requis pour publier</p>;
}

const SECTION_LABELS: Partial<Record<string, string>> = {
  photos: "Photos",
  titre: "Titre",
  description: "Description",
  capacite: "Nombre de voyageurs",
  chambres: "Chambres",
  equipements: "Caractéristiques",
  tarifs: "Tarifs",
  localisation: "Localisation",
  infos: "Infos générales",
};

function PublishErrorBox({
  incompleteSectionIds,
  onNavigate,
}: {
  incompleteSectionIds: string[];
  onNavigate: (id: string) => void;
}) {
  return (
    <div className="border border-red-200 bg-red-50 rounded-xl p-4 space-y-2">
      <p className="text-sm font-semibold text-red-700">
        Complétez ces sections avant de publier :
      </p>
      <ul className="space-y-1">
        {incompleteSectionIds.map((id) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onNavigate(id)}
              className="text-sm text-red-600 hover:text-red-800 hover:underline text-left"
            >
              → {SECTION_LABELS[id] ?? id}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionShell({ title, emoji: _emoji, children }: { title: string; emoji?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <h2 className="text-lg font-semibold text-charcoal-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-charcoal-700 mb-1.5">{children}</label>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function CheckinTypeField({ value, onChange }: { value: "autonomous" | "in_person"; onChange: (v: "autonomous" | "in_person") => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button type="button" onClick={() => onChange("autonomous")}
        className={`text-left p-4 rounded-xl border-2 transition-colors ${value === "autonomous" ? "border-primary bg-primary/5" : "border-[#ebebeb] bg-white hover:border-charcoal-300"}`}>
        <svg className="w-5 h-5 text-charcoal-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
        </svg>
        <p className="font-semibold text-sm text-charcoal-800">Arrivée autonome</p>
        <p className="text-xs text-charcoal-500 mt-0.5 leading-snug">Accès par code numérique ou boîte à clés</p>
      </button>
      <button type="button" onClick={() => onChange("in_person")}
        className={`text-left p-4 rounded-xl border-2 transition-colors ${value === "in_person" ? "border-primary bg-primary/5" : "border-[#ebebeb] bg-white hover:border-charcoal-300"}`}>
        <svg className="w-5 h-5 text-charcoal-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
        <p className="font-semibold text-sm text-charcoal-800">Accueil sur place</p>
        <p className="text-xs text-charcoal-500 mt-0.5 leading-snug">Remise des clés en personne à l&apos;arrivée</p>
      </button>
    </div>
  );
}

function ToggleField({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex rounded-xl border border-[#ebebeb] overflow-hidden text-sm w-fit">
      <button type="button" onClick={() => onChange(false)}
        className={`px-5 py-2 font-medium transition-colors ${!value ? "bg-primary text-white" : "text-charcoal-500 hover:bg-charcoal-50"}`}>
        Non
      </button>
      <button type="button" onClick={() => onChange(true)}
        className={`px-5 py-2 font-medium transition-colors ${value ? "bg-primary text-white" : "text-charcoal-500 hover:bg-charcoal-50"}`}>
        Oui
      </button>
    </div>
  );
}
