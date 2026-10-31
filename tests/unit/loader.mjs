// Résolution des alias « @/ » et des imports sans extension pour les essais unitaires (node --test, TypeScript natif).
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const isFile = (p) => existsSync(p) && statSync(p).isFile();

function find(base) {
  if (isFile(base)) return base;
  for (const e of [".ts", "/index.ts"]) if (isFile(base + e)) return base + e;
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  let base = null;
  if (specifier.startsWith("@/")) base = path.join(root, specifier.slice(2));
  else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }
  const file = base && find(base);
  return nextResolve(file ? pathToFileURL(file).href : specifier, context);
}

// Les imports JSON du code (ex. lib/municipalities.json) n'ont pas d'attribut « type: json » : on l'ajoute ici.
export async function load(url, context, nextLoad) {
  if (url.endsWith(".json")) return nextLoad(url, { ...context, importAttributes: { type: "json" } });
  return nextLoad(url, context);
}
