import { test, expect, request } from "@playwright/test";

// ─── 1. Page d'accueil ────────────────────────────────────────────────────────

test.describe("Page d'accueil", () => {
  test("charge correctement et affiche la barre de recherche", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/kabanalouer/i);

    // Hero visible
    await expect(page.locator("h1")).toBeVisible();

    // Barre de recherche principale — input Destination du SearchBar hero
    const destinationInput = page.locator("input[placeholder='Destination']").first();
    await expect(destinationInput).toBeVisible();
  });

  test("la navbar est présente avec le logo", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav").first();
    await expect(nav).toBeVisible();
  });
});

// ─── 2. Page /chalets ─────────────────────────────────────────────────────────

test.describe("Page /chalets", () => {
  test("charge et affiche des annonces", async ({ page }) => {
    await page.goto("/chalets");
    await expect(page).toHaveTitle(/chalet/i);

    // Attendre que le contenu se charge
    await page.waitForLoadState("networkidle");

    // Les annonces sont des liens vers /chalets/<id>
    const listingLinks = page.locator("a[href^='/chalets/']");
    // OU message d'état vide
    const emptyState = page.getByText(/aucun résultat|aucune annonce|aucun chalet/i);

    const hasListings = await listingLinks.count() > 0;
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    // La page doit montrer soit des annonces soit un état vide — pas une erreur
    expect(hasListings || hasEmpty).toBeTruthy();
  });

  test("n'affiche pas d'erreur 500", async ({ page }) => {
    const response = await page.goto("/chalets");
    expect(response?.status()).not.toBe(500);
    expect(response?.status()).not.toBe(404);
  });
});

// ─── 3. Page /devenir-hote ───────────────────────────────────────────────────

test.describe("Page /devenir-hote", () => {
  test("charge et affiche les deux options de création", async ({ page }) => {
    await page.goto("/devenir-hote");
    await expect(page).toHaveTitle(/hôte|hote/i);

    // Option 1 — Créer manuellement
    await expect(
      page.getByText(/créer mon annonce|créer manuellement|créer vous-même/i).first()
    ).toBeVisible();

    // Option 2 — Importer depuis Airbnb
    await expect(
      page.getByText(/airbnb|importer/i).first()
    ).toBeVisible();
  });

  test("le formulaire d'import Airbnb s'ouvre en cliquant 'Importer mon annonce'", async ({ page }) => {
    await page.goto("/devenir-hote");

    // Le formulaire est caché derrière un bouton — il faut d'abord cliquer
    const importBtn = page.getByRole("button", { name: /importer mon annonce/i });
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    // Après le clic, le champ URL doit apparaître
    const urlInput = page.locator("input[type='url']");
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toHaveAttribute("placeholder", /airbnb/i);
  });
});

// ─── 4. Page /regions ─────────────────────────────────────────────────────────

test.describe("Page /regions", () => {
  test("charge et affiche les régions du Québec", async ({ page }) => {
    await page.goto("/regions");
    await expect(page).toHaveTitle(/région|region/i);

    // Quelques régions connues du Québec
    const regionsToCheck = ["Laurentides", "Québec", "Charlevoix"];
    for (const region of regionsToCheck) {
      await expect(page.getByText(new RegExp(region, "i")).first()).toBeVisible();
    }
  });

  test("les cartes de régions sont cliquables", async ({ page }) => {
    await page.goto("/regions");
    // Au moins un lien vers /chalets?region=... doit exister
    const regionLinks = page.locator("a[href*='/chalets']");
    expect(await regionLinks.count()).toBeGreaterThan(0);
  });
});

// ─── 5. Redirection vers /login pour non-connecté ────────────────────────────

test.describe("Authentification — redirection", () => {
  test("un non-connecté qui clique 'Ajouter un chalet' est redirigé vers /login", async ({ page }) => {
    await page.goto("/");

    // Chercher le bouton/lien d'ajout de chalet dans la navbar ou la page
    const addChaletLink = page.getByRole("link", { name: /ajouter un chalet|devenir hôte|créer une annonce/i }).first();

    if (await addChaletLink.isVisible()) {
      await addChaletLink.click();
      await page.waitForURL(/login|signup/i, { timeout: 10_000 });
      expect(page.url()).toMatch(/login|signup/i);
    } else {
      // Naviguer directement vers la page protégée
      await page.goto("/dashboard/listings/new");
      await page.waitForURL(/login/i, { timeout: 10_000 });
      expect(page.url()).toContain("/login");
    }
  });

  test("accès direct à /dashboard redirige vers /login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/login/i, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });
});

// ─── 6. Pages SEO — status 200 ───────────────────────────────────────────────

const seoPages = [
  { path: "/tarifs", label: "Tarifs" },
  { path: "/faq-hotes", label: "FAQ Hôtes" },
  { path: "/a-propos", label: "À propos" },
  { path: "/contact", label: "Contact" },
  { path: "/comment-ca-marche", label: "Comment ça marche" },
];

test.describe("Pages SEO — status 200", () => {
  for (const { path, label } of seoPages) {
    test(`${label} (${path}) retourne 200`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
    });

    test(`${label} (${path}) a un title non vide`, async ({ page }) => {
      await page.goto(path);
      const title = await page.title();
      expect(title.trim().length).toBeGreaterThan(0);
      expect(title).toMatch(/kabanalouer/i);
    });
  }
});

// ─── 7. Sitemap ───────────────────────────────────────────────────────────────

test.describe("Sitemap", () => {
  test("/sitemap.xml retourne status 200", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
  });

  test("/sitemap.xml est du XML valide avec des URLs", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    const body = await response.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("<loc>");
    expect(body).toContain("kabanalouer");
  });
});

// ─── 8. API /api/listings/geo ─────────────────────────────────────────────────

test.describe("API /api/listings/geo", () => {
  test("retourne status 200", async ({ request }) => {
    const response = await request.get("/api/listings/geo");
    expect(response.status()).toBe(200);
  });

  test("retourne du JSON valide", async ({ request }) => {
    const response = await request.get("/api/listings/geo");
    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType).toContain("application/json");

    const body = await response.json();
    // Doit être un tableau (même vide)
    expect(Array.isArray(body)).toBeTruthy();
  });
});
