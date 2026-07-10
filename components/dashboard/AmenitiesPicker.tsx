import { AMENITY_GROUPS } from "@/lib/amenities";

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
    <div className="space-y-6">
      {AMENITY_GROUPS.map(({ label, items }) => (
        <div key={label}>
          <h4 className="text-xs font-semibold text-charcoal-400 tracking-wide mb-3">
            {label}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {items.map((item) => {
              const active = selected.includes(item);
              return (
                <label
                  key={item}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                    active
                      ? "border-primary bg-primary-50 text-primary"
                      : "border-charcoal-100 text-charcoal-700 hover:border-primary/40"
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
                      active ? "bg-primary border-primary" : "border-charcoal-300"
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
        </div>
      ))}
    </div>
  );
}
