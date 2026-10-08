-- Colonnes privées de listings (audit de sécurité du 2026-10-08) : adresse
-- exacte, lien iCal (révèle les dates réservées), lien et données brutes de
-- l'import Airbnb. L'API publique (anon, authenticated) ne lit plus que les
-- colonnes listées ci-dessous — même liste que LISTING_PUBLIC_COLUMNS dans
-- lib/listingColumns.ts. Une nouvelle colonne lue par une session doit être
-- ajoutée aux deux endroits. Les écritures (UPDATE/INSERT) ne changent pas.

REVOKE SELECT ON public.listings FROM anon, authenticated;
GRANT SELECT (id, host_id, title, description, region, capacity, bedrooms, bathrooms, price_low, price_high, price_peak, amenities, photos, is_published, score, created_at, ical_last_sync, city, latitude, longitude, views_search, views_listing, citq_number, checkin_time, checkout_time, dogs_allowed, smoking_allowed, checkin_type, nearby_activities, price_on_request, min_age, title_en, description_en, amenities_en, nearby_activities_en, slug_fr, slug_en, unpublished_reason, unpublished_at, reminder_winback_3d_sent, reminder_winback_14d_sent, import_source, import_status, photos_rights_confirmed, quote_inclusions, quote_exclusions, quote_booking_instructions, listing_number, custom_slug, previous_custom_slug, dogs_max, dogs_size_limit, dogs_fee_type, dogs_fee_amount, reduced_mobility, accessibility_features, draft_reminder_sent_at, content_updated_at) ON public.listings TO anon, authenticated;
