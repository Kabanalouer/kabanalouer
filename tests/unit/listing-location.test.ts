// Essais unitaires : localisation valide d'une fiche et suggestion de ville. Lancer : npm run test:unit
import assert from "node:assert/strict";
import { test } from "node:test";

test("locationProblem : ville officielle et région cohérente", async () => {
  const { locationProblem } = await import("@/lib/listingLocation");
  assert.equal(locationProblem("Saint-Raymond", "Québec (ville et région)"), null);
  assert.equal(locationProblem("Chertsey", "Lanaudière"), null);
  assert.equal(locationProblem("Notre-Dame-de-Pontmain", "Laurentides"), null);
});

test("locationProblem : ville vide ou non officielle → city", async () => {
  const { locationProblem } = await import("@/lib/listingLocation");
  assert.equal(locationProblem(null, "Lanaudière"), "city");
  assert.equal(locationProblem("", "Lanaudière"), "city");
  assert.equal(locationProblem("St-Raymond", "Québec (ville et région)"), "city");
  assert.equal(locationProblem("Deauville", "Estrie (Cantons-de-l'Est)"), "city");
  assert.equal(locationProblem("autre", "Mauricie"), "city");
});

test("locationProblem : région vide → region, région qui ne correspond pas → mismatch", async () => {
  const { locationProblem } = await import("@/lib/listingLocation");
  assert.equal(locationProblem("Saint-Raymond", ""), "region");
  assert.equal(locationProblem("Saint-Raymond", null), "region");
  assert.equal(locationProblem("Notre-Dame-de-Pontmain", "Outaouais"), "mismatch");
  assert.equal(locationProblem("Causapscal", "Gaspésie–Îles-de-la-Madeleine"), "mismatch");
});

test("suggestCityFromText : seulement une municipalité officielle lue au début d'un paragraphe", async () => {
  const { suggestCityFromText } = await import("@/lib/listingLocation");
  assert.equal(suggestCityFromText("À Chertsey, ce chalet occupe un emplacement en bordure du lac Brûlé."), "Chertsey");
  assert.equal(suggestCityFromText("À Saint-Mathieu-du-Parc, en Mauricie, cette maison de campagne."), "Saint-Mathieu-du-Parc");
  assert.equal(suggestCityFromText("À St-Raymond, au bord de la rivière."), "Saint-Raymond");
  assert.equal(suggestCityFromText("À quelques minutes du lac, ce chalet est calme."), null);
  assert.equal(suggestCityFromText(null), null);
});

test("officialMunicipalityFromPlaceName : le nom abrégé de Google Places trouve la municipalité officielle", async () => {
  const { officialMunicipalityFromPlaceName } = await import("@/lib/normalizeCityName");
  assert.equal(officialMunicipalityFromPlaceName("St-Raymond")?.name, "Saint-Raymond");
  assert.equal(officialMunicipalityFromPlaceName("St-Raymond")?.region, "Québec (ville et région)");
  assert.equal(officialMunicipalityFromPlaceName("Ste-Agathe-des-Monts")?.name, "Sainte-Agathe-des-Monts");
  assert.equal(officialMunicipalityFromPlaceName("Saint-Côme")?.name, "Saint-Côme");
  assert.equal(officialMunicipalityFromPlaceName("Mansonville"), undefined);
  assert.equal(officialMunicipalityFromPlaceName("Lieu inventé"), undefined);
});
