import { test } from "node:test";
import assert from "node:assert/strict";

test("un domaine d'entreprise est reconnu, une messagerie grand public non", async () => {
  const { companyDomain } = await import("@/lib/claims/emailMatch");
  assert.equal(companyDomain("josee@exitchalets.com"), "exitchalets.com");
  assert.equal(companyDomain("  Josee@ExitChalets.com "), "exitchalets.com");
  for (const e of ["a@gmail.com", "a@hotmail.com", "a@outlook.com", "a@videotron.ca", "a@yahoo.ca", "a@icloud.com", "a@axion.ca"]) {
    assert.equal(companyDomain(e), null, e);
  }
  for (const e of ["", "pas-une-adresse", "a@", "@exitchalets.com", "a@localhost"]) assert.equal(companyDomain(e), null, e);
});

test("motifs : adresse exacte, plus le domaine seulement pour une entreprise", async () => {
  const { claimEmailPatterns } = await import("@/lib/claims/emailMatch");
  assert.deepEqual(claimEmailPatterns("Info@ExitChalets.com"), ["info@exitchalets.com", "%@exitchalets.com"]);
  assert.deepEqual(claimEmailPatterns("proprio@gmail.com"), ["proprio@gmail.com"]);
  assert.deepEqual(claimEmailPatterns(""), []);
});

test("les jokers de ilike sont échappés dans l'adresse", async () => {
  const { claimEmailPatterns } = await import("@/lib/claims/emailMatch");
  assert.deepEqual(claimEmailPatterns("a_b%c@gmail.com"), ["a\\_b\\%c@gmail.com"]);
});
