// Colonnes de `listings` lisibles par l'API publique de Supabase (rôles anon
// et authenticated) — voir supabase/protect-listing-private-columns.sql.
// Les colonnes privées (adresse exacte, lien iCal qui révèle les dates
// réservées, données brutes et lien de l'import Airbnb) ne se lisent qu'avec
// le client service, côté serveur, après une vérification de propriété.
//
// Toute nouvelle colonne de `listings` lue depuis une session doit être ajoutée
// ici ET dans le GRANT SELECT de la migration, sinon la requête échoue
// (« permission denied for table listings »). Ne jamais utiliser select("*")
// sur `listings` avec un client de session : la requête échouerait.
export const LISTING_PRIVATE_COLUMNS = ["address", "ical_url", "import_source_url", "import_raw_data"] as const;

export const LISTING_PUBLIC_COLUMNS = [
  "id", "host_id", "title", "description", "region", "capacity", "bedrooms", "bathrooms",
  "price_low", "price_high", "price_peak", "amenities", "photos", "is_published", "score", "created_at",
  "ical_last_sync", "city", "latitude", "longitude", "views_search", "views_listing", "citq_number",
  "checkin_time", "checkout_time", "dogs_allowed", "smoking_allowed", "checkin_type", "nearby_activities",
  "price_on_request", "min_age", "title_en", "description_en", "amenities_en", "nearby_activities_en",
  "slug_fr", "slug_en", "unpublished_reason", "unpublished_at", "reminder_winback_3d_sent",
  "reminder_winback_14d_sent", "import_source", "import_status", "photos_rights_confirmed",
  "quote_inclusions", "quote_exclusions", "quote_booking_instructions", "listing_number", "custom_slug",
  "previous_custom_slug", "dogs_max", "dogs_size_limit", "dogs_fee_type", "dogs_fee_amount",
  "reduced_mobility", "accessibility_features", "draft_reminder_sent_at", "content_updated_at",
].join(", ") as "*";
// « as "*" » : même typage que select("*") pour supabase-js (une chaîne non
// littérale produirait un type d'erreur) — la valeur réelle est bien la liste.
