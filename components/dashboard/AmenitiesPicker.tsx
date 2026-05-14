const AMENITIES_BY_CATEGORY: Record<string, string[]> = {
  "Eau & Détente": ["Bord du lac", "Quai / Dock", "Spa", "Sauna", "Piscine"],
  "Sports & Plein air": [
    "Ski alpin",
    "Ski de fond",
    "Raquettes",
    "Kayak / Canot",
    "Randonnée",
    "Vélos",
  ],
  "Intérieur": [
    "Foyer",
    "Billard",
    "Cinéma maison",
    "WiFi",
    "Lave-vaisselle",
    "Laveuse / Sécheuse",
  ],
  "Extérieur": ["BBQ", "Foyer extérieur", "Terrasse / Patio", "Jeux extérieurs"],
  "Pratique": [
    "Animaux acceptés",
    "Accessible PMR",
    "Stationnement",
    "Climatisation",
  ],
};

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
    <div className="space-y-5">
      {Object.entries(AMENITIES_BY_CATEGORY).map(([category, items]) => (
        <div key={category}>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
            {category}
          </h4>
          <div className="flex flex-wrap gap-2">
            {items.map((item) => {
              const active = selected.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggle(item)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                    active
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
