import Image from "next/image";
import ContactButton from "./ContactButton";

function responseSpeedLabel(avgMs: number): string {
  if (avgMs < 3_600_000) return "Répond dans l'heure";
  if (avgMs < 14_400_000) return "Répond en quelques heures";
  return "Répond en 1 jour";
}

function seniority(createdAt: string): string {
  const months =
    (new Date().getFullYear() - new Date(createdAt).getFullYear()) * 12 +
    (new Date().getMonth() - new Date(createdAt).getMonth());
  if (months < 1) return "Nouveau";
  if (months < 12) return `${months} mois en tant qu'hôte`;
  const y = Math.floor(months / 12);
  return `${y} an${y > 1 ? "s" : ""} en tant qu'hôte`;
}

interface Props {
  host: { id: string; name: string; avatar_url: string; created_at: string };
  reviewCount: number;
  avgRating: number;
  responseRate: number | null;
  avgResponseMs: number | null;
  listingId: string;
  listingTitle: string;
  currentUserId: string | null;
  isOwner?: boolean;
}

export default function HostCard({
  host, reviewCount, avgRating, responseRate, avgResponseMs,
  listingId, listingTitle, currentUserId, isOwner,
}: Props) {
  return (
    <div>
      <h2 className="font-semibold text-charcoal-800 mb-5">Faites connaissance avec votre hôte</h2>

      <div className="flex flex-col sm:flex-row gap-5">
        {/* ── Left: host card ── */}
        <div className="bg-charcoal-50 rounded-2xl p-6 flex flex-col items-center text-center sm:w-56 shrink-0">
          <div className="w-24 h-24 rounded-full bg-primary overflow-hidden flex items-center justify-center mb-3">
            {host.avatar_url ? (
              <Image
                src={host.avatar_url}
                alt={host.name}
                width={96}
                height={96}
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-white font-bold text-3xl">
                {(host.name?.[0] ?? "?").toUpperCase()}
              </span>
            )}
          </div>

          <p className="font-bold text-xl text-charcoal-800 leading-tight">
            {host.name?.split(" ")[0] ?? "Hôte"}
          </p>
          <p className="text-sm text-charcoal-400 mb-5">Hôte</p>

          {/* Stats */}
          <div className="w-full border-t border-[#ebebeb] pt-4 space-y-2.5">
            {reviewCount > 0 ? (
              <div className="text-sm text-charcoal-700">
                <span className="font-bold text-charcoal-800 text-base">{reviewCount}</span>
                <span className="text-charcoal-400 ml-1">avis</span>
              </div>
            ) : (
              <div className="text-sm text-charcoal-400">Aucun avis</div>
            )}
            {avgRating > 0 && (
              <div className="flex items-center justify-center gap-1 text-sm text-charcoal-700">
                <svg className="w-4 h-4 text-yellow-400 fill-current shrink-0" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-bold text-charcoal-800 text-base">{avgRating.toFixed(1)}</span>
                <span className="text-charcoal-400">/ 5</span>
              </div>
            )}
            <div className="text-sm text-charcoal-500">{seniority(host.created_at)}</div>
          </div>
        </div>

        {/* ── Right: info + contact ── */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-charcoal-800 mb-4">Informations sur l&apos;hôte</h3>
          <div className="space-y-3 mb-6 text-sm text-charcoal-700">
            {responseRate !== null && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>
                  Taux de réponse :{" "}
                  <span className="font-semibold">{responseRate}&nbsp;%</span>
                </span>
              </div>
            )}
            {avgResponseMs !== null && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                </svg>
                <span>{responseSpeedLabel(avgResponseMs)}</span>
              </div>
            )}
          </div>
          {isOwner ? (
            <button disabled className="w-full py-3 rounded-full bg-charcoal-50 text-charcoal-300 font-medium text-sm cursor-not-allowed">
              C&apos;est votre chalet
            </button>
          ) : (
            <ContactButton
              listingId={listingId}
              hostId={host.id}
              hostName={host.name ?? "l'hôte"}
              listingTitle={listingTitle}
              currentUserId={currentUserId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
