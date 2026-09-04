// TPS (5%, Canada) + TVQ (9,975%, Québec) — objets Stripe créés uniquement en
// mode Production (les taux de taxe sont spécifiques au mode, contrairement
// aux Price IDs : pas d'équivalent test pour l'instant). Appliqués seulement
// en prod, comme les Price IDs (voir lib/subscriptionPricing.ts pour le choix
// de VERCEL_ENV) — undefined en test/dev, donc aucune taxe ajoutée là.
const isProdEnv = process.env.VERCEL_ENV === "production";

export const STRIPE_TAX_RATE_IDS: string[] | undefined = isProdEnv
  ? ["txr_1UBv1gIRwZDgRnpbiwUXkMCp", "txr_1UBv3PIRwZDgRnpbGpby6teZ"]
  : undefined;
