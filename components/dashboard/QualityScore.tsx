type FormData = {
  title: string;
  description: string;
  region: string;
  photos: { url: string; caption: string }[];
  amenities: string[];
  price_low: number;
  price_high: number;
};

function compute(data: FormData): { score: number; tips: string[] } {
  let score = 0;
  const tips: string[] = [];

  // Titre (15 pts)
  if (data.title.length >= 20) score += 15;
  else if (data.title.length >= 8) score += 8;
  else tips.push("Ajoutez un titre accrocheur (min. 20 caractères)");

  // Description (25 pts)
  if (data.description.length >= 300) score += 25;
  else if (data.description.length >= 150) score += 16;
  else if (data.description.length >= 50) score += 8;
  else tips.push("Rédigez une description détaillée (min. 150 caractères)");

  // Photos (30 pts)
  if (data.photos.length >= 8) score += 30;
  else if (data.photos.length >= 5) score += 20;
  else if (data.photos.length >= 3) score += 12;
  else if (data.photos.length >= 1) score += 5;
  else tips.push("Ajoutez au moins 3 photos de qualité");

  // Équipements (20 pts)
  if (data.amenities.length >= 8) score += 20;
  else if (data.amenities.length >= 5) score += 13;
  else if (data.amenities.length >= 3) score += 7;
  else tips.push("Renseignez vos équipements (min. 5 recommandé)");

  // Tarifs (10 pts)
  if (data.price_low > 0 && data.price_high > 0) score += 10;
  else if (data.price_low > 0) score += 5;
  else tips.push("Ajoutez vos tarifs par saison");

  return { score, tips: tips.slice(0, 3) };
}

function scoreColor(score: number) {
  if (score >= 80) return "bg-green-500";
  if (score >= 50) return "bg-yellow-400";
  return "bg-red-400";
}

function scoreLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Bon";
  if (score >= 40) return "Moyen";
  return "À améliorer";
}

export default function QualityScore({ data }: { data: FormData }) {
  const { score, tips } = compute(data);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      {/* Badge IA */}
      <div className="flex items-center gap-2 mb-4">
        <span className="bg-ai-light text-ai text-xs font-semibold px-2.5 py-1 rounded-full">
          ✦ Score IA
        </span>
      </div>

      {/* Score */}
      <div className="flex items-end gap-2 mb-2">
        <span className="text-4xl font-bold text-gray-900">{score}</span>
        <span className="text-gray-400 text-sm mb-1">/ 100</span>
        <span
          className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${
            score >= 80
              ? "bg-green-50 text-green-700"
              : score >= 50
              ? "bg-yellow-50 text-yellow-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {scoreLabel(score)}
        </span>
      </div>

      {/* Bar */}
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${scoreColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Tips */}
      {tips.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Pour améliorer votre score
          </p>
          {tips.map((tip) => (
            <div key={tip} className="flex items-start gap-2 text-xs text-gray-600">
              <span className="text-yellow-400 mt-0.5 shrink-0">→</span>
              {tip}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-green-600 font-medium">
          🎉 Votre fiche est complète !
        </p>
      )}
    </div>
  );
}
