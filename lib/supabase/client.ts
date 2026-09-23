import { createBrowserClient } from "@supabase/ssr";

// postgrest-js n'envoie aucune option `cache` avec ses fetch() (confirmé dans
// node_modules/@supabase/postgrest-js/src/PostgrestBuilder.ts), et Supabase
// ne renvoie aucun header Cache-Control sur ses réponses REST — le navigateur
// peut donc servir une réponse GET mise en cache au lieu de refaire une vraie
// requête réseau tant que l'onglet reste ouvert (reproduit en direct : un
// composant remonté sans rechargement de page pouvait afficher une valeur
// périmée juste après une écriture confirmée en base). `cache: "no-store"`
// force chaque lecture à toujours passer par le réseau.
function noStoreFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, { ...init, cache: "no-store" });
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: noStoreFetch } }
  );
}
