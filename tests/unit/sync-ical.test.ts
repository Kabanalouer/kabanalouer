// Essais de la synchro iCal du cron : un 429 ou un délai dépassé du fournisseur n'est qu'un avertissement, les calendriers se lisent un à la fois. Aucune vraie base ni réseau.
// Lancer : npm run test:unit
import assert from "node:assert/strict";
import { test } from "node:test";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
process.env.CRON_SECRET = "secret-test";

const ICS = "BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:20270101\nDTEND;VALUE=DATE:20270103\nEND:VEVENT\nEND:VCALENDAR\n";
const LISTINGS = [
  { id: "a", ical_url: "https://cal.test/429.ics" },
  { id: "b", ical_url: "https://cal.test/ok.ics" },
  { id: "c", ical_url: "https://cal.test/500.ics" },
  { id: "d", ical_url: "https://cal.test/timeout.ics" },
];

const { GET } = await import("@/app/api/sync-ical/route");

test("un 429 est un avertissement, une autre erreur reste une erreur, et les lectures ne se chevauchent pas", async () => {
  const realFetch = globalThis.fetch;
  const realWarn = console.warn;
  const realError = console.error;
  const warnings: string[] = [];
  const errors: string[] = [];
  console.warn = (...args: unknown[]) => void warnings.push(args.join(" "));
  console.error = (...args: unknown[]) => void errors.push(args.join(" "));

  let inFlight = 0;
  let maxInFlight = 0;
  const calendarOrder: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.startsWith("https://supabase.test")) {
      const isList = url.includes("/rest/v1/listings") && url.includes("select=id%2Cical_url");
      return new Response(isList ? JSON.stringify(LISTINGS) : "[]", { status: 200, headers: { "content-type": "application/json" } });
    }
    calendarOrder.push(url);
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 20));
    inFlight--;
    if (url.endsWith("/429.ics")) return new Response("Too Many Requests", { status: 429 });
    if (url.endsWith("/500.ics")) return new Response("boom", { status: 500 });
    if (url.endsWith("/timeout.ics")) throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    return new Response(ICS, { status: 200 });
  }) as typeof fetch;

  try {
    const res = await GET(new Request("https://kabanalouer.ca/api/sync-ical", { headers: { authorization: "Bearer secret-test" } }) as never);
    const body = await res.json();
    assert.deepEqual(body, { ok: true, synced: 1, total: 4 });
  } finally {
    globalThis.fetch = realFetch;
    console.warn = realWarn;
    console.error = realError;
  }

  assert.deepEqual(calendarOrder, LISTINGS.map((l) => l.ical_url));
  assert.equal(maxInFlight, 1, "un seul calendrier à la fois");
  assert.equal(warnings.length, 2);
  assert.match(warnings[0], /429/);
  assert.match(warnings[1], /délai dépassé/);
  assert.equal(errors.filter((e) => e.includes("429")).length, 0, "un 429 ne déclenche pas d'alerte");
  assert.equal(errors.filter((e) => e.includes("délai") || e.includes("timeout")).length, 0, "un délai dépassé ne déclenche pas d'alerte");
  assert.equal(errors.filter((e) => e.includes("HTTP 500")).length, 1, "une vraie erreur alerte toujours");
});
