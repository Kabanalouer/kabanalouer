// Essais unitaires de « Retirer mes fiches » : quelles fiches un jeton de retrait permet de retirer. Aucune base.
// Lancer : npm run test:unit
import assert from "node:assert/strict";
import { test } from "node:test";

process.env.NEXT_PUBLIC_SITE_URL ??= "https://kabanalouer.ca";

const { removeTokenListingIds, selectRemovalIds } = await import("@/lib/claims/tokens");

const A = "00000000-0000-4000-8000-000000000001";
const B = "00000000-0000-4000-8000-000000000002";
const C = "00000000-0000-4000-8000-000000000003";

const single = { listing_id: A, listing_ids: null };
const multi = { listing_id: A, listing_ids: [A, B, C] };

test("un jeton classique couvre sa seule fiche", () => {
  assert.deepEqual(removeTokenListingIds(single), [A]);
});

test("un jeton « mes fiches » couvre toutes ses fiches, sans doublon", () => {
  assert.deepEqual(removeTokenListingIds(multi), [A, B, C]);
  assert.deepEqual(removeTokenListingIds({ listing_id: A, listing_ids: [A, A, B] }), [A, B]);
});

test("un jeton sans fiche ne couvre rien", () => {
  assert.deepEqual(removeTokenListingIds({ listing_id: null, listing_ids: null }), []);
  assert.equal(selectRemovalIds({ listing_id: null, listing_ids: null }, [A]), null);
});

test("une seule fiche couverte : la sélection est ignorée, la fiche est retirée", () => {
  assert.deepEqual(selectRemovalIds(single, undefined), [A]);
  assert.deepEqual(selectRemovalIds(single, [B]), [A]);
});

test("plusieurs fiches : seules les fiches cochées sont retirées, les autres restent", () => {
  assert.deepEqual(selectRemovalIds(multi, [C, A]), [A, C]);
  assert.deepEqual(selectRemovalIds(multi, [B]), [B]);
  assert.deepEqual(selectRemovalIds(multi, [A, B, C]), [A, B, C]);
});

test("plusieurs fiches : aucune sélection = refus (jamais « tout retirer » par défaut)", () => {
  assert.equal(selectRemovalIds(multi, undefined), null);
  assert.equal(selectRemovalIds(multi, []), null);
  assert.equal(selectRemovalIds(multi, "tout"), null);
  assert.equal(selectRemovalIds(multi, null), null);
});

test("plusieurs fiches : une fiche étrangère au jeton fait refuser toute la demande", () => {
  const stranger = "00000000-0000-4000-8000-0000000000ff";
  assert.equal(selectRemovalIds(multi, [A, stranger]), null);
  assert.equal(selectRemovalIds(multi, [stranger]), null);
});
