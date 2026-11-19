// Essais unitaires : noms de ville et slugs abrégés (st-/ste-). Lancer : npm run test:unit
import assert from "node:assert/strict";
import { test } from "node:test";

test("canonicalCityName : St/Ste étendus puis orthographe officielle", async () => {
  const { canonicalCityName } = await import("@/lib/normalizeCityName");
  assert.equal(canonicalCityName("St-Raymond"), "Saint-Raymond");
  assert.equal(canonicalCityName("Ste-Agathe-des-Monts"), "Sainte-Agathe-des-Monts");
  assert.equal(canonicalCityName("Saint Come"), "Saint-Côme");
  assert.equal(canonicalCityName("St-Denis-de-la-Bouteillerie"), "Saint-Denis-De La Bouteillerie");
  assert.equal(canonicalCityName("Stanstead"), "Stanstead");
  assert.equal(canonicalCityName("Mansonville"), "Mansonville");
});

test("expandSaintSlug : seulement les slugs abrégés", async () => {
  const { expandSaintSlug } = await import("@/lib/normalizeCityName");
  assert.equal(expandSaintSlug("st-raymond"), "saint-raymond");
  assert.equal(expandSaintSlug("ste-agathe-des-monts"), "sainte-agathe-des-monts");
  assert.equal(expandSaintSlug("saint-come"), null);
  assert.equal(expandSaintSlug("stoneham-et-tewkesbury"), null);
  assert.equal(expandSaintSlug("stanstead"), null);
});
