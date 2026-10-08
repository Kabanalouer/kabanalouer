import { SITE_URL } from "@/lib/siteUrl";

// @id stables de l'Organization et du WebSite émis une seule fois dans
// app/layout.tsx : les autres blocs JSON-LD s'y réfèrent ({ "@id": … }) au
// lieu de redéclarer l'entité.
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
