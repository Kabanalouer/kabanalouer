// Essais unitaires des pages thème : prix, percentiles et diversité des 24 premières fiches. Aucune base.
// Lancer : npm run test:unit
import assert from "node:assert/strict";
import { test } from "node:test";

const { computeStats, percentile, pickDiverse, trimExtremes, visibleAccessChips } = await import("@/lib/themeStats");
type Row = import("@/lib/themeStats").ThemeRow;

function row(i: number, over: Partial<Row> = {}): Row {
  return {
    id: `id-${i}`, title: `Chalet ${i}`, titleEn: null, region: "Laurentides", city: "Labelle",
    price: 100 + i, priceOnRequest: false, capacity: 4, bedrooms: 2, photos: ["https://example.test/a.webp"],
    listingNumber: i, customSlug: null, lat: null, lng: null, rank: 0, score: 100 - i, createdAt: `2026-01-${String(i % 28 + 1).padStart(2, "0")}`,
    ownerKey: `owner-${i}`, direct: true, lake: false, lakeAccess: null, beach: false, boats: false, dogs: false,
    spa: false, spaAccess: null, spaPlaces: null, spaYear: null, sauna: false,
    dogMax: null, dogSize: null, dogFee: null, dogFeeAmount: null,
    ...over,
  };
}

test("trimExtremes : aucun retrait sous 20 fiches, 5 % de chaque côté au-delà", () => {
  assert.deepEqual(trimExtremes([1, 2, 3]), [1, 2, 3]);
  const forty = Array.from({ length: 40 }, (_, i) => i + 1);
  const trimmed = trimExtremes(forty);
  assert.equal(trimmed.length, 36);
  assert.equal(trimmed[0], 3);
});

test("percentile : rang le plus proche", () => {
  const sorted = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  assert.equal(percentile(sorted, 10), 10);
  assert.equal(percentile(sorted, 90), 90);
  assert.equal(percentile([], 50), null);
});

test("pickDiverse : au plus 2 fiches du même exploitant parmi les 24 premières", () => {
  const rows = [
    ...Array.from({ length: 65 }, (_, i) => row(i, { ownerKey: "gros-exploitant" })),
    ...Array.from({ length: 30 }, (_, i) => row(100 + i)),
  ];
  const top = pickDiverse(rows);
  assert.equal(top.length, 24);
  const perOwner = new Map<string, number>();
  top.forEach((r) => perOwner.set(r.ownerKey, (perOwner.get(r.ownerKey) ?? 0) + 1));
  assert.ok(Math.max(...perOwner.values()) <= 2);
});

test("pickDiverse : complète avec les fiches suivantes quand il manque d'exploitants", () => {
  const rows = Array.from({ length: 10 }, (_, i) => row(i, { ownerKey: "seul" }));
  assert.equal(pickDiverse(rows).length, 10);
});

test("computeStats : prix de départ sans les extrêmes, pastilles de plus de 5 fiches seulement", () => {
  const rows = [
    ...Array.from({ length: 30 }, (_, i) => row(i, { price: 150 + i })),
    row(99, { price: 20, beach: true }),
    ...Array.from({ length: 5 }, (_, i) => row(200 + i, { beach: true })),
  ];
  const s = computeStats(rows, "2026-11-27T00:00:00.000Z");
  assert.equal(s.count, 36);
  assert.equal(s.priceMinRaw, 20);
  assert.ok((s.priceMin ?? 0) > 20, "le prix aberrant est retiré");
  assert.equal(s.byAccess.beach, 6);
  assert.ok(visibleAccessChips(s).includes("beach"));
  assert.ok(!visibleAccessChips(s).includes("boats"));
});
