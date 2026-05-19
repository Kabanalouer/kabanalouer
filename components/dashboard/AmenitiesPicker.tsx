const AMENITIES = [
  "Bord de l'eau",
  "Piscine intérieure",
  "Piscine extérieure",
  "Ski in / Ski out",
  "Situé sur un resort",
  "Spa",
  "Sauna",
  "Chalet en bois rond",
  "Foyer intérieur au bois",
  "Foyer extérieur (firepit)",
  "BBQ",
  "Table de billard",
  "Babyfoot",
  "Table de ping-pong",
  "Arcades",
  "Jeux de société",
  "Livres et Revues",
  "Gym",
  "Wifi",
  "Espace de travail dédié (télétravail)",
  "Climatisation",
  "Télévision avec câble",
  "Télévision intelligente",
  "Système audio (musique)",
  "Cuisine complète avec vaisselle et chaudrons",
  "Literie et serviettes incluses",
  "Buanderie",
  "Terrasse",
  "Module de jeux pour enfant",
  "Borne de recharge pour véhicule électrique",
];

export default function AmenitiesPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (amenities: string[]) => void;
}) {
  const toggle = (amenity: string) => {
    if (selected.includes(amenity)) {
      onChange(selected.filter((a) => a !== amenity));
    } else {
      onChange([...selected, amenity]);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {AMENITIES.map((item) => {
        const active = selected.includes(item);
        return (
          <label
            key={item}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
              active
                ? "border-primary bg-primary-50 text-primary"
                : "border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
          >
            <input
              type="checkbox"
              checked={active}
              onChange={() => toggle(item)}
              className="sr-only"
            />
            <div
              className={`w-4 h-4 rounded shrink-0 flex items-center justify-center border-2 transition-colors ${
                active ? "bg-primary border-primary" : "border-gray-300"
              }`}
            >
              {active && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 6l3 3 5-5" />
                </svg>
              )}
            </div>
            <span className={`text-sm ${active ? "font-medium" : ""}`}>{item}</span>
          </label>
        );
      })}
    </div>
  );
}
