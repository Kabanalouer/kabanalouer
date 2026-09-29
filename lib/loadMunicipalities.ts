import type { Municipality } from "./municipalities";

// Liste des municipalités (~200 Ko) chargée à la demande, côté client :
// l'importer directement l'embarquait dans la Navbar de chaque page.
let pending: Promise<Municipality[]> | null = null;

export function loadMunicipalities(): Promise<Municipality[]> {
  pending ??= import("./municipalities.json").then((m) => m.default as Municipality[]);
  return pending;
}
