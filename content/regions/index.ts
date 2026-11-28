import type { RegionContent } from "./types";
import laurentides from "./laurentides";
import charlevoix from "./charlevoix";
import cantonsDeLest from "./cantons-de-lest";
import lanaudiere from "./lanaudiere";
import mauricie from "./mauricie";
import outaouais from "./outaouais";
import saguenayLacSaintJean from "./saguenay-lac-saint-jean";
import basSaintLaurent from "./bas-saint-laurent";
import gaspesie from "./gaspesie";
import abitibiTemiscamingue from "./abitibi-temiscamingue";
import coteNord from "./cote-nord";
import monteregie from "./monteregie";
import chaudiereAppalaches from "./chaudiere-appalaches";
import quebec from "./quebec";
import centreDuQuebec from "./centre-du-quebec";
import montreal from "./montreal";
import laval from "./laval";
import eeyouIstcheeBaieJames from "./eeyou-istchee-baie-james";
import nunavik from "./nunavik";

export type { RegionContent };

const ALL: RegionContent[] = [
  laurentides,
  charlevoix,
  cantonsDeLest,
  lanaudiere,
  mauricie,
  outaouais,
  saguenayLacSaintJean,
  basSaintLaurent,
  gaspesie,
  abitibiTemiscamingue,
  coteNord,
  monteregie,
  chaudiereAppalaches,
  quebec,
  centreDuQuebec,
  montreal,
  laval,
  eeyouIstcheeBaieJames,
  nunavik,
]

export function getRegionContent(slug: string): RegionContent | undefined {
  return ALL.find((r) => r.slug === slug);
}
