import { test } from "@playwright/test";
import path from "path";
import fs from "fs";

const OUT_DIR = path.join(process.cwd(), "responsive-screenshots");

const PAGES = [
  { name: "accueil", path: "/" },
  { name: "chalets", path: "/chalets" },
  { name: "devenir-hote", path: "/devenir-hote" },
  { name: "comment-ca-marche", path: "/comment-ca-marche" },
  { name: "faq-hotes", path: "/faq-hotes" },
  { name: "conditions", path: "/conditions" },
  { name: "tarifs", path: "/tarifs" },
  { name: "contact", path: "/contact" },
  { name: "login", path: "/login" },
];

test.beforeAll(() => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
});

for (const pg of PAGES) {
  test(`${pg.name}`, async ({ page }, testInfo) => {
    const viewport = testInfo.project.name; // 'mobile' ou 'tablet'
    const outPath = path.join(OUT_DIR, `${pg.name}-${viewport}.png`);

    await page.goto(pg.path);
    await page.waitForLoadState("networkidle");

    // Petite pause pour les animations CSS
    await page.waitForTimeout(400);

    await page.screenshot({ path: outPath, fullPage: true });
  });
}

// Capture de la barre de recherche avec calendrier ouvert (mobile seulement)
test("accueil — calendrier ouvert", async ({ page }, testInfo) => {
  if (testInfo.project.name !== "mobile") return;

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Ouvrir le calendrier
  const calBtn = page.locator("button", { hasText: /dates/i }).first();
  await calBtn.click();
  await page.waitForTimeout(300);

  await page.screenshot({
    path: path.join(OUT_DIR, "accueil-calendrier-mobile.png"),
    fullPage: false, // viewport seulement pour voir la position réelle
  });
});

// Capture du menu mobile ouvert (hamburger)
test("accueil — menu mobile ouvert", async ({ page }, testInfo) => {
  if (testInfo.project.name !== "mobile") return;

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Chercher le bouton hamburger
  const menuBtn = page.locator("button[aria-label*='menu'], button[aria-label*='Menu'], button svg").first();
  try {
    await menuBtn.click({ timeout: 3000 });
    await page.waitForTimeout(300);
  } catch {
    // Pas de menu hamburger trouvé, on capture quand même
  }

  await page.screenshot({
    path: path.join(OUT_DIR, "accueil-menu-mobile.png"),
    fullPage: false,
  });
});
