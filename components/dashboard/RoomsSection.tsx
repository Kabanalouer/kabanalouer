"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import RoomPhotoManager from "./RoomPhotoManager";

type BedType = "simple" | "double" | "queen" | "king";

type BedEntry = { type: BedType; quantity: number };

type RoomLocal = {
  localId: string;
  serverId: string | null;
  type: "bedroom" | "living_room";
  name: string;
  capacity: number;
  beds: BedEntry[];
  sofa_count: number;
  photos: string[];
};

const BED_LABELS: Record<BedType, string> = {
  simple: "Lit simple",
  double: "Lit double",
  queen:  "Lit queen",
  king:   "Lit king",
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function fromDbRow(row: Record<string, unknown>): RoomLocal {
  const bedsRaw = Array.isArray(row.beds) ? (row.beds as { type: string; quantity: number }[]) : [];
  if (row.type === "living_room") {
    const sofa = bedsRaw.find((b) => b.type === "sofa_bed");
    return {
      localId: uid(), serverId: row.id as string, type: "living_room",
      name: row.name as string, capacity: row.capacity as number,
      beds: [], sofa_count: sofa?.quantity ?? 0,
      photos: Array.isArray(row.photos) ? (row.photos as string[]) : [],
    };
  }
  return {
    localId: uid(), serverId: row.id as string, type: "bedroom",
    name: row.name as string, capacity: row.capacity as number,
    beds: bedsRaw.filter((b) => b.type !== "sofa_bed") as BedEntry[],
    sofa_count: 0,
    photos: Array.isArray(row.photos) ? (row.photos as string[]) : [],
  };
}

export default function RoomsSection({
  userId,
  listingId,
}: {
  userId: string;
  listingId: string;
}) {
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
        name: `Chambre ${bedrooms.length + 1}`, capacity: 2, beds: [], sofa_count: 0, photos: [] },
    ]);

  const addLivingRoom = () =>
    setRooms((prev) => [
      ...prev,
      { localId: uid(), serverId: null, type: "living_room",
        name: `Salon ${livingRooms.length + 1}`, capacity: 2, beds: [], sofa_count: 0, photos: [] },
    ]);

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
      await supabase.from("rooms").delete().in("id", deletedIds);
    }

    const newServerIds: Record<string, string> = {};
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      const bedsDb: { type: string; quantity: number }[] =
        room.type === "living_room"
          ? room.sofa_count > 0 ? [{ type: "sofa_bed", quantity: room.sofa_count }] : []
          : room.beds;

      const payload = {
        listing_id: listingId,
        type: room.type,
        name: room.name,
        capacity: room.capacity,
        beds: bedsDb,
        photos: room.photos,
        sort_order: i,
      };

      if (room.serverId) {
        await supabase.from("rooms").update(payload).eq("id", room.serverId);
      } else {
        const { data } = await supabase.from("rooms").insert(payload).select("id").single();
        if (data) newServerIds[room.localId] = data.id;
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
    return <div className="py-8 text-center text-charcoal-400 text-sm">Chargement…</div>;
  }

  return (
    <div className="space-y-8">

      {/* Value-add message */}
      <div className="border-l-[3px] border-[#636e40] bg-[#f5f6ec] rounded-r-xl px-4 py-3">
        <p className="text-sm text-charcoal-700">
          Les chalets avec photos de chambres reçoivent 3× plus de demandes de la part des voyageurs.
        </p>
      </div>

      {/* ── Chambres ──────────────────────────────────────────────────── */}
      <div>
        <h3 className="font-semibold text-charcoal-800 mb-4">Chambres</h3>

        {bedrooms.length === 0 && (
          <p className="text-sm text-charcoal-400 mb-4">Aucune chambre ajoutée.</p>
        )}

        <div className="space-y-4">
          {bedrooms.map((room) => (
            <BedroomCard
              key={room.localId}
              room={room}
              userId={userId}
              onUpdate={(p) => updateRoom(room.localId, p)}
              onRemove={() => removeRoom(room.localId)}
              onAddBed={() => addBed(room.localId)}
              onUpdateBed={(i, p) => updateBed(room.localId, i, p)}
              onRemoveBed={(i) => removeBed(room.localId, i)}
            />
          ))}
        </div>

        <button
          onClick={addBedroom}
          className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
        >
          <span className="text-base font-bold">+</span> Ajouter une chambre
        </button>
      </div>

      <div className="border-t border-[#ebebeb]" />

      {/* ── Salons ────────────────────────────────────────────────────── */}
      <div>
        <h3 className="font-semibold text-charcoal-800 mb-4">Salons / espaces de couchage</h3>

        {livingRooms.length === 0 && (
          <p className="text-sm text-charcoal-400 mb-4">Aucun salon ajouté.</p>
        )}

        <div className="space-y-4">
          {livingRooms.map((room) => (
            <LivingRoomCard
              key={room.localId}
              room={room}
              userId={userId}
              onUpdate={(p) => updateRoom(room.localId, p)}
              onRemove={() => removeRoom(room.localId)}
            />
          ))}
        </div>

        <button
          onClick={addLivingRoom}
          className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
        >
          <span className="text-base font-bold">+</span> Ajouter un salon
        </button>
      </div>

      {/* ── Save bar ──────────────────────────────────────────────────── */}
      <p className="mt-6 text-xs text-charcoal-400">* Champs requis pour publier</p>
      <div className="pt-4 border-t border-[#ebebeb] flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : justSaved ? "Enregistré ✓" : "Enregistrer"}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}

// ── Bedroom card ─────────────────────────────────────────────────────────────

function BedroomCard({
  room, userId,
  onUpdate, onRemove, onAddBed, onUpdateBed, onRemoveBed,
}: {
  room: RoomLocal;
  userId: string;
  onUpdate: (patch: Partial<RoomLocal>) => void;
  onRemove: () => void;
  onAddBed: () => void;
  onUpdateBed: (idx: number, patch: Partial<BedEntry>) => void;
  onRemoveBed: (idx: number) => void;
}) {

  return (
    <div className="border border-[#ebebeb] rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <input
          value={room.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 font-semibold text-charcoal-800 bg-transparent border-b border-transparent hover:border-[#ebebeb] focus:border-primary focus:outline-none py-0.5 text-sm"
        />
        {room.photos.length === 0 && (
          <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shrink-0">
            Aucune photo
          </span>
        )}
        <button
          onClick={onRemove}
          className="text-charcoal-300 hover:text-red-400 transition-colors"
          aria-label="Supprimer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Capacity */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-charcoal-500 w-36 shrink-0">Capacité (personnes)</label>
        <input
          type="number" min={1} max={20}
          value={room.capacity}
          onChange={(e) => onUpdate({ capacity: parseInt(e.target.value) || 1 })}
          className="w-20 border border-[#ebebeb] rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Beds */}
      <div>
        <span className="text-sm text-charcoal-500 block mb-2">Lits</span>
        {room.beds.length === 0 && (
          <p className="text-xs text-charcoal-300 mb-2">Aucun lit configuré.</p>
        )}
        <div className="space-y-2">
          {room.beds.map((bed, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={bed.type}
                onChange={(e) => onUpdateBed(i, { type: e.target.value as BedType })}
                className="flex-1 border border-[#ebebeb] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                {(Object.keys(BED_LABELS) as BedType[]).map((t) => (
                  <option key={t} value={t}>{BED_LABELS[t]}</option>
                ))}
              </select>
              <input
                type="number" min={1} max={4}
                value={bed.quantity}
                onChange={(e) => onUpdateBed(i, { quantity: parseInt(e.target.value) || 1 })}
                className="w-16 border border-[#ebebeb] rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={() => onRemoveBed(i)}
                className="text-charcoal-300 hover:text-red-400 transition-colors p-1"
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
          className="mt-2 text-xs text-primary font-medium hover:text-primary-dark transition-colors"
        >
          + Ajouter un lit
        </button>
      </div>

      {/* Photos */}
      <div>
        <span className="text-sm font-semibold text-charcoal-700 block mb-2">Photos de la chambre</span>
        <RoomPhotoManager
          photos={room.photos}
          userId={userId}
          onChange={(photos) => onUpdate({ photos })}
        />
      </div>
    </div>
  );
}

// ── Living room card ──────────────────────────────────────────────────────────

function LivingRoomCard({
  room, userId, onUpdate, onRemove,
}: {
  room: RoomLocal;
  userId: string;
  onUpdate: (patch: Partial<RoomLocal>) => void;
  onRemove: () => void;
}) {

  return (
    <div className="border border-[#ebebeb] rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <input
          value={room.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 font-semibold text-charcoal-800 bg-transparent border-b border-transparent hover:border-[#ebebeb] focus:border-primary focus:outline-none py-0.5 text-sm"
        />
        {room.photos.length === 0 && (
          <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shrink-0">
            Aucune photo
          </span>
        )}
        <button
          onClick={onRemove}
          className="text-charcoal-300 hover:text-red-400 transition-colors"
          aria-label="Supprimer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm text-charcoal-500 shrink-0">Divans-lits</label>
          <input
            type="number" min={0} max={10}
            value={room.sofa_count}
            onChange={(e) => onUpdate({ sofa_count: parseInt(e.target.value) || 0 })}
            className="w-16 border border-[#ebebeb] rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-charcoal-500 shrink-0">Capacité</label>
          <input
            type="number" min={1} max={10}
            value={room.capacity}
            onChange={(e) => onUpdate({ capacity: parseInt(e.target.value) || 1 })}
            className="w-16 border border-[#ebebeb] rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Photos */}
      <div>
        <span className="text-sm font-semibold text-charcoal-700 block mb-2">Photos du salon</span>
        <RoomPhotoManager
          photos={room.photos}
          userId={userId}
          onChange={(photos) => onUpdate({ photos })}
        />
      </div>
    </div>
  );
}
