// Essais du texte d'invitation propre à un propriétaire : il remplace l'objet et le texte du modèle, jamais les relances. Aucune base.
// Lancer : npm run test:unit
import assert from "node:assert/strict";
import { test } from "node:test";

process.env.NEXT_PUBLIC_SITE_URL ??= "https://kabanalouer.ca";

const { cleanCustomBody, cleanCustomSubject } = await import("@/lib/claims/draftNotes");
const { sendDraftInvitationEmail } = await import("@/lib/emails/draftInvitation");
const { emailContext } = await import("@/lib/emails/emailContext");

const listings = [
  { title: "Villa Bianca", url: "https://kabanalouer.ca/apercu/x/1" },
  { title: "Grey Goose", url: "https://kabanalouer.ca/apercu/x/2" },
];

async function capture(kind: "draft_invite" | "draft_reminder_3", customText: { subject?: string; greeting?: string; body?: string } | null) {
  let out: { subject: string; html: string } | null = null;
  await emailContext.run({ capture: (e: { subject: string; html: string }) => (out = e) }, () =>
    sendDraftInvitationEmail({ to: "a@b.ca", lang: "fr", kind, listings, buttonUrl: "https://kabanalouer.ca/x", displayName: "Chalets Zenya", customText })
  );
  assert.ok(out);
  return out as { subject: string; html: string };
}

test("nettoyage : vide = rien, retours à la ligne gardés", () => {
  assert.equal(cleanCustomSubject("   "), null);
  assert.equal(cleanCustomBody(""), null);
  assert.equal(cleanCustomBody(" A\r\n\r\nB "), "A\n\nB");
  assert.equal(cleanCustomSubject("a\n b"), "a b");
});

test("l'invitation prend l'objet et le texte du propriétaire, repères remplis", async () => {
  const mail = await capture("draft_invite", { subject: "Bonjour de Simon : {nombre} chalets", greeting: "Allô Nicolas,", body: "Mon texte **à moi**\n\n{fiches}" });
  assert.ok(mail.html.includes("Allô Nicolas,"));
  assert.equal(mail.subject, "Bonjour de Simon : 2 chalets");
  assert.ok(mail.html.includes("Mon texte <strong>à moi</strong>"));
  assert.ok(mail.html.includes("Villa Bianca") && mail.html.includes("Grey Goose"));
  assert.ok(!mail.html.includes("Nous avons préparé"));
});

test("sans texte propre, le modèle sert", async () => {
  const mail = await capture("draft_invite", null);
  assert.equal(mail.subject, "Chalets Zenya sur Kabanalouer");
  assert.ok(mail.html.includes("Nous avons préparé"));
});

test("une relance ignore toujours le texte propre", async () => {
  const mail = await capture("draft_reminder_3", { subject: "Autre objet", body: "Autre texte" });
  assert.ok(!mail.subject.includes("Autre objet"));
  assert.ok(!mail.html.includes("Autre texte"));
});
