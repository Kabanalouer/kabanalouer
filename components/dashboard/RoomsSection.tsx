"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import RoomPhotoManager from "./RoomPhotoManager";
import { TEXT_LINK_CLASSNAME } from "@/lib/textLinkClassName";
import type { PhotoItem } from "@/lib/photo";

// "sofa_bed" (divan-lit) est un type de lit comme les autres, sélectionnable
// pour une chambre ou un salon — l'affichage public (RoomsCarousel, pages
// /chalets) compte déjà séparément ce type depuis `beds[]`, donc aucun
// changement nécessaire de ce côté.
type BedType = "simple" | "double" | "queen" | "king" | "sofa_bed";

type BedEntry = { type: BedType; quantity: number };

type RoomLocal = {
  localId: string;
  serverId: string | null;
  type: "bedroom" | "living_room";
  name: string;
  name_en?: string;
  capacity: number;
  beds: BedEntry[];
  photos: string[];
};

// Noms standard (jamais saisis par le proprio) : « Chambre 1 », « Salon 1 »…
// selon l'ordre dans chaque type. Même règle sur la fiche publique.
function standardRoomName(type: RoomLocal["type"], n: number) {
  return type === "living_room"
    ? { fr: `Salon ${n}`, en: `Living room ${n}` }
    : { fr: `Chambre ${n}`, en: `Bedroom ${n}` };
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function fromDbRow(row: Record<string, unknown>): RoomLocal {
  const bedsRaw = Array.isArray(row.beds) ? (row.beds as BedEntry[]) : [];
  return {
    localId: uid(),
    serverId: row.id as string,
    type: row.type === "living_room" ? "living_room" : "bedroom",
    name: row.name as string,
    name_en: (row.name_en as string | null) ?? undefined,
    capacity: row.capacity as number,
    beds: bedsRaw,
    photos: Array.isArray(row.photos) ? (row.photos as string[]) : [],
  };
}

export default function RoomsSection({
  userId,
  listingId,
  listingPhotos = [],
  bedroomCount = 0,
}: {
  userId: string;
  listingId: string;
  /** Nombre de chambres déclaré (section Nombre de voyageurs, ou import
   * Airbnb) — sert au bouton « Créer mes N chambres ». */
  bedroomCount?: number;
  /** Photos déjà présentes dans la galerie générale de l'annonce, pour les
   * réutiliser dans une chambre sans réupload. */
  listingPhotos?: PhotoItem[];
}) {
  const t = useTranslations("listings.rooms");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const supabase = createClient();

  const [rooms, setRooms] = useState<RoomLocal[]>([]);
  const [originalIds, setOriginalIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("rooms")
      .select("*")
      .eq("listing_id", listingId)
      .order("sort_order")
      .then(({ data }) => {
        if (data) {
          setRooms(data.map(fromDbRow));
          setOriginalIds(new Set(data.map((r) => r.id as string)));
        }
        setLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const bedrooms    = rooms.filter((r) => r.type === "bedroom");
  const livingRooms = rooms.filter((r) => r.type === "living_room");

  const addBedroom = () =>
    setRooms((prev) => [
      ...prev,
      { localId: uid(), serverId: null, type: "bedroom",
        name: t("bedroomDefault", { n: bedrooms.length + 1 }), capacity: 2, beds: [], photos: [] },
    ]);

  const addLivingRoom = () =>
    setRooms((prev) => [
      ...prev,
      { localId: uid(), serverId: null, type: "living_room",
        name: t("livingroomDefault", { n: livingRooms.length + 1 }), capacity: 2, beds: [], photos: [] },
    ]);

  // Prépare d'un coup les chambres déclarées, sans lits : le proprio choisit
  // les lits lui-même (jamais d'information inventée).
  const createDeclaredBedrooms = () =>
    setRooms((prev) => [
      ...prev,
      ...Array.from({ length: bedroomCount }, (_, i) => ({
        localId: uid(), serverId: null, type: "bedroom" as const,
        name: t("bedroomDefault", { n: i + 1 }), capacity: 2, beds: [], photos: [],
      })),
    ]);

  // Ajout rapide : un clic = un lit de plus de ce type (regroupé s'il existe déjà).
  const quickAddBed = (roomId: string, type: BedType) =>
    setRooms((prev) =>
      prev.map((r) => {
        if (r.localId !== roomId) return r;
        const idx = r.beds.findIndex((b) => b.type === type);
        if (idx === -1) return { ...r, beds: [...r.beds, { type, quantity: 1 }] };
        return { ...r, beds: r.beds.map((b, i) => (i === idx ? { ...b, quantity: b.quantity + 1 } : b)) };
      })
    );

  const bedroomsWithoutBeds = bedrooms.filter((r) => !r.beds.some((b) => b.quantity > 0)).length;

  const removeRoom   = (id: string) => setRooms((prev) => prev.filter((r) => r.localId !== id));
  const updateRoom   = (id: string, patch: Partial<RoomLocal>) =>
    setRooms((prev) => prev.map((r) => (r.localId === id ? { ...r, ...patch } : r)));

  const addBed = (roomId: string) =>
    setRooms((prev) =>
      prev.map((r) =>
        r.localId === roomId ? { ...r, beds: [...r.beds, { type: "double", quantity: 1 }] } : r
      )
    );
  const updateBed = (roomId: string, idx: number, patch: Partial<BedEntry>) =>
    setRooms((prev) =>
      prev.map((r) =>
        r.localId === roomId
          ? { ...r, beds: r.beds.map((b, i) => (i === idx ? { ...b, ...patch } : b)) }
          : r
      )
    );
  const removeBed = (roomId: string, idx: number) =>
    setRooms((prev) =>
      prev.map((r) =>
        r.localId === roomId ? { ...r, beds: r.beds.filter((_, i) => i !== idx) } : r
      )
    );

  const handleSave = async () => {
    setSaving(true);
    setError("");

    const currentIds = new Set(rooms.filter((r) => r.serverId).map((r) => r.serverId as string));
    const deletedIds = [...originalIds].filter((id) => !currentIds.has(id));

    if (deletedIds.length > 0) {
      const { error: deleteError } = await supabase.from("rooms").delete().in("id", deletedIds);
      if (deleteError) {
        setSaving(false);
        setError(t("saveError"));
        return;
      }
    }

    const newServerIds: Record<string, string> = {};
    const typeCounter = { bedroom: 0, living_room: 0 };
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      typeCounter[room.type] += 1;
      const standardName = standardRoomName(room.type, typeCounter[room.type]);

      const payload = {
        listing_id: listingId,
        type: room.type,
        name: standardName.fr,
        name_en: standardName.en,
        capacity: room.capacity,
        beds: room.beds,
        photos: room.photos,
        sort_order: i,
      };

      if (room.serverId) {
        const { error: updateError } = await supabase.from("rooms").update(payload).eq("id", room.serverId);
        if (updateError) {
          setSaving(false);
          setError(t("saveError"));
          return;
        }
      } else {
        const { data, error: insertError } = await supabase.from("rooms").insert(payload).select("id").single();
        if (insertError || !data) {
          setSaving(false);
          setError(t("saveError"));
          return;
        }
        newServerIds[room.localId] = data.id;
      }
    }

    setRooms((prev) =>
      prev.map((r) => (r.localId in newServerIds ? { ...r, serverId: newServerIds[r.localId] } : r))
    );
    setOriginalIds(new Set([...currentIds, ...Object.values(newServerIds)]));
    setSaving(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  };

  if (loading) {
    return <div className="py-8 text-center text-charcoal-400 text-sm">{tCommon("loading")}</div>;
  }

  return (
    <div className="space-y-8">

      {/* Value-add message */}
      <div className="border-l-[3px] border-[#636e40] bg-[#f5f6ec] rounded-r-xl px-4 py-3">
        <p className="text-base text-charcoal-700">
          {t("proTip")}
        </p>
      </div>

      {/* ── Chambres ──────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-heading-3 font-semibold text-charcoal-800 mb-4">{t("bedroomsTitle")}</h3>

        {bedrooms.length === 0 && bedroomCount > 0 && (
          <div className="mb-4 rounded-2xl border border-primary-100 bg-primary-50 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold text-charcoal-800">{t("quickCreateTitle", { count: bedroomCount })}</p>
              <p className="mt-1 text-sm text-charcoal-600">{t("quickCreateBody")}</p>
            </div>
            <button
              type="button"
              onClick={createDeclaredBedrooms}
              className="shrink-0 bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              {t("quickCreateCta", { count: bedroomCount })}
            </button>
          </div>
        )}
        {bedrooms.length === 0 && bedroomCount === 0 && (
          <p className="text-base text-charcoal-400 mb-4">{t("bedroomsEmpty")}</p>
        )}

        <div className="space-y-4">
          {bedrooms.map((room, i) => (
            <BedroomCard
              key={room.localId}
              label={t("bedroomDefault", { n: i + 1 })}
              room={room}
              userId={userId}
              listingPhotos={listingPhotos}
              t={t}
              locale={locale}
              onUpdate={(p) => updateRoom(room.localId, p)}
              onRemove={() => removeRoom(room.localId)}
              onAddBed={() => addBed(room.localId)}
              onQuickAddBed={(type) => quickAddBed(room.localId, type)}
              onUpdateBed={(i, p) => updateBed(room.localId, i, p)}
              onRemoveBed={(i) => removeBed(room.localId, i)}
            />
          ))}
        </div>

        <button
          onClick={addBedroom}
          className={`mt-4 flex items-center gap-1.5 text-sm ${TEXT_LINK_CLASSNAME}`}
        >
          <span className="text-base font-bold">+</span> {t("addBedroom").replace("+ ", "")}
        </button>
      </div>

      <div className="border-t border-[#ebebeb]" />

      {/* ── Salons ────────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-heading-3 font-semibold text-charcoal-800 mb-4">{t("livingroomsTitle")}</h3>

        {livingRooms.length === 0 && (
          <p className="text-base text-charcoal-400 mb-4">{t("livingroomsEmpty")}</p>
        )}

        <div className="space-y-4">
          {livingRooms.map((room, i) => (
            <LivingRoomCard
              key={room.localId}
              label={t("livingroomDefault", { n: i + 1 })}
              room={room}
              userId={userId}
              listingPhotos={listingPhotos}
              t={t}
              locale={locale}
              onUpdate={(p) => updateRoom(room.localId, p)}
              onRemove={() => removeRoom(room.localId)}
              onAddBed={() => addBed(room.localId)}
              onQuickAddBed={(type) => quickAddBed(room.localId, type)}
              onUpdateBed={(i, p) => updateBed(room.localId, i, p)}
              onRemoveBed={(i) => removeBed(room.localId, i)}
            />
          ))}
        </div>

        <button
          onClick={addLivingRoom}
          className={`mt-4 flex items-center gap-1.5 text-sm ${TEXT_LINK_CLASSNAME}`}
        >
          <span className="text-base font-bold">+</span> {t("addLivingroom").replace("+ ", "")}
        </button>
      </div>

      {/* ── Save bar ──────────────────────────────────────────────────── */}
      <p className="mt-6 text-xs text-charcoal-400">{t("requiredNote")}</p>
      <div className="pt-4 border-t border-[#ebebeb] flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? tCommon("saving") : justSaved ? tCommon("saved") : tCommon("save")}
        </button>
        {bedroomsWithoutBeds > 0 && (
          <p className="text-sm font-medium text-warning-700">{t("roomsMissingBeds", { count: bedroomsWithoutBeds })}</p>
        )}
        {error && <p className="text-sm text-error-500">{error}</p>}
      </div>
    </div>
  );
}

type TRooms = ReturnType<typeof useTranslations>;

// ── Beds editor (partagé chambres + salons) ─────────────────────────────────

const QUICK_BED_TYPES: BedType[] = ["king", "queen", "double", "simple", "sofa_bed"];

function BedsEditor({
  beds, t, required = false, onAddBed, onQuickAddBed, onUpdateBed, onRemoveBed,
}: {
  beds: BedEntry[];
  t: TRooms;
  /** Chambre : au moins un lit requis pour publier (pas pour un salon). */
  required?: boolean;
  onAddBed: () => void;
  onQuickAddBed: (type: BedType) => void;
  onUpdateBed: (idx: number, patch: Partial<BedEntry>) => void;
  onRemoveBed: (idx: number) => void;
}) {
  const BED_LABELS: Record<BedType, string> = {
    simple: t("bedSingle"),
    double: t("bedDouble"),
    queen:  t("bedQueen"),
    king:   t("bedKing"),
    sofa_bed: t("bedSofa"),
  };

  const QUICK_LABELS: Record<BedType, string> = {
    king: t("quickBedKing"),
    queen: t("quickBedQueen"),
    double: t("quickBedDouble"),
    simple: t("quickBedSingle"),
    sofa_bed: t("quickBedSofa"),
  };
  const hasBeds = beds.some((b) => b.quantity > 0);

  return (
    <div>
      <span className="text-sm text-charcoal-500 block mb-2">{t("beds")}</span>
      <div className="flex flex-wrap gap-2 mb-3">
        {QUICK_BED_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onQuickAddBed(type)}
            className="min-h-10 px-3.5 rounded-full border border-[#dddddd] bg-white text-sm font-medium text-charcoal-700 hover:border-charcoal-400 transition-colors"
          >
            + {QUICK_LABELS[type]}
          </button>
        ))}
      </div>
      {!hasBeds && (
        <p className={`text-xs mb-2 ${required ? "font-medium text-warning-700" : "text-charcoal-300"}`}>
          {required ? t("bedRequired") : t("bedsEmpty")}
        </p>
      )}
      <div className="space-y-2">
        {beds.map((bed, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={bed.type}
              onChange={(e) => onUpdateBed(i, { type: e.target.value as BedType })}
              className="flex-1 border border-[#ebebeb] rounded-lg px-3 py-1.5 text-base focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              {(Object.keys(BED_LABELS) as BedType[]).map((k) => (
                <option key={k} value={k}>{BED_LABELS[k]}</option>
              ))}
            </select>
            <input
              type="number" min={1} max={10}
              value={bed.quantity}
              onChange={(e) => onUpdateBed(i, { quantity: parseInt(e.target.value) || 1 })}
              className="w-16 border border-[#ebebeb] rounded-lg px-2 py-1.5 text-base text-center focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={() => onRemoveBed(i)}
              className="text-charcoal-300 hover:text-error-400 transition-colors p-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={onAddBed}
        className={`mt-2 text-xs ${TEXT_LINK_CLASSNAME}`}
      >
        {t("addBed")}
      </button>
    </div>
  );
}

// ── Room header (partagé chambres + salons) ─────────────────────────────────

function RoomHeader({
  label, room, onRemove, t, locale,
}: {
  label: string;
  room: RoomLocal;
  onRemove: () => void;
  t: TRooms;
  locale: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <p className="flex-1 font-semibold text-charcoal-800 text-base">{label}</p>
      {room.photos.length === 0 && (
        <span className="text-xs font-medium text-warning-600 bg-warning-50 border border-warning-200 rounded-full px-2 py-0.5 shrink-0">
          {t("noPhotos")}
        </span>
      )}
      <button
        onClick={onRemove}
        className="text-charcoal-300 hover:text-error-400 transition-colors"
        aria-label={locale === "en" ? "Delete" : "Supprimer"}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

// ── Bedroom card ─────────────────────────────────────────────────────────────

function BedroomCard({
  label, room, userId, listingPhotos, t, locale,
  onUpdate, onRemove, onAddBed, onQuickAddBed, onUpdateBed, onRemoveBed,
}: {
  label: string;
  room: RoomLocal;
  userId: string;
  listingPhotos: PhotoItem[];
  t: TRooms;
  locale: string;
  onUpdate: (patch: Partial<RoomLocal>) => void;
  onRemove: () => void;
  onAddBed: () => void;
  onQuickAddBed: (type: BedType) => void;
  onUpdateBed: (idx: number, patch: Partial<BedEntry>) => void;
  onRemoveBed: (idx: number) => void;
}) {
  return (
    <div className="border border-[#ebebeb] rounded-2xl p-5 space-y-4">
      <RoomHeader label={label} room={room} onRemove={onRemove} t={t} locale={locale} />

      {/* Capacity */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-charcoal-500 w-36 shrink-0">{t("capacity")}</label>
        <input
          type="number" min={1} max={20}
          value={room.capacity}
          onChange={(e) => onUpdate({ capacity: parseInt(e.target.value) || 1 })}
          className="w-20 border border-[#ebebeb] rounded-lg px-3 py-1.5 text-base text-center focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <BedsEditor beds={room.beds} t={t} required onAddBed={onAddBed} onQuickAddBed={onQuickAddBed} onUpdateBed={onUpdateBed} onRemoveBed={onRemoveBed} />

      {/* Photos */}
      <div>
        <span className="text-sm font-semibold text-charcoal-700 block mb-2">{t("bedroomPhotos")}</span>
        <RoomPhotoManager
          photos={room.photos}
          userId={userId}
          availablePhotos={listingPhotos}
          onChange={(photos) => onUpdate({ photos })}
        />
      </div>
    </div>
  );
}

// ── Living room card ──────────────────────────────────────────────────────────

function LivingRoomCard({
  label, room, userId, listingPhotos, t, locale,
  onUpdate, onRemove, onAddBed, onQuickAddBed, onUpdateBed, onRemoveBed,
}: {
  label: string;
  room: RoomLocal;
  userId: string;
  listingPhotos: PhotoItem[];
  t: TRooms;
  locale: string;
  onUpdate: (patch: Partial<RoomLocal>) => void;
  onRemove: () => void;
  onAddBed: () => void;
  onQuickAddBed: (type: BedType) => void;
  onUpdateBed: (idx: number, patch: Partial<BedEntry>) => void;
  onRemoveBed: (idx: number) => void;
}) {
  return (
    <div className="border border-[#ebebeb] rounded-2xl p-5 space-y-4">
      <RoomHeader label={label} room={room} onRemove={onRemove} t={t} locale={locale} />

      {/* Capacity */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-charcoal-500 w-36 shrink-0">{t("livingroomCapacity")}</label>
        <input
          type="number" min={1} max={10}
          value={room.capacity}
          onChange={(e) => onUpdate({ capacity: parseInt(e.target.value) || 1 })}
          className="w-20 border border-[#ebebeb] rounded-lg px-3 py-1.5 text-base text-center focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <BedsEditor beds={room.beds} t={t} onAddBed={onAddBed} onQuickAddBed={onQuickAddBed} onUpdateBed={onUpdateBed} onRemoveBed={onRemoveBed} />

      {/* Photos */}
      <div>
        <span className="text-sm font-semibold text-charcoal-700 block mb-2">{t("livingroomPhotos")}</span>
        <RoomPhotoManager
          photos={room.photos}
          userId={userId}
          availablePhotos={listingPhotos}
          onChange={(photos) => onUpdate({ photos })}
        />
      </div>
    </div>
  );
}
