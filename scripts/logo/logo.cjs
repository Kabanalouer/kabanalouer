// Dessin du logo Kabanalouer — texte converti en tracés (Plus Jakarta Sans variable, licence OFL)
// pour qu'il s'affiche à l'identique partout, même en <img>. Voir CLAUDE.md § Logo.
const fk = require("fontkit");
const fs = require("fs");
const FONT = __dirname + "/PlusJakartaSans.ttf";
const base = fk.openSync(FONT);

const OUTER = "M20 50 C12 50 8 44 12 37 L27 13 C30 8 34 8 37 13 L52 37 C56 44 52 50 44 50";
const TREE = "M32 24 L25 35 M32 24 L39 35 M32 33 L27 41 M32 33 L37 41 M32 24 L32 50";

function textPaths(text, { weight, size, trackingEm, x, centerY }) {
  const f = base.getVariation({ wght: weight });
  const s = size / f.unitsPerEm;
  // même placement vertical que dominant-baseline="central" du logo actuel
  const baseline = centerY + ((f.ascent + f.descent) / 2) * s;
  const run = f.layout(text);
  let cx = x, d = "";
  run.glyphs.forEach((g, i) => {
    const p = g.path.scale(s, -s).translate(cx, baseline);
    d += p.toSVG();
    cx += run.positions[i].xAdvance * s + trackingEm * size;
  });
  return { d, width: cx - trackingEm * size - x };
}

function wordmark({ weight = 500, trackingEm = -0.03, stroke = 2.6, color = "#636e40", gap = 78 }) {
  const t = textPaths("kabanalouer", { weight, size: 40, trackingEm, x: gap, centerY: 36 });
  const w = Math.ceil(gap + t.width + 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 80" fill="none">
  <g transform="scale(1.25)" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="${OUTER}"/>
    <path d="${TREE}"/>
  </g>
  <path fill="${color}" d="${t.d}"/>
</svg>
`;
}

// Favicon simplifié : trait plus épais, une seule paire de branches, plus de marge
function faviconSimple({ bg = "#636e40", fg = "#ffffff" } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="14" fill="${bg}"/>
  <g transform="translate(5.6,4.4) scale(0.825)" stroke="${fg}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="${OUTER}"/>
    <path d="M32 22 L24.5 32.5 M32 22 L39.5 32.5 M32 32 L25.5 41.5 M32 32 L38.5 41.5 M32 22 L32 50"/>
  </g>
</svg>
`;
}

module.exports = { wordmark, faviconSimple, OUTER, TREE };
