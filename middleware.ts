import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Exclut : /api/*, /auth/*, /_next/*, /vercel/*, et les fichiers statiques
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)", "/"],
};
