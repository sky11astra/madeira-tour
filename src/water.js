/* ===== Жива вода в басейні (WebGL2) =====
Поверх фото лежить прозоре полотно, яке перемальовує тільки воду. Хвилі рахуються чесно на сітці
в площині басейну, а перспективне перетворення накладає їх на фото так, щоб кола стискались удалині. */
const WATER_VS = `#version 300 es
layout(location=0) in vec2 p;
out vec2 v;
void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}`;
const WATER_FS = `#version 300 es
precision highp float;
in vec2 v;
out vec4 o;
uniform sampler2D uI,uG,uM;
uniform vec4 uC;
uniform mat3 uH,uA;
uniform vec2 uN;
uniform vec4 uP;
uniform float uT,uS;
vec2 hs(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
float web(vec2 p,float t){
vec2 i=floor(p),f=p-i;
float a=9.,b=9.;
for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
vec2 c=vec2(x,y),r=hs(i+c);
r=.5+.45*sin(t*(.5+r.yx)+6.283*r);
float d=length(c+r-f);
if(d<a){b=a;a=d;}else if(d<b)b=d;
}
return b-a;
}
vec2 sw(vec2 q,vec2 d,float k,float w){return d*cos(dot(q,d)*k+uT*w);}
void main(){
vec2 uv=v*uC.xy+uC.zw;
vec3 h=uH*vec3(uv,1.);
vec2 s=h.xy/h.z;
if(s.x<0.||s.y<0.||s.x>1.||s.y>1.){o=vec4(0.);return;}
vec2 m=texture(uM,s).rg;
if(m.x<.01){o=vec4(0.);return;}
vec2 q=s*uN;
vec2 w=q+2.6*vec2(sin(q.y*.06+uT*.35),cos(q.x*.05-uT*.3));
vec2 ga=(sw(w,vec2(.8,.6),.22,1.1)*.9+sw(w,vec2(-.55,.83),.31,-1.4)*.7+sw(w,vec2(.96,-.28),.47,1.9)*.5+sw(w,vec2(-.24,-.97),.71,-2.6)*.4+sw(w,vec2(.5,-.87),1.05,3.4)*.25)*uP.w;
vec2 gs=texture(uG,s).rg,g=ga+gs;
vec2 d=g*uP.x/uN*smoothstep(0.,1.,m.y);
vec3 a=uA*vec3(s+d,1.);
vec3 c=texture(uI,a.xy/a.z).rgb;
c*=1.+clamp(dot(gs+ga*.3,vec2(-.6,-.8))*uP.y,-.34,.42);
if(uP.z>0.){
vec2 z=q*.036+g*7.;
float n=min(web(z,uT*.9),web(z*1.62+vec2(3.1,1.7),-uT*.7)+.04);
n=pow(clamp(1.-n*2.6,0.,1.),8.)*uP.z*m.y;
c+=c*n*.34+vec3(.3,.42,.46)*n*.3;
}
vec3 N=normalize(vec3(-g*10.,1.));
float sp=pow(max(dot(N,normalize(vec3(-.3,-.4,1.))),0.),900.);
c+=vec3(1.,.985,.94)*sp*uS;
o=vec4(c*m.x,m.x);
}`;
const DROP_VS = `#version 300 es
layout(location=0) in vec4 a;
out float f;
void main(){gl_Position=vec4(a.xy,0.,1.);gl_PointSize=a.z;f=a.w;}`;
const DROP_FS = `#version 300 es
precision mediump float;
in float f;
out vec4 o;
void main(){
vec2 p=gl_PointCoord*2.-1.;
float d=dot(p,p);
if(d>1.)discard;
float a=smoothstep(1.,.35,d)*f;
vec3 c=mix(vec3(.72,.88,1.),vec3(1.),smoothstep(.75,0.,length(p-vec2(-.3,-.35))));
o=vec4(c*a,a);
}`;
const projH = (M, x, y) => { const w = M[6] * x + M[7] * y + M[8]; return [(M[0] * x + M[1] * y + M[2]) / w, (M[3] * x + M[4] * y + M[5]) / w]; };
// Перетворення квадрата 0…1 у чотирикутник на фото (рядки матриці 3×3).
function squareToQuad([[x0, y0], [x1, y1], [x2, y2], [x3, y3]]) {
  const dx1 = x1 - x2, dx2 = x3 - x2, sx = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, sy = y0 - y1 + y2 - y3, den = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
}
const adj3 = ([a, b, c, d, e, f, g, h, i]) => [e * i - f * h, c * h - b * i, b * f - c * e, f * g - d * i, a * i - c * g, c * d - a * f, d * h - e * g, b * g - a * h, a * e - b * d];
const colMajor = (m) => new Float32Array([m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]);

const liveWaters = new Set();
let waterRaf = 0, waterLast = 0;
function waterLoop(now) {
  waterRaf = liveWaters.size ? requestAnimationFrame(waterLoop) : 0;
  const dt = Math.min(.05, (now - waterLast) / 1000) || .016;
  waterLast = now;
  liveWaters.forEach((w) => w.tick(dt, now / 1000));
}

function makeWater(cv) {
  const gl = cv.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
  if (!gl) return null;
  const program = (vs, fs) => {
    const p = gl.createProgram();
    for (const [t, s] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); gl.attachShader(p, o); }
    gl.linkProgram(p);
    return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
  };
  const prog = program(WATER_VS, WATER_FS), dprog = program(DROP_VS, DROP_FS);
  if (!prog || !dprog) return null;
  const U = {};
  for (const n of ["uI", "uG", "uM", "uC", "uH", "uA", "uN", "uP", "uT", "uS"]) U[n] = gl.getUniformLocation(prog, n);
  gl.useProgram(prog);
  gl.uniform1i(U.uI, 0); gl.uniform1i(U.uG, 1); gl.uniform1i(U.uM, 2);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  const quad = gl.createVertexArray();
  gl.bindVertexArray(quad);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const MAXD = 90, dData = new Float32Array(MAXD * 4), dVao = gl.createVertexArray(), dBuf = gl.createBuffer();
  gl.bindVertexArray(dVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, dBuf);
  gl.bufferData(gl.ARRAY_BUFFER, dData.byteLength, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
  const tex = (unit) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t; };
  tex(0); tex(1); tex(2);

  const DAMP = .9915, KICK = .95, STEP = 1 / 60;
  let spec = null, img = null, cols = 0, rows = 0, h, vel, G, inside, edge, I, nL, nR, nU, nD, A, H, crop = [1, 1, 0, 0];
  let acc = 0, nextPlop = 0, T = 0, drops = [], lastTrail = 0, canvasPx = 600;

  function build(s) {
    spec = s; cols = s.n[0]; rows = s.n[1];
    const n = cols * rows, uv = (p) => [p[0] / s.w, p[1] / s.h];
    A = squareToQuad(s.q.map(uv)); H = adj3(A);
    const mc = document.createElement("canvas"); mc.width = cols; mc.height = rows;
    const x = mc.getContext("2d", { willReadFrequently: true });
    x.beginPath();
    (s.p || s.q).forEach((p, i) => { const [a, b] = projH(H, ...uv(p)); x[i ? "lineTo" : "moveTo"](a * cols, b * rows); });
    x.closePath(); x.fill();
    const px = x.getImageData(0, 0, cols, rows).data;
    h = new Float32Array(n); vel = new Float32Array(n); G = new Float32Array(n * 2);
    inside = new Uint8Array(n);
    const dist = new Float32Array(n), cells = [];
    for (let j = 0, i = 0; j < rows; j++) for (let k = 0; k < cols; k++, i++) {
      inside[i] = px[i * 4 + 3] > 127 && j > 0 && k > 0 && j < rows - 1 && k < cols - 1 ? 1 : 0;
      dist[i] = inside[i] ? 1e4 : 0;
      if (inside[i]) cells.push(i);
    }
    // Відстань до борту: біля борту заломлення згасає, щоб не тягнути на воду плитку й терасу.
    for (let i = 0; i < n; i++) if (inside[i]) dist[i] = Math.min(dist[i], dist[i - 1] + 1, dist[i - cols] + 1);
    for (let i = n - 1; i >= 0; i--) if (inside[i]) dist[i] = Math.min(dist[i], dist[i + 1] + 1, dist[i + cols] + 1);
    edge = new Uint8Array(n * 2);
    for (let i = 0; i < n; i++) { edge[i * 2] = px[i * 4 + 3]; edge[i * 2 + 1] = Math.min(255, dist[i] / 9 * 255); }
    const L = cells.length, at = (i) => (inside[i] ? i : -1);
    I = Int32Array.from(cells); nL = new Int32Array(L); nR = new Int32Array(L); nU = new Int32Array(L); nD = new Int32Array(L);
    for (let k = 0; k < L; k++) {
      const i = I[k], l = at(i - 1), r = at(i + 1), u = at(i - cols), d = at(i + cols);
      nL[k] = l < 0 ? i : l; nR[k] = r < 0 ? i : r; nU[k] = u < 0 ? i : u; nD[k] = d < 0 ? i : d;
    }
    gl.activeTexture(gl.TEXTURE1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, cols, rows, 0, gl.RG, gl.FLOAT, G);
    gl.activeTexture(gl.TEXTURE2);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8, cols, rows, 0, gl.RG, gl.UNSIGNED_BYTE, edge);
    gl.useProgram(prog);
    gl.uniformMatrix3fv(U.uH, false, colMajor(H));
    gl.uniformMatrix3fv(U.uA, false, colMajor(A));
    gl.uniform2f(U.uN, cols, rows);
    gl.uniform4f(U.uP, s.d, s.l, s.c, s.a);
    gl.uniform1f(U.uS, s.s);
    drops = []; nextPlop = 0;
  }
  function upload(el) {
    img = el;
    gl.activeTexture(gl.TEXTURE0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el);
  }
  function fit() {
    const cw = cv.clientWidth, ch = cv.clientHeight;
    if (!cw || !ch || !img) return;
    const k = Math.min(coarse.matches ? 1.5 : 2, devicePixelRatio || 1, Math.sqrt(1.15e6 / (cw * ch)));
    const W = Math.round(cw * k), Hh = Math.round(ch * k);
    if (cv.width !== W || cv.height !== Hh) { cv.width = W; cv.height = Hh; }
    canvasPx = W;
    const ir = img.naturalWidth / img.naturalHeight, cr = cw / ch;
    const [px, py] = getComputedStyle(img).objectPosition.split(" ").map((v) => (parseFloat(v) || 0) / 100);
    let sx = 1, sy = 1;
    if (cr > ir) sy = ir / cr; else sx = cr / ir;
    crop = [sx, sy, (1 - sx) * px, (1 - sy) * py];
    gl.useProgram(prog);
    gl.uniform4f(U.uC, ...crop);
  }
  function disturb(cx, cy, r, a) {
    const R = Math.ceil(r * 2.4), x0 = Math.round(cx), y0 = Math.round(cy), rr = r * r;
    for (let y = Math.max(1, y0 - R); y <= Math.min(rows - 2, y0 + R); y++) for (let x = Math.max(1, x0 - R); x <= Math.min(cols - 2, x0 + R); x++) {
      const i = y * cols + x;
      if (inside[i]) h[i] -= a * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / rr);
    }
  }
  function plop(x, y, p) {
    disturb(x, y, 2.8 + 3 * p, 1.5 * p);
    const n = Math.round(10 + 20 * p);
    for (let i = 0; i < n && drops.length < MAXD; i++) {
      const a = Math.random() * 6.283, r = Math.random(), sp = 14 + 48 * r * p;
      drops.push({ x, y, z: .2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 26 + 60 * (1 - r) * Math.random() * p, s: .7 + 1.9 * Math.random() * Math.random() });
    }
  }
  function randomPlop() {
    for (let t = 0; t < 30; t++) {
      const i = I[Math.floor(Math.random() * I.length)];
      if (edge[i * 2 + 1] > 200) { plop(i % cols, Math.floor(i / cols), .45 + Math.random() * .55); return; }
    }
  }
  function toCells(cx, cy) {
    const r = cv.getBoundingClientRect();
    const [u, v] = projH(H, (cx - r.left) / r.width * crop[0] + crop[2], (cy - r.top) / r.height * crop[1] + crop[3]);
    const x = u * cols, y = v * rows, i = Math.floor(y) * cols + Math.floor(x);
    return x > 0 && y > 0 && x < cols && y < rows && inside[i] ? [x, y] : null;
  }
  function stepSim() {
    for (let k = 0; k < I.length; k++) { const i = I[k]; vel[i] = (vel[i] + ((h[nL[k]] + h[nR[k]] + h[nU[k]] + h[nD[k]]) * .25 - h[i]) * KICK) * DAMP; }
    for (let k = 0; k < I.length; k++) { const i = I[k]; h[i] += vel[i]; }
  }
  function stepDrops(dt) {
    for (let j = drops.length - 1; j >= 0; j--) {
      const d = drops[j];
      d.vz -= 230 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
      if (d.z <= 0) {
        if (d.x > 1 && d.y > 1 && d.x < cols - 1 && d.y < rows - 1 && inside[Math.floor(d.y) * cols + Math.floor(d.x)]) disturb(d.x, d.y, 1.5, .09 + d.s * .025);
        drops.splice(j, 1);
      }
    }
  }
  function draw() {
    for (let k = 0; k < I.length; k++) { const i = I[k]; G[i * 2] = (h[nR[k]] - h[nL[k]]) * .5; G[i * 2 + 1] = (h[nD[k]] - h[nU[k]]) * .5; }
    gl.viewport(0, 0, cv.width, cv.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.useProgram(prog); gl.bindVertexArray(quad);
    gl.uniform1f(U.uT, T);
    gl.activeTexture(gl.TEXTURE1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, cols, rows, gl.RG, gl.FLOAT, G);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!drops.length) return;
    const sc = Math.max(.75, canvasPx / 620);
    drops.forEach((d, j) => {
      const [u, v] = projH(A, d.x / cols, (d.y - d.z * spec.z) / rows);
      dData[j * 4] = ((u - crop[2]) / crop[0]) * 2 - 1;
      dData[j * 4 + 1] = 1 - ((v - crop[3]) / crop[1]) * 2;
      dData[j * 4 + 2] = d.s * sc * 2;
      dData[j * 4 + 3] = .78;
    });
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(dprog); gl.bindVertexArray(dVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, dBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, dData.subarray(0, drops.length * 4));
    gl.drawArrays(gl.POINTS, 0, drops.length);
  }
  const ro = new ResizeObserver(fit);
  ro.observe(cv);
  const api = {
    get ready() { return !!(spec && img); },
    set(el, s) { const fresh = s !== spec; if (fresh) build(s); upload(el); fit(); if (fresh) { T = Math.random() * 90; nextPlop = 0; } },
    play() { if (api.ready && !liveWaters.has(api)) { liveWaters.add(api); waterLast = performance.now(); if (!waterRaf) waterRaf = requestAnimationFrame(waterLoop); } },
    pause() { liveWaters.delete(api); },
    tick(dt, now) {
      if (api.bg && isOn("lit")) return;
      T += dt;
      if (now > nextPlop) { if (nextPlop) randomPlop(); nextPlop = now + (nextPlop ? 1.2 + Math.random() * 2.2 : .35); }
      acc += dt;
      for (let i = 0; acc >= STEP && i < 3; i++) { stepSim(); acc -= STEP; }
      if (acc > STEP) acc = 0;
      stepDrops(dt);
      draw();
    },
    plopAt(x, y) { if (!api.ready) return false; const c = toCells(x, y); if (c) { plop(c[0], c[1], 1); return true; } return false; },
    trail(x, y) { const t = performance.now(); if (!api.ready || t - lastTrail < 34) return; lastTrail = t; const c = toCells(x, y); if (c) disturb(c[0], c[1], 2.2, .1); }
  };
  cv.addEventListener("webglcontextlost", () => { api.pause(); cv.style.display = "none"; });
  return api;
}
