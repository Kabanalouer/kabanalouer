// Régénère tous les fichiers du logo : node scripts/logo/build.cjs (depuis la racine du projet)
const fs = require("fs");
const sharp = require("sharp");
const { wordmark, faviconSimple, OUTER, TREE } = require("./logo.cjs");
const C = { weight: 600, trackingEm: 0.01, stroke: 3.3 };
const OLIVE = "#636e40", WHITE = "#ffffff";

const mark = (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <g stroke="${color}" stroke-width="${C.stroke}" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="${OUTER}"/>
    <path d="${TREE}"/>
  </g>
</svg>
`;

(async () => {
  const files = {
    "public/logo-wordmark.svg": wordmark({ ...C, color: OLIVE }),
    "public/logo-wordmark-light.svg": wordmark({ ...C, color: WHITE }),
    "public/logo-mark.svg": mark(OLIVE),
    "public/favicon.svg": faviconSimple(),
    "app/icon.svg": faviconSimple(),
  };
  for (const [p, svg] of Object.entries(files)) fs.writeFileSync(p, svg);

  const png = (svg, w, h) => sharp(Buffer.from(svg), { density: 600 }).resize(w, h, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const fav = faviconSimple();
  fs.writeFileSync("public/favicon.png", await png(fav, 64, 64));
  fs.writeFileSync("public/favicon-32.png", await png(fav, 32, 32));
  fs.writeFileSync("public/logo-mark.png", await png(mark(OLIVE), 512, 512));
  fs.writeFileSync("public/logo-mark-white.png", await png(mark(WHITE), 512, 512));
  const wm = files["public/logo-wordmark.svg"];
  const vbW = Number(wm.match(/viewBox="0 0 (\d+) 80"/)[1]);
  fs.writeFileSync("public/logo-wordmark.png", await png(wm, Math.round(vbW * 300 / 80), 300));

  // favicon.ico : conteneur ICO avec PNG embarqués (16, 32, 48)
  const sizes = [16, 32, 48];
  const imgs = await Promise.all(sizes.map((s) => png(fav, s, s)));
  const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
  let offset = 6 + 16 * sizes.length; const dirs = [];
  sizes.forEach((s, i) => {
    const d = Buffer.alloc(16);
    d.writeUInt8(s, 0); d.writeUInt8(s, 1); d.writeUInt8(0, 2); d.writeUInt8(0, 3);
    d.writeUInt16LE(1, 4); d.writeUInt16LE(32, 6); d.writeUInt32LE(imgs[i].length, 8); d.writeUInt32LE(offset, 12);
    offset += imgs[i].length; dirs.push(d);
  });
  fs.writeFileSync("app/favicon.ico", Buffer.concat([header, ...dirs, ...imgs]));
  console.log("ok", vbW);
})();
