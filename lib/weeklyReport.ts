import Anthropic from "@anthropic-ai/sdk";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getPlatformHealth, type PlatformHealth } from "@/lib/platformHealth";
import { BOOSTS_ENABLED } from "@/lib/featuredConfig";
import { LAUNCH_OFFER_END, isLaunchOfferActive } from "@/lib/launchOffer";
import { sendWeeklyReportEmail } from "@/lib/emails/weeklyReport";

// Rapport du lundi (cron /api/cron/weekly-report, Admin → Rapports) : les
// chiffres des 7 derniers jours (Santé de la plateforme, tunnels, erreurs)
// analysés par Claude → 3 problèmes, 3 recommandations, diagnostic des
// erreurs ouvertes et suivi des recommandations de la semaine précédente.
// Enregistré dans weekly_reports puis envoyé par courriel à Simon.

export const REPORT_MODEL = "claude-opus-5-5";

export type WeeklyReport = {
  resume: string;
  problemes: { titre: string; preuve: string; gravite: "haute" | "moyenne" | "basse" }[];
  recommandations: { titre: string; pourquoi: string; action: string; impact: "fort" | "moyen" | "faible"; effort: "petit" | "moyen" | "gros" }[];
  erreurs: { message: string; diagnostic: string; action: "corriger" | "ignorer" | "surveiller" }[];
  suivi: string;
};

type ErrorRow = { message: string; source: string; path: string | null; count: number; first_seen_at: string; last_seen_at: string; resolved_at: string | null; ignored: boolean };

function admin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function collectMetrics(now: number) {
  const db = admin();
  const weekAgo = new Date(now - 7 * 86_400_000).toISOString();
  const [health, errorsRes, previousRes] = await Promise.all([
    getPlatformHealth(7),
    db.from("error_groups").select("message, source, path, count, first_seen_at, last_seen_at, resolved_at, ignored").order("last_seen_at", { ascending: false }).limit(200),
    db.from("weekly_reports").select("created_at, report").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const errors = ((errorsRes.data ?? []) as ErrorRow[]).filter((e) => !e.ignored);
  const h: PlatformHealth = health;
  return {
    periode: "7 derniers jours, comparés aux 7 jours précédents",
    contexte: {
      offre_de_lancement: isLaunchOfferActive() ? `active jusqu'au ${LAUNCH_OFFER_END} (première année gratuite pour les proprios)` : "terminée",
      boosts: BOOSTS_ENABLED ? "actifs" : "désactivés pour le lancement (ne pas les recommander)",
    },
    reponse_des_proprios: h.trust,
    offre: h.supply,
    demande: h.demand,
    avis: h.reviews,
    tunnels: h.funnels,
    a_surveiller: {
      demandes_sans_reponse: h.watch.unanswered.map((c) => ({ chalet: c.listingTitle, attente_heures: c.ageHours })),
      brouillons_abandonnes: h.watch.abandonedDrafts.map((d) => ({ titre: d.title, jours: d.ageDays })),
      annonces_sans_demande_30_jours: h.watch.quietListings.map((l) => ({ titre: l.title, en_ligne_depuis_jours: l.publishedDays })),
    },
    erreurs: {
      ouvertes: errors.filter((e) => !e.resolved_at).slice(0, 15).map((e) => ({ message: e.message.slice(0, 300), source: e.source, page: e.path, fois: e.count, depuis: e.first_seen_at })),
      nouvelles_cette_semaine: errors.filter((e) => e.first_seen_at >= weekAgo).length,
    },
    rapport_precedent: previousRes.data
      ? { date: previousRes.data.created_at, recommandations: (previousRes.data.report as WeeklyReport).recommandations?.map((r) => r.titre) ?? [] }
      : null,
  };
}

const SYSTEM = `Tu es l'analyste produit de Kabanalouer, une place de marché québécoise de location de chalets : les proprios paient un abonnement annuel fixe pour afficher leur chalet, aucune commission sur les séjours, aucuns frais pour les voyageurs ; voyageurs et proprios s'écrivent directement et s'entendent entre eux (pas de paiement de séjour sur le site). La plateforme est toute jeune : les volumes sont très faibles, et quelques comptes de test sont comptés comme les autres.

Chaque lundi, tu lis les chiffres de la semaine et tu écris un rapport court, en français québécois naturel, en tutoyant Simon, le fondateur (non développeur). Règles :
- Chaque problème et chaque recommandation s'appuie sur un chiffre précis tiré des données. Jamais d'invention.
- Avec de petits nombres, ne conclus pas à une tendance : dis-le clairement (« trop peu de données pour conclure »).
- Recommandations concrètes et faisables cette semaine, classées par impact. Pas de conseils génériques.
- Pour chaque erreur ouverte, propose un diagnostic probable à partir du message et de la page, et une action : corriger, ignorer (bruit, robot, service externe) ou surveiller.
- Si un rapport précédent existe, dis en une ou deux phrases si ses recommandations semblent avoir eu un effet, sinon laisse « suivi » vide.
- Moins de 3 problèmes ou recommandations s'il n'y en a pas assez de solides.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de cette forme :
{"resume": "2 ou 3 phrases", "problemes": [{"titre": "", "preuve": "", "gravite": "haute|moyenne|basse"}], "recommandations": [{"titre": "", "pourquoi": "", "action": "", "impact": "fort|moyen|faible", "effort": "petit|moyen|gros"}], "erreurs": [{"message": "", "diagnostic": "", "action": "corriger|ignorer|surveiller"}], "suivi": ""}`;

// Typographie française du site : espace fine insécable avant ? ! ; et insécable avant :
function frTypo(value: string): string {
  return value.replace(/ ([?!;])/g, "\u202F$1").replace(/ :/g, "\u00A0:");
}

function deepTypo<T>(value: T): T {
  if (typeof value === "string") return frTypo(value) as T;
  if (Array.isArray(value)) return value.map(deepTypo) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, deepTypo(v)])) as T;
  return value;
}

function parseReport(text: string): WeeklyReport {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const raw = deepTypo(JSON.parse(text.slice(start, end + 1)) as Partial<WeeklyReport>);
  return {
    resume: raw.resume ?? "",
    problemes: (raw.problemes ?? []).slice(0, 3),
    recommandations: (raw.recommandations ?? []).slice(0, 3),
    erreurs: (raw.erreurs ?? []).slice(0, 10),
    suivi: raw.suivi ?? "",
  };
}

// Chiffres + analyse, sans rien enregistrer ni envoyer.
export async function analyzeWeek(now: number): Promise<{ metrics: Awaited<ReturnType<typeof collectMetrics>>; report: WeeklyReport | null }> {
  const metrics = await collectMetrics(now);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await anthropic.messages.create({
    model: REPORT_MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{ role: "user", content: `Chiffres de la semaine (JSON) :\n${JSON.stringify(metrics, null, 2)}` }],
  });
  const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  try {
    return { metrics, report: parseReport(text) };
  } catch {
    return { metrics, report: null };
  }
}

export async function generateWeeklyReport({ sendEmail = true }: { sendEmail?: boolean } = {}): Promise<{ id: number | null; error: string | null }> {
  const now = Date.now();
  const { metrics, report } = await analyzeWeek(now);
  if (!report) return { id: null, error: "Réponse de l'IA illisible (JSON invalide)." };

  const { data, error } = await admin()
    .from("weekly_reports")
    .insert({
      period_start: new Date(now - 7 * 86_400_000).toISOString(),
      period_end: new Date(now).toISOString(),
      metrics,
      report,
      model: REPORT_MODEL,
    })
    .select("id")
    .single();
  if (error) return { id: null, error: `Enregistrement impossible : ${error.message}` };

  if (sendEmail) {
    const { error: mailError } = await sendWeeklyReportEmail(report);
    if (mailError) return { id: data.id as number, error: `Rapport enregistré, courriel non envoyé : ${mailError.message}` };
  }
  return { id: data.id as number, error: null };
}
