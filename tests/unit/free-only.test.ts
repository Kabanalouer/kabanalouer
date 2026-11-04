import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Kabanalouer est toujours gratuit pour les propriétaires : aucun abonnement, aucun prix annuel, aucune « offre ».
// Ce test échoue si un texte affiché (messages FR/EN, page /devenir-hote) y revient. Les seules options payantes
// possibles sont les boosts (lib/featuredConfig.ts), jamais un abonnement.

const FORBIDDEN = /abonnement|subscription|\b(299|249|199|399|29900)\b|\/\s?(an|année|year)\b|per year|par ann[ée]e|annual|annuel|première année|first year|launch offer|offre de lancement/i;

function strings(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => strings(v, `${path}[${i}]`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => strings(v, `${path}.${k}`));
  return [];
}

// « Nuits louées par année » (calculatrice de la page Tarifs) parle de location, pas d'un prix de Kabanalouer
const ALLOWED = new Set<string>([".tarifs.nightsLabel"]);

for (const lang of ["fr", "en"] as const) {
  test(`textes ${lang} : aucun abonnement ni prix annuel`, () => {
    const messages = JSON.parse(readFileSync(new URL(`../../messages/${lang}.json`, import.meta.url), "utf8"));
    const hits = strings(messages).filter(([path, text]) => FORBIDDEN.test(text) && !ALLOWED.has(path) && !/nightsLabel|Nuits louées|Nights rented/i.test(text));
    assert.deepEqual(hits.map(([p, t]) => `${lang}${p}: ${t.slice(0, 80)}`), []);
  });
}

test("code : aucun montant d'abonnement ni module de tarifs d'abonnement", () => {
  for (const file of ["lib/devenirHoteContent.ts"]) {
    const src = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
    // « Nuits louées par année » (libellé de la calculatrice) parle de location, pas d'un prix de Kabanalouer
    assert.doesNotMatch(src.replace(/nightsLabel: "[^"]*",/g, ""), FORBIDDEN, file);
  }
});
