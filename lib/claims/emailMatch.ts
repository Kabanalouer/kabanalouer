// Fiches non activées qui appartiennent à l'adresse d'un compte : la même adresse, ou une autre adresse du même
// nom de domaine d'entreprise (josee@exitchalets.com pour info@exitchalets.com). Jamais pour une messagerie
// grand public (gmail.com, hotmail.com, videotron.ca…) : n'importe qui pourrait alors prendre les fiches d'un autre.

const PUBLIC_MAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
  "hotmail.com", "hotmail.ca", "hotmail.fr", "outlook.com", "outlook.ca", "outlook.fr", "live.com", "live.ca", "live.fr", "msn.com",
  "yahoo.com", "yahoo.ca", "yahoo.fr", "ymail.com", "rocketmail.com",
  "icloud.com", "me.com", "mac.com",
  "aol.com", "mail.com", "gmx.com", "gmx.fr", "yandex.com", "zoho.com", "qq.com",
  "protonmail.com", "proton.me", "pm.me",
  "videotron.ca", "videotron.qc.ca", "bell.net", "sympatico.ca", "bellnet.ca", "cgocable.ca", "telus.net", "cooptel.qc.ca",
  "axion.ca", "globetrotter.net", "oricom.ca", "eastlink.ca", "shaw.ca", "rogers.com",
]);

// Un domaine d'entreprise, ou null pour une adresse invalide ou une messagerie grand public
export function companyDomain(email: string): string | null {
  const m = /^[^@\s]+@([a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+)$/.exec(email.trim().toLowerCase());
  if (!m) return null;
  return PUBLIC_MAIL_DOMAINS.has(m[1]) ? null : m[1];
}

// Les motifs `ilike` : l'adresse exacte, puis « n'importe qui @ domaine d'entreprise » ; caractères joker échappés
export function claimEmailPatterns(email: string): string[] {
  const exact = email.trim().toLowerCase();
  if (!exact) return [];
  const escape = (s: string) => s.replace(/[\\%_]/g, "\\$&");
  const domain = companyDomain(exact);
  return domain ? [escape(exact), `%@${escape(domain)}`] : [escape(exact)];
}
