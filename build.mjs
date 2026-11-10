// Збірка статичного сайту: node build.mjs  →  dist/ (6 мов: / , /en/, /de/, /pl/, /fr/, /ru/)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import cfg from "./src/config.mjs";
import { places } from "./src/data/places.mjs";
import { routes, stops } from "./src/data/routes.mjs";
import { apartments } from "./src/data/apartments.mjs";
import { render, esc } from "./src/template.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, "dist");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const photos = JSON.parse(read("src/data/photos.json"));
const more = JSON.parse(read("src/data/more.json"));
const geo = JSON.parse(read("src/data/geo.json"));
if (!existsSync(join(ROOT, "src/data/apt-images.json"))) { console.error("Спершу запустіть: python tools/images.py"); process.exit(1); }
const aptImgs = JSON.parse(read("src/data/apt-images.json"));
const packs = {};
for (const L of cfg.langs) packs[L.code] = (await import(pathToFileURL(join(ROOT, "src/i18n", `${L.code}.mjs`)).href)).default;
const PIN = { uk: "Мадейра", en: "Madeira", de: "Madeira", pl: "Madera", fr: "Madère", ru: "Мадейра" };

/* ---------- Фото з Wikimedia Commons (стандартні ширини мініатюр) ---------- */
const wm = (ph, w) => (ph.w <= w ? ph.url : `${ph.thumbBase}/${w}px-${ph.thumbName}`);
const wmSet = (ph, ws) => {
  const out = [];
  for (const w of ws) { if (ph.w <= w) { out.push(`${ph.url} ${ph.w}w`); break; } out.push(`${wm(ph, w)} ${w}w`); }
  return out.join(", ");
};
// Власні WebP (tools/fetch_photos.py + tools/images.py) мають пріоритет; якщо їх нема — фото з Wikimedia.
const local = existsSync(join(ROOT, "src/data/photo-files.json")) ? JSON.parse(read("src/data/photo-files.json")) : {};
const imgFor = (key, base = "") => {
  const ph = photos[key], L = local[key];
  if (!L) return { ph, sphereSet: wmSet(ph, [250, 330, 500]), thumb: wm(ph, 330), card: wm(ph, 500), cardSet: wmSet(ph, [330, 500, 960]), full: wm(ph, 1280), big: wm(ph, 960), mid: wm(ph, 960), midSet: wmSet(ph, [500, 960, 1280]) };
  const ws = Object.keys(L.files).map(Number).sort((a, b) => a - b), f = (w) => base + L.files[String(w)];
  const pick = (want) => ws.find((w) => w >= want) || ws.at(-1);
  const set = (list) => [...new Set(list.map(pick))].map((w) => `${f(w)} ${w}w`).join(", ");
  return { ph, sphereSet: set([280, 560]), thumb: f(pick(280)), card: f(pick(560)), cardSet: set([280, 560, 960]), full: f(ws.at(-1)),
    big: `${cfg.siteUrl}/${L.files[String(pick(960))]}`, mid: f(pick(960)), midSet: set([560, 960, 1280]) };
};
const remote = Object.keys(photos).some((k) => !local[k]);
const yachtPh = photos.yacht;

/* ---------- Глобус: усі фото (головні + додаткові), перемішані так, щоб фото одного місця не стояли поруч ---------- */
function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pool = [];
places.forEach((p, i) => { pool.push({ pi: i, key: p.photo }); (more[p.id] || []).forEach((k) => pool.push({ pi: i, key: k })); });
let sphere = pool, bestC = Infinity;
for (let seed = 1; seed < 600 && bestC > 0; seed++) {
  const r = rng(seed), a = pool.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  let c = 0;
  for (let i = 0; i < a.length; i++) for (const d of [1, 2, 3, 5, 8, 13]) if (i + d < a.length && a[i].pi === a[i + d].pi) c++;
  if (c < bestC) { bestC = c; sphere = a; }
}
const mainIdx = Object.fromEntries(places.map((p) => [p.id, sphere.findIndex((s) => s.key === p.photo)]));

/* ---------- Карта: проєкція і SVG ---------- */
const LON0 = -17.30, LON1 = -16.62, LAT0 = 32.90, LAT1 = 32.60;
const COS = Math.cos((32.75 * Math.PI) / 180);
const K = 1000 / ((LON1 - LON0) * COS);
const MW = 1000, MH = Math.round((LAT0 - LAT1) * K);
const proj = (lat, lon) => [(lon - LON0) * COS * K, (LAT0 - lat) * K];
const f1 = (n) => Math.round(n * 10) / 10;
const mapId = (id) => stops[id]?.map || id;
const pt = (id) => { const p = places.find((x) => x.id === id) || stops[mapId(id)]; return proj(p.lat, p.lon); };
const SEA = new Set(["girao_sea", "garajau"]);

function spline(P) {
  if (P.length === 3 && Math.hypot(P[0][0] - P[2][0], P[0][1] - P[2][1]) < 1) {
    const [A, B] = P, mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, dx = B[0] - A[0], dy = B[1] - A[1];
    const L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, d = Math.max(14, L * 0.2);
    return `M${f1(A[0])},${f1(A[1])}Q${f1(mx + nx * d)},${f1(my + ny * d)} ${f1(B[0])},${f1(B[1])}Q${f1(mx - nx * d)},${f1(my - ny * d)} ${f1(A[0])},${f1(A[1])}`;
  }
  let d = `M${f1(P[0][0])},${f1(P[0][1])}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
    d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)},${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)},${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])},${f1(p2[1])}`;
  }
  return d;
}
function daySeq(day) {
  const seq = [];
  if (day.s[0][0] !== "fnc") seq.push({ id: "funchal", sea: false });
  for (const [id] of day.s) {
    const m = mapId(id), sea = SEA.has(id), last = seq.at(-1);
    if (sea && last && !last.sea && last.id !== "funchal") seq.push({ id: "funchal", sea: false });
    if (!sea && seq.at(-1)?.sea) seq.push({ id: "funchal", sea: true });
    if (seq.at(-1)?.id !== m) seq.push({ id: m, sea });
  }
  const last = seq.at(-1);
  if (last.id !== "fnc" && last.id !== "funchal") seq.push({ id: "funchal", sea: last.sea });
  return seq;
}
function mapSvg(c) {
  const land = "M" + geo.madeira.map(([lon, lat]) => proj(lat, lon).map(f1).join(",")).join("L") + "Z";
  const [fx, fy] = proj(stops.funchal.lat, stops.funchal.lon);
  const dots = places.filter((p) => p.lat > LAT1 && p.lat < LAT0 && p.lon > LON0 && p.lon < LON1)
    .map((p) => { const [x, y] = proj(p.lat, p.lon); return `<circle class="dot" cx="${f1(x)}" cy="${f1(y)}" r="3.2"/>`; }).join("");
  const short = (s) => s.replace(/^(Ліс|Сад|Лес|Forêt de|Jardin|Las|Ogród)\s+/, "").replace(/-(Wald|Garten)$/, "");
  const refs = [["moniz", -10, -16, "end"], ["pargo", 6, 30, "start"], ["lourenco", 0, -18, "middle"], ["ruivo", 0, -16, "middle"], ["santana", 10, -12, "start"], ["girao", -8, 26, "end"]]
    .map(([id, dx, dy, a]) => { const [x, y] = pt(id); return `<text class="lbl" x="${f1(x + dx)}" y="${f1(y + dy)}" text-anchor="${a}">${esc(short(c.spots[id].t))}</text>`; }).join("");
  const rts = routes.map((r) => {
    const badges = [];
    const groups = r.plan.map((day, di) => {
      const seq = daySeq(day), segs = []; let cur = null;
      seq.forEach((s, i) => {
        if (i === 0) return;
        const mode = s.sea ? "sea" : "land";
        if (!cur || cur.mode !== mode) { cur = { mode, pts: [pt(seq[i - 1].id)] }; segs.push(cur); }
        cur.pts.push(pt(s.id));
      });
      const paths = segs.map((s) => `<path class="dp${s.mode === "sea" ? " sea" : ""}" d="${spline(s.pts)}"/>`).join("");
      const uniq = [...new Set(seq.map((s) => s.id))].filter((id) => id !== "funchal");
      const marks = uniq.map((id) => { const [x, y] = pt(id); return `<circle cx="${f1(x)}" cy="${f1(y)}" r="5.5"/>`; }).join("");
      let far = uniq[0] || "funchal", best = -1;
      for (const id of uniq) { const [x, y] = pt(id); const dd = Math.hypot(x - fx, y - fy); if (dd > best) { best = dd; far = id; } }
      let [bx, by] = pt(far);
      while (badges.some(([x, y]) => Math.hypot(x - bx, y - by) < 40)) { bx += 40; by -= 6; }
      badges.push([bx, by]);
      return `<g class="dg" data-day="${di}">${paths}<g class="mk">${marks}<circle cx="${f1(bx)}" cy="${f1(by)}" r="17"/><text x="${f1(bx)}" y="${f1(by)}">${di + 1}</text></g></g>`;
    }).join("");
    return `<g class="rt" data-route="${r.id}">${groups}</g>`;
  }).join("");
  const kmU = 10 * (K / 111.32);
  return `<svg viewBox="0 0 ${MW} ${MH}" role="img" aria-label="${esc(c.routes.mapAria)}" xmlns="http://www.w3.org/2000/svg">
<text class="lbl ocean" x="40" y="${MH - 62}">${esc(c.routes.ocean)}</text>
<text class="lbl" x="40" y="${MH - 26}" style="font-size:14px;letter-spacing:.08em;text-transform:none;opacity:.7">© OpenStreetMap</text>
<path class="land" d="${land}"/>${dots}${refs}
<text class="lbl" x="${MW - 20}" y="38" text-anchor="end">${esc(c.routes.portoSanto)}</text>
<text class="lbl" x="${MW - 20}" y="${MH - 24}" text-anchor="end">${esc(c.routes.desertas)} ↘</text>
<g class="scale"><line x1="${f1(MW - 20 - kmU)}" y1="${MH - 66}" x2="${MW - 20}" y2="${MH - 66}"/><line x1="${f1(MW - 20 - kmU)}" y1="${MH - 72}" x2="${f1(MW - 20 - kmU)}" y2="${MH - 60}"/><line x1="${MW - 20}" y1="${MH - 72}" x2="${MW - 20}" y2="${MH - 60}"/><text class="lbl" x="${f1(MW - 20 - kmU / 2)}" y="${MH - 80}" text-anchor="middle">10 ${esc(c.routes.km)}</text></g>
${rts}
<g class="base"><circle cx="${f1(fx)}" cy="${f1(fy)}" r="7"/><text class="lbl big" x="${f1(fx + 14)}" y="${f1(fy + 30)}">${esc(c.routes.funchal)}</text></g>
</svg>`;
}

/* ---------- JSON-LD ---------- */
const pageUrl = (code) => `${cfg.siteUrl}/${cfg.langs.find((l) => l.code === code).dir}`;
const LANGS = cfg.langs.map((l) => l.code);
function jsonLd(lang) {
  const c = packs[lang], org = `${cfg.siteUrl}/#org`, S = c.spots;
  const svc = c.services.items.map(([m, u, h, p]) => `${h}: ${p}`);
  const g = [
    {
      "@type": "TravelAgency", "@id": org, name: cfg.brand, url: `${cfg.siteUrl}/`, image: `${cfg.siteUrl}/img/og.jpg`, logo: `${cfg.siteUrl}/img/icon-512.png`,
      description: c.description.replace("{brand}", cfg.brand), telephone: cfg.contacts.phone, email: cfg.contacts.email, foundingDate: cfg.founded,
      address: { "@type": "PostalAddress", addressLocality: "Funchal", addressRegion: "Madeira", addressCountry: "PT" },
      geo: { "@type": "GeoCoordinates", latitude: cfg.geo.lat, longitude: cfg.geo.lon },
      areaServed: [{ "@type": "Place", name: "Madeira" }, { "@type": "Place", name: "Porto Santo" }],
      availableLanguage: LANGS,
      knowsAbout: ["Madeira", "Funchal", "Levada walks", "Pico do Arieiro", "Porto Moniz", "Laurisilva"],
      hasOfferCatalog: { "@type": "OfferCatalog", name: c.services.label, itemListElement: svc.map((n) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: n, areaServed: "Madeira" } })) }
    },
    { "@type": "WebSite", "@id": `${cfg.siteUrl}/#website`, url: `${cfg.siteUrl}/`, name: cfg.brand, inLanguage: LANGS, publisher: { "@id": org } },
    { "@type": "WebPage", "@id": `${pageUrl(lang)}#webpage`, url: pageUrl(lang), name: c.title.replace("{brand}", cfg.brand), description: c.description,
      inLanguage: lang, isPartOf: { "@id": `${cfg.siteUrl}/#website` }, about: { "@id": `${cfg.siteUrl}/#madeira` }, primaryImageOfPage: `${cfg.siteUrl}/img/og.jpg` },
    {
      "@type": "TouristDestination", "@id": `${cfg.siteUrl}/#madeira`, name: PIN[lang],
      geo: { "@type": "GeoCoordinates", latitude: 32.7607, longitude: -16.9595 },
      includesAttraction: places.map((p) => ({ "@type": "TouristAttraction", name: S[p.id].t, description: `${S[p.id].story} ${S[p.id].fact}`,
        geo: { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lon },
        image: [p.img.big, ...(more[p.id] || []).map((k) => imgFor(k).big)] }))
    },
    ...routes.map((r) => {
      const T = c.trips[r.id];
      return { "@type": "TouristTrip", name: T.name, description: T.why, touristType: T.who, provider: { "@id": org },
        itinerary: { "@type": "ItemList", itemListElement: r.plan.map((d, i) => ({ "@type": "ListItem", position: i + 1,
          name: `${c.routes.day} ${i + 1}: ${T.plan[i].t}`,
          description: d.s.map(([id], si) => `${S[id]?.t || c.stops[id]} — ${T.plan[i].s[si]}`).join("; ") })) } };
    }),
    { "@type": "FAQPage", mainEntity: c.faq.items.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }
  ];
  return JSON.stringify({ "@context": "https://schema.org", "@graph": g }).replace(/</g, "\\u003c");
}

/* ---------- Вода на фото басейну ----------
   q — чотирикутник басейну на фото (ліво-верх, право-верх, право-низ, ліво-низ) у пікселях оригіналу;
   p — точний контур води, якщо він не збігається з q; n — розмір сітки хвиль; d — сила заломлення;
   l — світлотінь на хвилях; c — сонячні відблиски на дні; a — висота брижів; s — іскри сонця; z — висота вильоту бризок. */
const WATER = {
  pool: { q: [[113, 304], [398, 258], [613, 588], [93, 746]], n: [120, 170], d: 36, l: 6, c: 1, a: .022, s: .38, z: .55, tile: 1 },
  "facade-pool": { q: [[-60, 776], [710, 792], [730, 1310], [-420, 1310]], p: [[122, 777], [684, 793], [690, 860], [697, 950], [700, 1100], [703, 1300], [-420, 1300], [-60, 790], [20, 803]], n: [130, 190], d: 20, l: 4, c: 0, a: .034, s: .85, z: 3.2, tile: 1, pos: "50% 100%" },
  "courtyard-dusk": { q: [[1058, 726], [1225, 705], [1225, 779], [1058, 728]], n: [80, 30], d: 14, l: 3, c: 0, a: .05, s: .7, z: 1.5 }
};

/* ---------- Мінімізація ---------- */
const caustics = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='520' height='520'><filter id='f' x='0' y='0' width='100%' height='100%'><feTurbulence type='turbulence' baseFrequency='0.0105 0.0145' numOctaves='2' seed='11' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.66 0 0 0 0 1 0 0 0 0 0.94 0 0 0 -9 2.05'/></filter><rect width='100%' height='100%' filter='url(%23f)'/></svg>`).replace(/%2523/g, "%23");
const minCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s*\n\s*/g, "").replace(/\s{2,}/g, " ").replace(/\s*([{};,>])\s*/g, "$1").replace(/;}/g, "}");
const minJs = (s) => s.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("//")).join("\n");
const css = minCss(read("src/styles.css")).replace("__CAUSTICS__", `"data:image/svg+xml,${caustics}"`);
const js = minJs(read("src/app.js").replace("/*__WATER__*/", () => read("src/water.js")));

/* ---------- Контур острова для футера (кожна друга точка, бо він дрібний) ---------- */
const [isleX, isleY] = proj(stops.funchal.lat, stops.funchal.lon);
const isle = { h: MH, x: f1(isleX), y: f1(isleY), d: "M" + geo.madeira.filter((_, i) => i % 2 === 0).map(([lon, lat]) => proj(lat, lon).map(f1).join(",")).join("L") + "Z" };
const WATER_HINT = { uk: "Торкніться води", en: "Touch the water", de: "Berühren Sie das Wasser", pl: "Dotknij wody", fr: "Touchez l’eau", ru: "Коснитесь воды" };

/* ---------- Сторінки ---------- */
const rel =(from, to) => (from.dir ? "../" : "") + to.dir || "./";
mkdirSync(DIST, { recursive: true });
for (const L of cfg.langs) {
  const lang = L.code, c = packs[lang], base = L.dir ? "../" : "", S = c.spots;
  for (const p of places) p.img = imgFor(p.photo, base);
  const sph = sphere.map((s) => ({ ...s, img: imgFor(s.key, base) }));
  const y = imgFor("yacht", base), yacht = { mid: y.mid, set: y.midSet };
  const urls = { abs: Object.fromEntries(LANGS.map((x) => [x, pageUrl(x)])), rel: Object.fromEntries(cfg.langs.map((x) => [x.code, rel(L, x) || "./"])) };
  const apts = apartments.map((a) => {
    const im = aptImgs[a.src];
    return { ...a, img: { mid: im.files["960"] || im.files.full, set: Object.entries(im.files).filter(([k]) => k !== "full").map(([w, f]) => `${base}${f} ${w}w`).join(", "), full: im.files.full } };
  });
  const credits = [...sph.map((s) => [S[places[s.pi].id].t, s.img.ph]), [c.yachtCredit, yachtPh]]
    .map(([n, ph]) => `<li>${esc(n)} — <a href="${esc(ph.page)}" rel="noopener" target="_blank">${esc(ph.author)}</a>, ${esc(ph.license)}</li>`).join("");
  const data = JSON.stringify({
    lang, locale: L.locale,
    places: places.map((p) => ({ id: p.id, t: S[p.id].t })),
    sphere: sph.map((s) => ({ p: s.pi, s: s.img.sphereSet, src: s.img.thumb, full: s.img.full,
      credit: `${c.photo}: ${s.img.ph.author} · ${s.img.ph.license}`, page: s.img.ph.page })),
    apts: apts.map((a) => {
      const im = aptImgs[a.src], w = WATER[a.src];
      return { t: c.apts[a.src], d: c.aptsText?.[a.src] || "", full: base + a.img.full, src: base + a.img.mid,
        r: +Math.max(.72, Math.min(1.5, im.w / im.h)).toFixed(3), pos: w?.pos || "", water: w ? { ...w, w: im.w, h: im.h } : null };
    }),
    aptWhere: c.stay.h2.replace(/\*/g, ""),
    routes: Object.fromEntries([...routes.map((r) => [r.id, c.trips[r.id].name]), ["custom", c.routes.custom]]),
    i18n: { add: c.add, added: c.added, menuOpen: c.menuOpen, menuClose: c.menuClose, plural: c.plural, book: c.book },
    contacts: cfg.contacts, endpoint: cfg.formEndpoint
  }).replace(/</g, "\\u003c");
  c.waterHint = WATER_HINT[lang];
  const photoSet = (key) => { const im = imgFor(key, base); return { src: im.card, set: im.cardSet }; };
  const poolF = aptImgs.pool.files;
  const svc = [{ src: base + poolF["480"], set: `${base}${poolF["480"]} 480w, ${base}${poolF["960"]} 960w` }, photoSet("seixal"), photoSet("yacht"), photoSet("ruivo"), photoSet("oldtown_2")];
  const doors = ["oldtown", "oldtown_2"].map(photoSet);
  const html = render({ lang, c, cfg, base, places, routes, apts, mapSvg: mapSvg(c), jsonLd: jsonLd(lang), urls, css, js, data, credits, yacht, mainIdx, remote, pinName: PIN[lang], svc, doors, isle });
  const out = join(DIST, L.dir, "index.html");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  console.log(`✓ /${L.dir}index.html  ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
}
console.log(`  глобус: ${sphere.length} фото (сусідніх повторів: ${bestC})`);

/* ---------- SEO / GEO файли ---------- */
const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(DIST, "robots.txt"), `User-agent: *\nAllow: /\n\n# AI-пошук і асистенти — ласкаво просимо\nUser-agent: GPTBot\nAllow: /\nUser-agent: OAI-SearchBot\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\nUser-agent: Google-Extended\nAllow: /\n\nSitemap: ${cfg.siteUrl}/sitemap.xml\n`);
writeFileSync(join(DIST, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${cfg.langs.map((L) => `  <url>
    <loc>${pageUrl(L.code)}</loc>
    <lastmod>${today}</lastmod>
${cfg.langs.map((x) => `    <xhtml:link rel="alternate" hreflang="${x.hreflang}" href="${pageUrl(x.code)}"/>`).join("\n")}
    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl("en")}"/>
  </url>`).join("\n")}
</urlset>
`);
const en = packs.en;
writeFileSync(join(DIST, "llms.txt"), `# ${cfg.brand}

> ${en.description.replace("{brand}", cfg.brand)}

${cfg.brand} is a travel organiser based in Funchal, Madeira (Portugal). We arrange complete holidays on Madeira for travellers from Europe, from a single guest to groups of 36. The site is available in Ukrainian, English, German, Polish, French and Russian.

## What we offer
- Apartments with a swimming pool in Funchal, with balconies over Funchal bay — 1 to 36 guests.
- Airport meet-and-greet at Madeira Airport (FNC) with two 18-seat minibuses (36 seats), also used for every excursion.
- A yacht for up to 14 guests: dolphin watching, swimming coves, Cabo Girão from the sea, sunset sailings. Larger groups sail in turns.
- Local guides to Madeira’s finest places, tailored to each group’s wishes, age and fitness.
- Corporate events and celebrations in central Funchal, next to the Plaza Madeira shopping centre.
- Trail registration for walking routes (PR trails charge non-residents and need booked start times).

## Itineraries
${routes.map((r) => { const T = en.trips[r.id]; return `### ${T.name} (${T.days})\n${T.why}\n${r.plan.map((d, i) => `- Day ${i + 1}, ${T.plan[i].t}: ${d.s.map(([id], si) => `${en.spots[id]?.t || en.stops[id]} (${T.plan[i].s[si]})`).join("; ")}`).join("\n")}`; }).join("\n\n")}

## 21 places on Madeira we visit
${places.map((p) => `- **${en.spots[p.id].t}** (${en.spots[p.id].area}; ${p.lat}, ${p.lon}): ${en.spots[p.id].story} ${en.spots[p.id].fact}`).join("\n")}

## FAQ
${en.faq.items.map(([q, a]) => `**${q}** ${a}`).join("\n\n")}

## Pages
${cfg.langs.map((l) => `- ${l.name}: ${pageUrl(l.code)}`).join("\n")}

## Contact
- WhatsApp / phone: ${cfg.contacts.phone}
- Email: ${cfg.contacts.email}
- Telegram: @${cfg.contacts.telegram}
`);
writeFileSync(join(DIST, "site.webmanifest"), JSON.stringify({
  name: cfg.brand, short_name: cfg.brand, start_url: "./", display: "standalone", background_color: "#052b30", theme_color: "#052b30",
  icons: [{ src: "img/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "img/icon-512.png", sizes: "512x512", type: "image/png" }]
}, null, 2));
writeFileSync(join(DIST, "favicon.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><radialGradient id="g" cx=".38" cy=".34" r=".7"><stop offset="0" stop-color="#9fe0b0"/><stop offset=".5" stop-color="#2a8053"/><stop offset="1" stop-color="#0c3e2b"/></radialGradient></defs><rect width="64" height="64" rx="14" fill="#052b30"/><circle cx="32" cy="32" r="19" fill="url(#g)"/><ellipse cx="32" cy="32" rx="19" ry="7" fill="none" stroke="#e6fff0" stroke-width="1.4" opacity=".55"/><ellipse cx="32" cy="32" rx="7" ry="19" fill="none" stroke="#e6fff0" stroke-width="1.4" opacity=".4"/><circle cx="40" cy="24" r="3.2" fill="#ffe9b0"/></svg>`);
writeFileSync(join(DIST, "404.html"), `<!DOCTYPE html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>404 | ${cfg.brand}</title><meta name="robots" content="noindex"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#052b30;color:#f4f1e8;font:300 16px/1.6 -apple-system,Segoe UI,sans-serif;text-align:center;padding:24px}h1{font:400 clamp(40px,8vw,88px)/1 "Times New Roman",serif;margin:0 0 18px}a{color:#f4f1e8;margin:0 6px}</style></head><body><div><h1>404</h1><p>Сторінку не знайдено · Page not found · Seite nicht gefunden · Nie znaleziono strony · Page introuvable · Страница не найдена</p><p>${cfg.langs.map((l) => `<a href="${cfg.siteUrl}/${l.dir}">${l.label}</a>`).join("")}</p></div></body></html>`);
writeFileSync(join(DIST, ".nojekyll"), "");
console.log("✓ robots.txt, sitemap.xml, llms.txt, site.webmanifest, favicon.svg, 404.html");
