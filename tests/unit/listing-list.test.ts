import assert from "node:assert/strict";
import { test } from "node:test";

const { listingBullets, othersLabel } = await import("@/lib/emails/listingList");

const items = ["<a>A</a>", "<a>B</a>", "<a>C</a>", "<a>D</a>", "<a>E</a>"];

test("3 fiches ou moins : toutes listées, sans lien « autres fiches »", () => {
  const html = listingBullets(items.slice(0, 3));
  assert.equal(html.split("•").length - 1, 3);
  assert.ok(!html.includes("Voir"));
});

test("4 fiches ou plus : 3 puces seulement, puis le lien sans puce", () => {
  const html = listingBullets(items, "<a>Voir mes 2 autres fiches</a>");
  assert.equal(html.split("•").length - 1, 3);
  assert.ok(!html.includes("<a>D</a>") && !html.includes("<a>E</a>"));
  assert.ok(html.endsWith("<a>Voir mes 2 autres fiches</a></span>"));
});

test("libellé du lien : singulier et pluriel, FR et EN", () => {
  assert.equal(othersLabel(1, true), "Voir mon autre fiche");
  assert.equal(othersLabel(7, true), "Voir mes 7 autres fiches");
  assert.equal(othersLabel(1, false), "See my other listing");
  assert.equal(othersLabel(2, false), "See my 2 other listings");
});
