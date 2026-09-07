#!/usr/bin/env node
// Génère lib/municipalities.json à partir du répertoire officiel des
// municipalités du Québec (MAMH, données ouvertes, licence CC-BY 4.0).
//
// À ré-exécuter si le répertoire MAMH change (fusions municipales,
// renommages) :  node scripts/generate-municipalities.js
//
// Source : https://donneesouvertes.affmunqc.net/repertoire/MUN.csv

const fs = require("fs");
const path = require("path");

const SOURCE_URL = "https://donneesouvertes.affmunqc.net/repertoire/MUN.csv";
const OUTPUT_PATH = path.join(__dirname, "..", "lib", "municipalities.json");

// Copie fonctionnellement identique de lib/slugify.ts — ce script tourne en
// Node brut (pas de build TypeScript), donc on ne peut pas importer le .ts
// directement. Garder en synchro si lib/slugify.ts change un jour.
function slugify(str) {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Région officielle MAMH (sans le code numérique, ex. "Estrie") → dbValue de
// lib/regions.ts (nos 15 régions "touristiques"). null = région exclue
// (pas une destination chalet). "Capitale-Nationale" est gérée à part dans
// resolveRegion() : scindée en Charlevoix / Québec (ville et région).
const REGION_MAP = {
  "Bas-Saint-Laurent": "Bas-Saint-Laurent",
  "Saguenay--Lac-Saint-Jean": "Saguenay–Lac-Saint-Jean",
  "Mauricie": "Mauricie",
  "Estrie": "Estrie (Cantons-de-l'Est)",
  "Montréal": null,
  "Outaouais": "Outaouais",
  "Abitibi-Témiscamingue": "Abitibi-Témiscamingue",
  "Côte-Nord": "Côte-Nord",
  "Nord-du-Québec": null,
  "Gaspésie--Îles-de-la-Madeleine": "Gaspésie–Îles-de-la-Madeleine",
  "Chaudière-Appalaches": "Chaudière-Appalaches",
  "Laval": null,
  "Lanaudière": "Lanaudière",
  "Laurentides": "Laurentides",
  "Montérégie": "Montérégie",
  "Centre-du-Québec": "Centre-du-Québec",
};

// Parseur CSV minimal (gère les champs entre guillemets avec virgules/guillemets échappés).
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* ignoré */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const stripCode = (s) => s.replace(/\s*\(\d+\)\s*$/, "").trim();

// Retourne le dbValue (une de nos 15 régions), null (exclue), ou undefined
// (région officielle non reconnue — ne devrait jamais arriver avec le CSV
// MAMH actuel, garde-fou défensif seulement).
function resolveRegion(regadmRaw, mrcRaw) {
  const regadm = stripCode(regadmRaw || "");
  if (regadm === "Capitale-Nationale") {
    const mrc = stripCode(mrcRaw || "");
    return mrc === "MRC Charlevoix" || mrc === "MRC Charlevoix-Est"
      ? "Charlevoix"
      : "Québec (ville et région)";
  }
  return Object.prototype.hasOwnProperty.call(REGION_MAP, regadm) ? REGION_MAP[regadm] : undefined;
}

async function main() {
  console.log(`Téléchargement de ${SOURCE_URL} ...`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Échec du téléchargement : HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const text = buf.toString("utf8").replace(/^﻿/, "");

  const rows = parseCSV(text);
  const header = rows[0];
  const idx = (name) => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`Colonne "${name}" introuvable dans le CSV MAMH — format a peut-être changé.`);
    return i;
  };
  const iCode = idx("mcode"), iName = idx("munnom"), iRegadm = idx("regadm"), iMrc = idx("mrc");

  const municipalities = [];
  let excludedCount = 0;
  let unmappedCount = 0;

  for (const r of rows.slice(1)) {
    if (r.length < 2 || !r[iName]) continue;
    const name = r[iName];
    const region = resolveRegion(r[iRegadm], r[iMrc]);

    if (region === undefined) {
      unmappedCount++;
      console.warn(`⚠️  Région non reconnue pour "${name}" : "${r[iRegadm]}" — municipalité exclue par sécurité.`);
      continue;
    }
    if (region === null) {
      excludedCount++;
      continue; // Montréal, Laval, Nord-du-Québec — hors scope (pas de destination chalet)
    }

    municipalities.push({
      name,
      slug: slugify(name),
      region,
      officialCode: r[iCode],
      mrc: stripCode(r[iMrc] || ""),
    });
  }

  municipalities.sort((a, b) => a.name.localeCompare(b.name, "fr"));

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(municipalities, null, 2) + "\n");
  console.log(`✅ ${municipalities.length} municipalités écrites dans ${path.relative(process.cwd(), OUTPUT_PATH)}`);
  console.log(`   ${excludedCount} exclues (Montréal, Laval, Nord-du-Québec)`);
  if (unmappedCount > 0) {
    console.log(`   ${unmappedCount} avec une région non reconnue (voir avertissements ci-dessus)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
