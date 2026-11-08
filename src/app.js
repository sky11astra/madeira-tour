(() => {
"use strict";
const D = JSON.parse(document.getElementById("app-data").textContent);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement, body = document.body;
const fine = matchMedia("(hover:hover) and (pointer:fine)");
const coarse = matchMedia("(pointer:coarse)");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const ss = {
  get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
};
const I = D.i18n, B = I.book, P = D.places, S = D.sphere, N = S.length;
const pr = new Intl.PluralRules(D.locale);
const plural = (n, f) => f[pr.select(n)] || f.other;
const isOn = (c) => body.classList.contains(c);
const lockScroll = () => { html.style.overflow = (isOn("lit") || isOn("menuopen") || isOn("gridview")) ? "hidden" : ""; };

/* ===== 3D: матриця повороту 3×3 (рядками) ===== */
const rotX = (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
const rotY = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
const mul = (A, Bm) => { const C = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) C[r * 3 + c] = A[r * 3] * Bm[c] + A[r * 3 + 1] * Bm[3 + c] + A[r * 3 + 2] * Bm[6 + c]; return C; };
const ortho = (M) => {
  let [a, b, c, d, e, f] = M, n = Math.hypot(a, b, c); a /= n; b /= n; c /= n;
  const k = a * d + b * e + c * f; d -= k * a; e -= k * b; f -= k * c; n = Math.hypot(d, e, f); d /= n; e /= n; f /= n;
  return [a, b, c, d, e, f, b * f - c * e, c * d - a * f, a * e - b * d];
};
const f5 = (n) => n.toFixed(5);
const css3 = (M) => `matrix3d(${f5(M[0])},${f5(M[3])},${f5(M[6])},0,${f5(M[1])},${f5(M[4])},${f5(M[7])},0,${f5(M[2])},${f5(M[5])},${f5(M[8])},0,0,0,0,1)`;

/* ===== Глобус: фото рівними рядами-«широтами», як плитка на кулі, без накладань ===== */
const stage = $("#stage"), world = $("#world"), orb = $("#orb");
const rng = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const LATS = [0, 23, -23, 46, -46, 69, -69];
const slots = (() => {
  const w = LATS.map((l) => Math.cos(l * Math.PI / 180)), sum = w.reduce((a, b) => a + b);
  const cnt = w.map((x, i) => Math.min(Math.abs(LATS[i]) > 60 ? 3 : 99, Math.max(1, Math.round(N * x / sum))));
  let tot = cnt.reduce((a, b) => a + b);
  while (tot < N) { let bi = 0, bv = -1; cnt.forEach((c, i) => { const v = w[i] / c; if ((Math.abs(LATS[i]) < 60 || c < 3) && v > bv) { bv = v; bi = i; } }); cnt[bi]++; tot++; }
  while (tot > N) { let bi = 0, bv = 1e9; cnt.forEach((c, i) => { const v = w[i] / c; if (c > 1 && v < bv) { bv = v; bi = i; } }); cnt[bi]--; tot--; }
  const out = [];
  LATS.forEach((lat, r) => { for (let j = 0; j < cnt[r]; j++) out.push([lat, ((j + (r % 2) * .5) * 360 / cnt[r] + r * 11) % 360]); });
  return out;
})();
const cards = S.map((p, i) => {
  const [lat, lon] = slots[i], la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
  const x = Math.cos(la) * Math.sin(lo), y = Math.sin(la), z = Math.cos(la) * Math.cos(lo);
  const el = document.createElement("div");
  el.className = "card";
  el.dataset.idx = i;
  const fig = document.createElement("figure");
  const img = new Image();
  img.alt = P[p.p].t; img.decoding = "async"; img.draggable = false;
  fig.appendChild(img); el.appendChild(fig); orb.appendChild(el);
  const c = { i, el, img, x, y, z, lat, lon, d: -1, o: -1, sized: 0, loading: false, first: false };
  img.onload = () => { img.classList.add("in"); tick(c); };
  img.onerror = () => tick(c);
  return c;
});
function load(c) {
  if (c.loading) return;
  c.loading = true; c.sized = CW; c.img.sizes = CW + "px"; c.img.srcset = S[c.i].s; c.img.src = S[c.i].src;
}

/* ===== Зоряне небо і напівпрозорі хмарки ===== */
let skyW = 0, skyH = 0;
function drawSky() {
  const cv = $("#sky"), w = innerWidth, h = innerHeight;
  if (!cv || !cv.getContext || (w === skyW && Math.abs(h - skyH) < 140)) return;
  skyW = w; skyH = h;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const g = cv.getContext("2d"), r = rng(7), n = Math.round(w * h / 1500);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (let i = 0; i < n; i++) {
    let x = r() * w, y = r() * h;
    if (r() < .35) { const t = r(); x = t * w; y = h * (.9 - .8 * t) + (r() - .5) * h * .2; }
    const m = r(), s = m < .8 ? .5 + r() * .6 : m < .96 ? 1.1 + r() * .6 : 1.7 + r() * .8;
    const a = .3 + r() * .7, k = r(), col = k < .7 ? "255,255,255" : k < .88 ? "198,218,255" : "255,234,208";
    if (s > 1.6) {
      const gr = g.createRadialGradient(x, y, 0, x, y, s * 4);
      gr.addColorStop(0, `rgba(${col},${(a * .45).toFixed(2)})`); gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.fillRect(x - s * 4, y - s * 4, s * 8, s * 8);
    }
    g.fillStyle = `rgba(${col},${a.toFixed(2)})`; g.beginPath(); g.arc(x, y, s / 2, 0, 6.2832); g.fill();
  }
}
function cloudSprite(seed) {
  const r = rng(seed), W = 360, H = 180, cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  for (let i = 0; i < 48; i++) {
    const t = r(), x = W * (.14 + .72 * t), bulge = Math.sin(Math.PI * t);
    const y = H * (.6 - .22 * bulge * r()), rad = H * (.1 + .27 * bulge * (.45 + r() * .55));
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, "rgba(238,244,255,.4)"); gr.addColorStop(.55, "rgba(238,244,255,.16)"); gr.addColorStop(1, "rgba(238,244,255,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 6.2832); g.fill();
  }
  return `url(${cv.toDataURL("image/png")})`;
}
const sprites = [3, 8, 21].map(cloudSprite);
{
  const r = rng(42), f = document.createDocumentFragment();
  for (let i = 0; i < 22; i++) {
    const t = document.createElement("i");
    t.className = "tw"; t.style.left = (r() * 100).toFixed(1) + "%"; t.style.top = (r() * 100).toFixed(1) + "%";
    t.style.setProperty("--t", (2.4 + r() * 3.6).toFixed(1) + "s"); t.style.setProperty("--dl", (-r() * 5).toFixed(1) + "s");
    f.appendChild(t);
  }
  // Маленькі напівпрозорі хмарки в небі навколо глобуса (позаду фото).
  [[2, 12, 24], [70, 7, 18], [-7, 56, 22], [78, 60, 26], [32, 80, 16]].forEach(([x, y, w], i) => {
    const el = document.createElement("i");
    el.className = "wisp"; el.style.backgroundImage = sprites[i % 3];
    el.style.left = x + "%"; el.style.top = y + "%"; el.style.width = `min(${w}vw,${w * 18}px)`;
    el.style.opacity = (.14 + r() * .12).toFixed(2);
    el.style.setProperty("--t", Math.round(60 + r() * 50) + "s"); el.style.setProperty("--dl", -Math.round(r() * 40) + "s");
    el.style.setProperty("--dx", ((r() < .5 ? -1 : 1) * (4 + r() * 6)).toFixed(1) + "vw");
    f.appendChild(el);
  });
  stage.insertBefore(f, world);
}

let VW = 0, VH = 0, R = 200, CW = 90, persp = 1150;
function layout(force) {
  const w = innerWidth, h = innerHeight;
  if (!force && Math.abs(w - VW) < 20 && Math.abs(h - VH) < 20) return;
  VW = w; VH = h;
  const fl = w <= 380 ? 110 : w <= 640 ? 120 : 160;
  R = Math.max(fl, Math.min(520, h * (w <= 640 ? .46 : .45), w * (w <= 640 ? .5 : .56)));
  CW = Math.round(Math.max(72, R * .47));
  persp = w <= 380 ? 620 : w <= 640 ? 760 : w <= 900 ? 920 : 1150;
  html.style.setProperty("--cw", CW + "px");
  html.style.setProperty("--persp", persp + "px");
  for (const c of cards) {
    c.el.style.transform = `translate3d(${(c.x * R).toFixed(2)}px,${(-c.y * R).toFixed(2)}px,${(c.z * R).toFixed(2)}px) rotateY(${c.lon.toFixed(3)}deg) rotateX(${c.lat.toFixed(3)}deg)`;
    if (c.loading && CW > c.sized) { c.sized = CW; c.img.sizes = CW + "px"; }
  }
  drawSky();
}

// Поворот навколо довільної осі (формула Родріга) — для повільного «блукаючого» автообертання.
const rotAxis = (x, y, z, a) => {
  const l = Math.hypot(x, y, z); x /= l; y /= l; z /= l;
  const c = Math.cos(a), s = Math.sin(a), t = 1 - c;
  return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c];
};
const rotZ = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
const TILT = -12 * Math.PI / 180, K = .0023;
let M = mul(rotY(-14 * Math.PI / 180), rotX(TILT)), camZ = 0, velX = 0, velY = 0, velZ = 0, focused = -1, dragging = false, running = false, raf = 0;
let idleAt = performance.now() + 1500, autoW = 0, lastT = 0, frames = 0;
const zOf = (c) => M[6] * c.x - M[7] * c.y + M[8] * c.z;
function frame() {
  raf = 0;
  const now = performance.now(), dt = Math.min(64, now - (lastT || now));
  lastT = now;
  if (!dragging && focused < 0) {
    if (velX || velY || velZ) {
      M = mul(rotZ(velZ), mul(rotX(velX), mul(rotY(velY), M)));
      velX *= .94; velY *= .94; velZ *= .94;
      if (Math.abs(velX) < 2e-5) velX = 0;
      if (Math.abs(velY) < 2e-5) velY = 0;
      if (Math.abs(velZ) < 2e-5) velZ = 0;
    }
    const want = !reduce.matches && now > idleAt + 3000 && isOn("revealed") ? 6e-5 : 0;
    autoW += (want - autoW) * .03;
    if (autoW > 1e-7) { const t = now * 1e-4; M = mul(rotAxis(Math.sin(t * 1.1) * .5, 1, Math.cos(t * .8) * .4, autoW * dt), M); }
  }
  if (++frames % 90 === 0) M = ortho(M);
  const p = clamp(scrollY / (VH * .16), 0, 1);
  camZ += (p * Math.min(64, R * .12) - camZ) * .075;
  world.style.transform = `translateZ(${camZ.toFixed(2)}px) ${css3(M)}`;
  const shade = 1 - Math.min(1, p * 1.6), near = persp * .66;
  for (let i = 0; i < N; i++) {
    const c = cards[i], zf = zOf(c);
    const base = .14 + .86 * Math.pow((zf + 1) / 2, .85);
    let dim = shade * (1 - base), fade = 1;
    const az = zf * R + camZ;
    if (az > near) fade = Math.max(0, 1 - (az - near) / 190);
    if (focused >= 0) { dim = Math.min(1, dim + .78); if (i === focused) fade = 0; }
    const d = Math.round(dim * 100) / 100, o = Math.round(fade * 100) / 100;
    if (d !== c.d) { c.el.style.setProperty("--d", d); c.d = d; }
    if (o !== c.o) { c.el.style.opacity = o; c.o = o; }
  }
  if (running) raf = requestAnimationFrame(frame);
}
function start() { if (!running) { running = true; lastT = 0; raf = requestAnimationFrame(frame); } }
function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }


/* ===== Обертання: одним пальцем або мишею — у будь-який бік на 360°;
   двома пальцями — поворот навколо центру (перевернути «з ніг на голову»); на комп'ютері те саме — Shift + перетягування ===== */
let ptr = null, twist = null;
const pts = new Map();
const pair = () => { const [p, q] = [...pts.values()]; return { a: Math.atan2(q.y - p.y, q.x - p.x), mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2 }; };
stage.addEventListener("pointerdown", (e) => {
  if (focused >= 0 || isOn("gridview") || (e.pointerType === "mouse" && e.button !== 0)) return;
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  idleAt = performance.now();
  if (pts.size === 2) {
    twist = pair(); ptr = null;
    for (const id of pts.keys()) { try { stage.setPointerCapture(id); } catch (_) {} }
    dragging = true; velX = velY = velZ = 0; start();
    return;
  }
  if (pts.size > 2) return;
  const card = e.target.closest(".card");
  ptr = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, card, type: e.pointerType, active: e.pointerType !== "touch" || !!card, moved: 0 };
  if (ptr.active) { try { stage.setPointerCapture(e.pointerId); } catch (_) {} dragging = true; velX = velY = velZ = 0; start(); }
});
stage.addEventListener("pointermove", (e) => {
  const pt = pts.get(e.pointerId);
  if (!pt) return;
  pt.x = e.clientX; pt.y = e.clientY;
  if (twist && pts.size >= 2) {
    const g = pair();
    let da = g.a - twist.a;
    if (da > Math.PI) da -= 2 * Math.PI; else if (da < -Math.PI) da += 2 * Math.PI;
    const ax = -(g.my - twist.my) * K, ay = (g.mx - twist.mx) * K;
    M = mul(rotZ(da), mul(rotX(ax), mul(rotY(ay), M)));
    velX = ax; velY = ay; velZ = da; twist = g; idleAt = performance.now();
    return;
  }
  if (!ptr || e.pointerId !== ptr.id) return;
  const tx = e.clientX - ptr.x0, ty = e.clientY - ptr.y0;
  ptr.moved = Math.max(ptr.moved, Math.hypot(tx, ty));
  if (!ptr.active) {
    if (Math.hypot(tx, ty) < 10) return;
    if (Math.abs(ty) > Math.abs(tx) * 1.15) { ptr = null; return; }
    ptr.active = true; dragging = true; velX = velY = velZ = 0;
    try { stage.setPointerCapture(e.pointerId); } catch (_) {}
    start();
  }
  const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
  ptr.x = e.clientX; ptr.y = e.clientY;
  if (e.shiftKey && e.pointerType === "mouse") {
    const az = dx * K; M = mul(rotZ(az), M); velX = velY = 0; velZ = az;
  } else {
    const ax = -dy * K, ay = dx * K; M = mul(rotX(ax), mul(rotY(ay), M)); velX = ax; velY = ay; velZ = 0;
  }
  idleAt = performance.now();
});
const endDrag = (e) => {
  if (!pts.delete(e.pointerId)) return;
  if (twist) { if (pts.size < 2) { twist = null; ptr = null; dragging = false; idleAt = performance.now(); } return; }
  if (!ptr || e.pointerId !== ptr.id) return;
  const slop = ptr.type === "touch" || coarse.matches ? 14 : 6;
  const click = e.type === "pointerup" && ptr.moved < slop, card = ptr.card;
  dragging = false; ptr = null; idleAt = performance.now();
  if (click) { velX = velY = velZ = 0; if (card) openShot(+card.dataset.idx, card); }
};
stage.addEventListener("pointerup", endDrag);
stage.addEventListener("pointercancel", endDrag);

/* ===== Скрол-стани ===== */
let deep = false, past = false;
function onScroll() {
  const y = scrollY;
  if ((y > VH * .04) !== deep) { deep = !deep; body.classList.toggle("deep", deep); }
  if ((y > VH * .5) !== past) { past = !past; body.classList.toggle("past", past); }
  if (y < VH * 1.02 && !document.hidden && !isOn("gridview")) start(); else stop();
}
addEventListener("scroll", onScroll, { passive: true });
document.addEventListener("visibilitychange", onScroll);
addEventListener("resize", () => { layout(); onScroll(); });
addEventListener("orientationchange", () => setTimeout(() => layout(true), 220));
if (window.visualViewport) visualViewport.addEventListener("resize", () => layout());
addEventListener("pagehide", () => ss.set("mt-y", String(scrollY)));

/* ===== Заставка і завантаження фото: спершу ті, що видно спереду ===== */
history.scrollRestoration = "manual";
const splash = $("#splash"), bar = $("#bar"), born = performance.now();
const seen = ss.get("mt-seen") === "1", hash = location.hash.length > 1 ? location.hash : "";
let revealed = false, need = 1, got = 0, restLoaded = false;
function tick(c) {
  if (!c.first) return;
  got++;
  if (bar) bar.style.transform = `scaleX(${Math.min(1, got / need)})`;
  if (got >= need) setTimeout(reveal, Math.max(0, (seen ? 200 : 1000) - (performance.now() - born)));
}
function loadRest() { if (restLoaded) return; restLoaded = true; cards.forEach(load); }
function reveal() {
  if (revealed) return;
  revealed = true;
  ss.set("mt-seen", "1");
  if (bar) bar.style.transform = "scaleX(1)";
  setTimeout(() => {
    body.classList.remove("locked");
    layout(true); frame(); requestAnimationFrame(() => layout(true));
    splash && splash.classList.add("out");
    body.classList.add("revealed");
    idleAt = performance.now();
    const target = hash && document.querySelector(hash);
    const y = +ss.get("mt-y") || 0;
    if (target) target.scrollIntoView();
    else if (y && performance.getEntriesByType("navigation")[0]?.type === "reload") scrollTo(0, y);
    onScroll();
    setTimeout(loadRest, 250);
    setTimeout(() => splash && splash.remove(), 950);
    setTimeout(() => body.classList.add("settled"), 2200);
  }, seen || hash ? 60 : 280);
}
layout(true); frame();
const order = cards.slice().sort((a, b) => zOf(b) - zOf(a));
const firstN = Math.min(N, 22);
order.slice(0, firstN).forEach((c) => { c.first = true; });
need = firstN;
order.slice(0, firstN).forEach(load);
onScroll();
setTimeout(reveal, hash ? 300 : seen ? 1400 : 3000);
setTimeout(loadRest, 4500);

/* ===== Кнопка «Назад» на телефоні: закриває фото, сітку чи меню й лишає на сайті ===== */
const stack = [];
let skipPop = 0, pendingBack = 0, backTimer = 0;
if (history.state && history.state.ov) history.replaceState(null, "");
function pushOv(name) { stack.push(name); try { history.pushState({ ov: name }, ""); } catch (_) {} }
function dropOv(name) {
  const i = stack.lastIndexOf(name);
  if (i < 0) return;
  stack.splice(i, 1); pendingBack++;
  clearTimeout(backTimer);
  backTimer = setTimeout(() => { const k = pendingBack; pendingBack = 0; skipPop++; history.go(-k); }, 0);
}
addEventListener("popstate", () => {
  if (skipPop) { skipPop--; return; }
  const top = stack.pop();
  if (top === "lit") closeShot(true); else if (top === "menu") setMenu(false, true); else if (top === "grid") toggleGrid(false, true);
});

/* ===== Сітка ===== */
const grid = $("#grid"), rows = $("#grid .rows"), gridBtn = $("#gridBtn");
let gridBuilt = false;
function toggleGrid(on = !isOn("gridview"), fromPop = false) {
  if (on === isOn("gridview")) return;
  if (on) pushOv("grid"); else if (!fromPop) dropOv("grid");
  if (on && !gridBuilt) {
    gridBuilt = true;
    rows.innerHTML = S.map((p, i) => `<figure data-idx="${i}" tabindex="0" role="button" aria-label="${P[p.p].t}"><img src="${p.src}" srcset="${p.s}" sizes="(max-width:640px) 46vw, 280px" alt="" loading="lazy" decoding="async"><figcaption>${P[p.p].t}</figcaption></figure>`).join("");
  }
  body.classList.toggle("gridview", on);
  grid.setAttribute("aria-hidden", String(!on));
  gridBtn.setAttribute("aria-pressed", String(on));
  lockScroll(); onScroll();
}
gridBtn.addEventListener("click", () => toggleGrid());
rows.addEventListener("click", (e) => { const f = e.target.closest("figure"); if (f) openShot(+f.dataset.idx, f); });
rows.addEventListener("keydown", (e) => { const f = e.target.closest("figure"); if (f && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openShot(+f.dataset.idx, f); } });

/* ===== Лайтбокс (FLIP) ===== */
const lit = $("#lit"), plate = $(".plate", lit), shot = $(".shot", lit), shotImg = $(".shot img", lit);
const litTitle = $("#litTitle"), litWhere = $("#litWhere"), litNote = $("#litNote"), litFact = $("#litFact"), litCredit = $("#litCredit"), litWant = $("#litWant");
let token = 0, srcEl = null, lastFocus = null, closeTimer = 0;
function flip(el, out) {
  if (!out) { plate.style.transition = "none"; plate.style.transform = ""; plate.style.opacity = ""; plate.offsetWidth; }
  const r0 = el.getBoundingClientRect(), r1 = shot.getBoundingClientRect();
  if (!r0.width || !r1.width) return false;
  plate.style.transformOrigin = `50% ${(r1.top - plate.getBoundingClientRect().top + r1.height / 2).toFixed(1)}px`;
  const s = Math.max(.04, r0.width / r1.width);
  const dx = r0.left + r0.width / 2 - (r1.left + r1.width / 2), dy = r0.top + r0.height / 2 - (r1.top + r1.height / 2);
  const tf = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(${s.toFixed(4)})`;
  if (out) { plate.style.transform = tf; plate.style.opacity = "0"; return true; }
  plate.style.transform = tf; plate.style.opacity = "0";
  plate.offsetWidth;
  plate.style.transition = plate.style.transform = plate.style.opacity = "";
  return true;
}
const litCount = $("#litCount");
let cur = null;
shotImg.draggable = false;
function fill(kind, idx, el, t) {
  if (kind === "sphere") {
    const s = S[idx], p = P[s.p], card = $(`.pcard[data-id="${p.id}"]`);
    litTitle.textContent = p.t;
    litWhere.textContent = $(".parea", card).textContent;
    litNote.textContent = $(".pstory", card).textContent;
    litFact.textContent = $(".pfact", card).lastChild.textContent;
    litCredit.innerHTML = `<a href="${s.page}" target="_blank" rel="noopener">${s.credit}</a>`;
    litWant.dataset.want = p.id;
    litCount.textContent = `${idx + 1} / ${N}`;
    lit.classList.remove("lit-apt");
    loadShot(el, s.src, s.full, t);
  } else {
    const a = D.apts[idx];
    litTitle.textContent = a.t; litWhere.textContent = D.aptWhere; litNote.textContent = a.d || ""; litFact.textContent = ""; litCredit.textContent = "";
    litCount.textContent = `${idx + 1} / ${D.apts.length}`;
    lit.classList.add("lit-apt");
    loadShot(el, a.src, a.full, t);
  }
  syncWants();
}
function openShot(idx, el, kind = "sphere") {
  const t = ++token;
  clearTimeout(closeTimer);
  if (!isOn("lit")) pushOv("lit");
  srcEl = el; lastFocus = document.activeElement; cur = { kind, idx };
  lit.classList.toggle("from-sphere", el.classList.contains("card"));
  if (kind === "sphere" && el.classList.contains("card")) focused = idx;
  fill(kind, idx, el, t);
  body.classList.add("lit"); lit.setAttribute("aria-hidden", "false"); lockScroll();
  lit.scrollTop = 0;
  if (!flip(el)) { plate.style.transition = plate.style.transform = plate.style.opacity = ""; }
  $(".xbtn", lit).focus({ preventScroll: true });
}
// Гортання: свайп по фото, кнопки ‹ ›, стрілки на клавіатурі.
function stepShot(d) {
  if (!cur || !isOn("lit")) return;
  const n = cur.kind === "apt" ? D.apts.length : N;
  cur.idx = (cur.idx + d + n) % n;
  if (focused >= 0) focused = cur.idx;
  srcEl = cur.kind === "apt" ? $(`[data-apt="${cur.idx}"]`) : focused >= 0 ? cards[cur.idx].el : null;
  shotImg.classList.add("swap");
  fill(cur.kind, cur.idx, null, ++token);
  lit.scrollTop = 0; idleAt = performance.now();
}
function loadShot(el, small, full, t) {
  const im = el && el.querySelector("img"), first = im && im.currentSrc ? im.currentSrc : small;
  let gotFull = false;
  shotImg.alt = litTitle.textContent;
  if (el) shotImg.src = first;
  else { const pre = new Image(); pre.onload = () => { if (t === token && !gotFull) { shotImg.src = first; shotImg.classList.remove("swap"); } }; pre.src = first; }
  const hi = new Image();
  hi.decoding = "async";
  hi.onload = () => { if (t === token) { gotFull = true; shotImg.src = full; shotImg.classList.remove("swap"); } };
  hi.src = full;
}
let sw = null;
shot.addEventListener("pointerdown", (e) => { if (!e.target.closest("button")) sw = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
shot.addEventListener("pointerup", (e) => {
  if (!sw || e.pointerId !== sw.id) return;
  const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
  sw = null;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) stepShot(dx < 0 ? 1 : -1);
});
shot.addEventListener("pointercancel", () => { sw = null; });
lit.addEventListener("click", (e) => { const b = e.target.closest("[data-step-shot]"); if (b) stepShot(+b.dataset.stepShot); });
function closeShot(fromPop = false) {
  if (!isOn("lit")) return;
  if (!fromPop) dropOv("lit");
  focused = -1; token++; idleAt = performance.now();
  body.classList.remove("lit"); lit.setAttribute("aria-hidden", "true");
  if (!(srcEl && document.contains(srcEl) && srcEl.offsetParent !== null && flip(srcEl, true))) plate.style.opacity = "0";
  closeTimer = setTimeout(() => { plate.style.transition = "none"; plate.style.transform = ""; plate.style.opacity = ""; plate.offsetWidth; plate.style.transition = ""; }, 640);
  lockScroll();
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}
lit.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeShot(); });
$$(".pimg").forEach((b) => b.addEventListener("click", () => openShot(+b.dataset.open, b)));
$$("[data-apt]").forEach((b) => b.addEventListener("click", () => openShot(+b.dataset.apt, b, "apt")));

/* ===== Меню і мови ===== */
const menu = $("#menu"), menuBtn = $("#menuBtn"), langs = $(".langs");
function setMenu(open, fromPop = false) {
  if (open === isOn("menuopen")) return;
  if (open) pushOv("menu"); else if (!fromPop) dropOv("menu");
  body.classList.toggle("menuopen", open);
  menu.setAttribute("aria-hidden", String(!open));
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.setAttribute("aria-label", open ? I.menuClose : I.menuOpen);
  if (open && langs) langs.open = false;
  lockScroll();
  if (open) setTimeout(() => { const a = $("#menu nav a"); a && a.focus({ preventScroll: true }); }, 350);
}
menuBtn.addEventListener("click", () => setMenu(!isOn("menuopen")));
menu.addEventListener("click", (e) => {
  const a = e.target.closest("a[href^='#']");
  if (!a) return;
  e.preventDefault();
  setMenu(false); if (isOn("gridview")) toggleGrid(false);
  const t = $(a.getAttribute("href"));
  if (t) setTimeout(() => t.scrollIntoView({ behavior: reduce.matches ? "auto" : "smooth" }), 40);
});
document.addEventListener("click", (e) => { if (langs && langs.open && !e.target.closest(".langs")) langs.open = false; });
$(".wordmark").addEventListener("click", (e) => { e.preventDefault(); setMenu(false); if (isOn("gridview")) toggleGrid(false); scrollTo({ top: 0, behavior: reduce.matches ? "auto" : "smooth" }); });
addEventListener("keydown", (e) => {
  if (isOn("lit") && (e.key === "ArrowRight" || e.key === "ArrowLeft")) { e.preventDefault(); stepShot(e.key === "ArrowRight" ? 1 : -1); return; }
  if (e.key !== "Escape") return;
  if (langs && langs.open) langs.open = false;
  else if (isOn("lit")) closeShot(); else if (isOn("menuopen")) { setMenu(false); menuBtn.focus(); } else if (isOn("gridview")) toggleGrid(false);
});

/* ===== Курсор ===== */
if (fine.matches) {
  const dot = $("#dot");
  let mx = -100, my = -100, cx = -100, cy = -100, on = false, moving = false;
  const loop = () => {
    cx += (mx - cx) * .2; cy += (my - cy) * .2;
    dot.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
    if (Math.abs(mx - cx) + Math.abs(my - cy) > .3) requestAnimationFrame(loop); else moving = false;
  };
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    mx = e.clientX; my = e.clientY;
    if (!on) { on = true; cx = mx; cy = my; dot.classList.add("on"); }
    dot.classList.toggle("wide", !!(e.target.closest && e.target.closest(".card,a,button,#grid figure,summary,.opt,.dayrow")));
    if (!moving) { moving = true; requestAnimationFrame(loop); }
  }, { passive: true });
  document.addEventListener("mouseout", (e) => { if (!e.relatedTarget) { on = false; dot.classList.remove("on"); } });
}

/* ===== Атлас: фільтри та «хочу сюди» ===== */
const atlas = $("#atlas");
$$(".chip[data-filter]").forEach((ch) => ch.addEventListener("click", () => {
  const f = ch.dataset.filter;
  $$(".chip[data-filter]").forEach((c) => c.setAttribute("aria-pressed", String(c === ch)));
  $$(".pcard", atlas).forEach((c) => { c.hidden = f !== "all" && c.dataset.region !== f; });
  atlas.scrollLeft = 0; atlasCount();
}));
// Лічильник «3 / 21» під стрічкою атласу на телефоні.
const aIdx = $("#aIdx"), aTot = $("#aTot");
function atlasCount() {
  const vis = $$(".pcard", atlas).filter((c) => !c.hidden);
  aTot.textContent = vis.length;
  if (!vis.length) return;
  const step = vis[0].getBoundingClientRect().width + 14;
  aIdx.textContent = clamp(Math.round(atlas.scrollLeft / step) + 1, 1, vis.length);
}
atlas.addEventListener("scroll", atlasCount, { passive: true });

/* ===== Підказка жестів на телефоні — один раз ===== */
const hint = $("#hint");
if (hint && coarse.matches && !store.get("mt-hint", false)) {
  let hid = false;
  const hide = () => { if (hid) return; hid = true; hint.classList.remove("on"); store.set("mt-hint", true); };
  const show = () => { if (hid) return; if (!isOn("revealed")) { setTimeout(show, 300); return; } hint.classList.add("on"); setTimeout(hide, 5200); };
  setTimeout(show, 900);
  stage.addEventListener("pointerdown", hide, { once: true });
}
const ids = new Set(P.map((p) => p.id));
let wants = new Set(store.get("mt-wants", []).filter((id) => ids.has(id)));
function syncWants() {
  $$("[data-want]").forEach((b) => {
    const on = wants.has(b.dataset.want);
    b.setAttribute("aria-pressed", String(on));
    $("span", b).textContent = on ? I.added : I.add;
  });
  $("#wantN").textContent = wants.size;
  const box = $("#picked");
  box.innerHTML = wants.size
    ? P.filter((p) => wants.has(p.id)).map((p) => `<button type="button" data-unwant="${p.id}">${p.t}</button>`).join("")
    : `<p>${B.pickedNone}</p>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-want]");
  if (b && b.dataset.want) { const id = b.dataset.want; wants.has(id) ? wants.delete(id) : wants.add(id); store.set("mt-wants", [...wants]); syncWants(); }
  const u = e.target.closest("[data-unwant]");
  if (u) { wants.delete(u.dataset.unwant); store.set("mt-wants", [...wants]); syncWants(); }
});

/* ===== Маршрути ===== */
const tabs = $$(".rtab"), panels = $$(".rpanel"), rts = $$(".map .rt");
let drawn = false;
function drawRoute(id) {
  if (reduce.matches) return;
  const g = rts.find((x) => x.dataset.route === id);
  $$("path.dp:not(.sea)", g).forEach((p, i) => {
    const L = p.getTotalLength();
    p.style.transition = "none"; p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
    p.getBoundingClientRect();
    p.style.transition = `stroke-dashoffset 1.6s cubic-bezier(.22,.61,.36,1) ${(i * .14).toFixed(2)}s`;
    p.style.strokeDashoffset = "0";
  });
}
function selRoute(id, focusTab) {
  tabs.forEach((t) => { const on = t.dataset.route === id; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; if (on && focusTab) t.focus(); });
  panels.forEach((p) => { p.hidden = p.dataset.route !== id; });
  rts.forEach((g) => g.classList.toggle("on", g.dataset.route === id));
  if (drawn) drawRoute(id);
}
tabs.forEach((t, i) => {
  t.addEventListener("click", () => selRoute(t.dataset.route));
  t.addEventListener("keydown", (e) => {
    const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (k) { e.preventDefault(); selRoute(tabs[(i + k + tabs.length) % tabs.length].dataset.route, true); }
  });
});
function focusDay(route, day) {
  rts.forEach((g) => {
    const act = route != null && g.dataset.route === route;
    g.classList.toggle("focus", act);
    $$(".dg", g).forEach((d) => d.classList.toggle("hot", act && d.dataset.day === day));
  });
}
$$(".dayrow").forEach((row) => {
  const r = row.closest(".rpanel").dataset.route;
  row.addEventListener("pointerenter", () => focusDay(r, row.dataset.day));
  row.addEventListener("focusin", () => focusDay(r, row.dataset.day));
  row.addEventListener("pointerleave", () => focusDay(null));
  row.addEventListener("focusout", () => focusDay(null));
});
selRoute(tabs[0].dataset.route);
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((en) => { if (en.some((x) => x.isIntersecting)) { drawn = true; drawRoute($(".rtab[aria-selected='true']").dataset.route); io.disconnect(); } }, { threshold: .35 });
  io.observe($(".map"));
  const ib = new IntersectionObserver((en) => body.classList.toggle("atbook", en[0].isIntersecting), { threshold: .05 });
  ib.observe($("#book"));
} else drawn = true;

/* ===== Бронювання ===== */
const form = $("#bookForm"), fArr = $("#fArr"), fDep = $("#fDep"), fG = $("#fGuests"), err = $("#formErr"), msgEl = $("#passMsg");
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const today = new Date();
fArr.min = iso(today);
const fmt = new Intl.DateTimeFormat(D.locale, { day: "numeric", month: "short", year: "numeric" });
const fmtShort = new Intl.DateTimeFormat(D.locale, { day: "numeric", month: "short" });
const parse = (v) => (v ? new Date(v + "T12:00:00") : null);
const val = (n) => (form.elements[n] ? String(form.elements[n].value || "").trim() : "");
const fields = ["arrival", "departure", "guests", "from", "name", "phone", "email", "notes"];
function readForm() {
  const a = parse(fArr.value), d = parse(fDep.value);
  const g = clamp(parseInt(fG.value, 10) || 1, 1, 99);
  const route = (form.querySelector("input[name=route]:checked") || {}).value || "custom";
  const extras = $$("input[name=extra]:checked", form).map((x) => x.value);
  const nights = a && d ? Math.round((d - a) / 864e5) : 0;
  return { a, d, g, route, extras, nights, from: val("from"), name: val("name"), phone: val("phone"), email: val("email"), notes: val("notes") };
}
function update(save = true) {
  const s = readForm();
  if (s.a) fDep.min = iso(new Date(s.a.getTime() + 864e5));
  $("#pFrom").textContent = s.from ? s.from.replace(/[^\p{L}]/gu, "").slice(0, 3).toUpperCase() || "EU" : "EU";
  $("#pFromSub").textContent = s.from ? s.from : B.europe;
  $("#pDates").textContent = s.a && s.d ? `${fmtShort.format(s.a)} → ${fmt.format(s.d)}` : s.a ? `${fmt.format(s.a)} → …` : "—";
  $("#pNights").textContent = s.nights > 0 ? s.nights : "—";
  $("#pPax").textContent = s.g;
  $("#pRoute").textContent = D.routes[s.route] || "—";
  const bus = s.extras.includes("transfer") ? (s.g <= 18 ? 1 : 2) : 0;
  $("#pBuses").textContent = bus ? (s.g > 36 ? "2+" : bus) : "—";
  $("#pSail").textContent = s.extras.includes("yacht") ? Math.ceil(s.g / 14) : "—";
  $("#pBig").hidden = s.g <= 36;
  if (save) store.set("mt-form", Object.fromEntries([...fields.map((f) => [f, form.elements[f].value]), ["route", s.route], ["extras", s.extras]]));
}
(function restore() {
  const v = store.get("mt-form", null);
  if (!v) return;
  fields.forEach((f) => { if (v[f] != null && form.elements[f]) form.elements[f].value = v[f]; });
  if (v.arrival && v.arrival < iso(today)) { form.elements.arrival.value = ""; form.elements.departure.value = ""; }
  const r = form.querySelector(`input[name=route][value="${v.route}"]`); if (r) r.checked = true;
  if (Array.isArray(v.extras)) $$("input[name=extra]", form).forEach((x) => { x.checked = v.extras.includes(x.value); });
})();
form.addEventListener("input", () => { err.textContent = ""; update(); });
form.addEventListener("change", () => update());
form.addEventListener("submit", (e) => e.preventDefault());
$$("[data-step]").forEach((b) => b.addEventListener("click", () => { fG.value = clamp((parseInt(fG.value, 10) || 1) + +b.dataset.step, 1, 99); update(); }));
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-prefill]");
  if (!a) return;
  const r = form.querySelector(`input[name=route][value="${a.dataset.prefill}"]`); if (r) r.checked = true;
  if (a.dataset.extra) { const x = form.querySelector(`input[name=extra][value="${a.dataset.extra}"]`); if (x) x.checked = true; }
  update();
});
function message(s) {
  const L = (k, v) => (v ? `${k}: ${v}` : "");
  const ex = s.extras.map((k) => B.ex[k]).join(", ");
  const pl = P.filter((p) => wants.has(p.id)).map((p) => p.t).join(", ");
  return [B.msgTitle, "",
    L(B.dates, `${fmt.format(s.a)} → ${fmt.format(s.d)} (${s.nights} ${plural(s.nights, I.plural.nights)})`),
    L(B.guests, s.g), L(B.route, D.routes[s.route]), L(B.extras, ex), L(B.picked, pl), L(B.from, s.from), "",
    L(B.name, s.name), L(B.phone, s.phone), L(B.email, s.email), L(B.notes, s.notes)
  ].filter((x, i, arr) => x !== "" || (i > 0 && arr[i - 1] !== "")).join("\n").trim();
}
function check() {
  const s = readForm();
  let m = "", el = null;
  if (!s.a || !s.d) { m = B.errDates; el = s.a ? fDep : fArr; }
  else if (s.nights < 1) { m = B.errOrder; el = fDep; }
  else if (!s.name || (!s.phone && !s.email)) { m = B.errContact; el = s.name ? $("#fPhone") : $("#fName"); }
  err.textContent = m;
  if (el) { el.focus(); el.scrollIntoView({ block: "center", behavior: reduce.matches ? "auto" : "smooth" }); return null; }
  return s;
}
$$("[data-send]").forEach((b) => b.addEventListener("click", async () => {
  msgEl.textContent = "";
  const s = check();
  if (!s) return;
  const text = message(s), how = b.dataset.send;
  if (how === "wa") window.open(`https://wa.me/${D.contacts.whatsapp}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  else if (how === "mail") location.href = `mailto:${D.contacts.email}?subject=${encodeURIComponent(B.msgTitle)}&body=${encodeURIComponent(text)}`;
  else if (how === "tg") {
    try { await navigator.clipboard.writeText(text); msgEl.textContent = B.tgCopied; } catch (_) {}
    window.open(`https://t.me/${D.contacts.telegram}`, "_blank", "noopener");
  } else if (how === "post" && D.endpoint) {
    try {
      const r = await fetch(D.endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ subject: B.msgTitle, message: text, name: s.name, email: s.email, phone: s.phone }) });
      msgEl.textContent = r.ok ? B.sent : B.failed;
    } catch (_) { msgEl.textContent = B.failed; }
  }
}));
syncWants();
update(false);
})();
