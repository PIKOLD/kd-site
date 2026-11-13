// Концепция 5 «Кино»: прокрутка = монтаж. Одна WebGL-сцена, слова — маски из 2D-canvas.
import * as THREE from 'three';

const root = document.documentElement;
const $ = (id) => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const sm = (x) => x * x * (3 - 2 * x);
const smr = (t, a, b) => sm(seg(t, a, b));
const win = (t, a, b, c, d) => Math.min(smr(t, a, b), 1 - smr(t, c, d));
const ioc = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a, b, k) => a + (b - a) * k;

function goStatic(why) {
  root.classList.add('static');
  if (why && window.__errs) window.__errs.push('film static: ' + why);
}

// ---------------------------------------------------------------- данные
const VIDS = [
  { v: 'cat28lin', name: 'cat28lin', tag: 'концепт · портупеи и ремни' },
  { v: 'miele', name: 'Шоурум Miele', tag: 'клиент · Пермь' },
  { v: 'masy', name: 'MASY', tag: 'клиент · бренд одежды' },
  { v: 'bonkombinezon', name: 'Bonkombinezon', tag: 'концепт · зимние комбинезоны' },
  { v: 'allyouall', name: 'All.', tag: 'концепт · мужская одежда' },
  { v: 'hamlet', name: 'Hamlet Coffee', tag: 'концепт · кофейня, Бруклин' },
];

// Монтажный лист: единица — один экран прокрутки.
const K = {
  f1a: 0.55, f1b: 1.55,   // наезд сквозь букву «САЙТ»
  s2a: 1.55, s2b: 4.45,   // шесть сайтов на весь экран
  f2a: 4.55, f2b: 5.35,   // отъезд из буквы «0 ₽»
  p1a: 6.1, p1b: 6.9,     // «0 ₽» → частицы → «24»
  p2a: 7.9, p2b: 8.6,     // «24» → «&»
  p3a: 9.5, p3b: 10.1,    // «&» → пыль
  cr0: 9.75, cr1: 12.3,   // титры
  p4a: 12.15, p4b: 12.95, // пыль → «ВАШ САЙТ»
  end: 13.7,
};
const SCENES = [
  [0, 'Сайт'], [1.75, 'Показываем'], [5.4, '0 ₽'], [6.95, '24 часа'],
  [8.75, 'Двое'], [10.35, 'Цены'], [13.05, 'Ваш сайт'],
];

const WORDS = {
  site: (p) => (p ? { lines: ['САЙТ'], w: 0.9, h: 0.2, cy: 0.42 } : { lines: ['САЙТ'], w: 0.9, h: 0.44, cy: 0.43 }),
  zero: (p) => (p ? { lines: ['0 ₽'], w: 0.8, h: 0.24, cy: 0.37 } : { lines: ['0 ₽'], w: 0.52, h: 0.46, cy: 0.39 }),
  h24: (p) => (p ? { lines: ['24'], w: 0.64, h: 0.26, cy: 0.36 } : { lines: ['24'], w: 0.33, h: 0.44, cy: 0.37 }),
  amp: (p) => (p ? { lines: ['&'], w: 0.3, h: 0.15, cy: 0.47 } : { lines: ['&'], w: 0.2, h: 0.32, cy: 0.44 }),
  your: (p) => (p ? { lines: ['ВАШ', 'САЙТ'], w: 0.84, h: 0.32, cy: 0.36 } : { lines: ['ВАШ САЙТ'], w: 0.86, h: 0.33, cy: 0.39 }),
};
const FONT = '"Unbounded"';

// ---------------------------------------------------------------- шейдеры
const VS = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const ICE = /* glsl */`
vec3 ice(float x){
  x = clamp(x, 0.0, 1.0);
  vec3 a = vec3(0.918, 0.949, 1.0);
  vec3 b = vec3(0.612, 0.769, 1.0);
  vec3 c = vec3(0.486, 0.549, 1.0);
  return x < 0.5 ? mix(a, b, x * 2.0) : mix(b, c, x * 2.0 - 1.0);
}
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
`;

const FIT = /* glsl */`
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform float uOpacity;
uniform float uFit;
vec2 fitUV(vec2 uv, float scale, out float inside){
  float sa = uRes.x / uRes.y;
  float va = 1.6;
  vec2 cover = sa > va ? vec2(sa, sa / va) : vec2(va, 1.0);
  vec2 contain = sa > va ? vec2(va, 1.0) : vec2(sa, sa / va);
  vec2 sz = mix(cover, contain, uFit) * scale;
  vec2 q = (uv - 0.5) * vec2(sa, 1.0) / sz + 0.5;
  inside = step(0.0, q.x) * step(q.x, 1.0) * step(0.0, q.y) * step(q.y, 1.0);
  return q;
}
`;

// Полноэкранное видео со сменой «жалюзи» (сцена 2)
const SCREEN_FS = ICE + FIT + /* glsl */`
uniform sampler2D uA;
uniform sampler2D uB;
uniform float uMix;
void main(){
  float bands = 6.0;
  float yb = (1.0 - vUv.y) * bands;
  float bi = floor(yb);
  float yt = fract(yb);
  float st = bi / bands * 0.45;
  float lp = clamp((uMix - st) / 0.55, 0.0, 1.0);
  lp = lp * lp * (3.0 - 2.0 * lp);
  float edgeP = lp * 1.06 - 0.03;
  float showB = clamp((edgeP - yt) / 0.03 + 0.5, 0.0, 1.0);
  float ia; float ib;
  vec2 qa = fitUV(vUv, 1.0 + 0.06 * uMix, ia);
  vec2 qb = fitUV(vUv, 1.08 - 0.08 * lp, ib);
  vec3 ca = texture2D(uA, qa).rgb * ia * (1.0 - 0.5 * uMix);
  vec3 cb = texture2D(uB, qb).rgb * ib;
  vec3 col = mix(ca, cb, showB);
  float line = exp(-abs(edgeP - yt) * 140.0) * step(0.001, lp) * step(lp, 0.999);
  col += ice(0.4) * line * 0.55 * max(ia, ib);
  col += (hash(vUv * uRes + fract(uTime) * 91.0) - 0.5) * 0.035;
  gl_FragColor = vec4(col * uOpacity, uOpacity);
}
`;

// Слово-маска: R — заливка, G — размытая заливка (рельеф), B — контур.
const WORD_FS = ICE + FIT + /* glsl */`
uniform sampler2D uMask;
uniform sampler2D uVid;
uniform vec2 uCam;
uniform float uZoom;
uniform float uReveal;
uniform float uFillVideo;
uniform float uFillLit;
uniform float uOutline;
uniform vec2 uTilt;
uniform vec2 uLight;
uniform vec2 uTexel;
uniform float uVidScale;
uniform float uBlur;

vec3 mk(vec2 p){
  if (p.x < 0.0 || p.y < 0.0 || p.x > 1.0 || p.y > 1.0) return vec3(0.0);
  return texture2D(uMask, p).rgb;
}

void main(){
  vec2 p = uCam + (vUv - 0.5) / uZoom;
  vec3 m = mk(p);
  float R = smoothstep(0.25, 0.75, m.r);
  float G = m.g;
  float B = m.b;
  float rv = clamp(uReveal * 1.35 - vUv.x * 0.35, 0.0, 1.0);
  float fillA = mix(G * 0.5, R, smoothstep(0.2, 1.0, rv)) * smoothstep(0.0, 0.4, rv);

  vec3 col = vec3(0.0);
  float a = 0.0;

  if (uFillVideo > 0.001) {
    float ins;
    vec2 q = fitUV(vUv, uVidScale, ins);
    vec3 vid = texture2D(uVid, q).rgb * ins;
    float zk = smoothstep(1.5, 6.0, uZoom);
    float rim = R * (1.0 - smoothstep(0.5, 0.97, G)) * (1.0 - zk);
    vec3 c = vid * mix(0.92 + 0.2 * rim, 1.0, zk) + vec3(0.55, 0.68, 1.0) * rim * 0.16;
    float frame = B * 0.14 * smoothstep(0.6, 1.0, rv) * (1.0 - zk);
    col += (c * fillA + vec3(0.92, 0.95, 1.0) * frame) * uFillVideo;
    a += max(fillA, frame) * uFillVideo;
  }

  if (uFillLit > 0.001) {
    vec2 tx = uTexel * uBlur * 0.6;
    float gL = mk(p - vec2(tx.x, 0.0)).g;
    float gR = mk(p + vec2(tx.x, 0.0)).g;
    float gD = mk(p - vec2(0.0, tx.y)).g;
    float gU = mk(p + vec2(0.0, tx.y)).g;
    vec3 n = normalize(vec3((gL - gR) * 2.2, (gD - gU) * 2.2, 1.0));
    vec3 L = normalize(vec3(uLight, 0.8));
    float dif = clamp(dot(n, L), 0.0, 1.0);
    float spe = pow(clamp(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 28.0);
    float fr = 1.0 - n.z;
    float band = 0.5 + 0.5 * sin(dot(vUv, vec2(2.2, 1.3)) * 2.4 - uTime * 0.35 + uLight.x * 1.8);
    vec3 face = mix(ice(0.95) * 0.42, ice(0.05 + 0.5 * (1.0 - vUv.y)), 0.35 + 0.65 * band);
    face = face * (0.62 + 0.5 * dif) + vec3(1.0) * spe * 0.85 + ice(0.3) * fr * 1.2;

    float side = 0.0;
    float sk = 1.0;
    if (abs(uTilt.x) + abs(uTilt.y) > 0.00001) {
      for (int i = 1; i <= STEPS; i++) {
        float fi = float(i) / float(STEPS);
        float s = smoothstep(0.25, 0.75, mk(p - uTilt * fi).r);
        if (s > 0.02 && side < 0.02) sk = fi;
        side = max(side, s);
      }
    }
    vec3 sideC = mix(vec3(0.17, 0.36, 1.0) * 0.6, vec3(0.025, 0.035, 0.09), sqrt(sk)) * (0.8 + 0.3 * band);
    vec3 lc = mix(sideC * side, face, R);
    col += lc * uFillLit;
    a += max(R, side) * uFillLit;
  }

  if (uOutline > 0.001) {
    float fl = 0.5 + 0.5 * sin(p.x * 7.0 - uTime * 0.6 + sin(p.y * 5.0 + uTime * 0.3) * 1.5);
    float br = 0.78 + 0.22 * sin(uTime * 0.9);
    vec3 inner = ice(0.15 + 0.7 * fl) * (0.05 + 0.22 * G * G) * br;
    vec3 c = inner * R + ice(0.12) * B * 0.95 + ice(0.55) * G * (1.0 - R) * 0.1;
    col += c * uOutline;
    a += max(R * 0.4, B) * uOutline;
  }

  a = clamp(a, 0.0, 1.0);
  col += (hash(vUv * uRes + fract(uTime) * 91.0) - 0.5) * 0.035 * a;
  gl_FragColor = vec4(col * uOpacity, a * uOpacity);
}
`;

const PART_VS = /* glsl */`
attribute vec2 aA;
attribute vec2 aB;
attribute vec4 aR;
uniform vec2 uRes;
uniform float uP;
uniform float uTime;
uniform float uDrift;
uniform float uDustA;
uniform float uDustB;
uniform float uZA;
uniform float uZB;
uniform float uSize;
uniform float uScatter;
varying float vA;
varying float vC;
vec2 dust(vec2 q){
  float h = uRes.y * 1.4;
  q.y = mod(q.y + uRes.y * 0.2 - uDrift * (0.6 + aR.z * 0.8), h) - uRes.y * 0.2;
  q.x += sin(uTime * 0.2 + aR.w * 6.2831853) * 8.0;
  return q;
}
void main(){
  vec2 c = uRes * 0.5;
  vec2 a = aA;
  vec2 b = aB;
  if (uDustA > 0.5) a = dust(a);
  if (uDustB > 0.5) b = dust(b);
  a = c + (a - c) * uZA;
  b = c + (b - c) * uZB;
  float d = aR.x * 0.4;
  float k = clamp((uP - d) / 0.6, 0.0, 1.0);
  k = k * k * (3.0 - 2.0 * k);
  vec2 pos = mix(a, b, k);
  float mid = sin(3.14159265 * k);
  float ang = aR.y * 6.2831853 + uTime * 0.25 + k * 3.0;
  pos += vec2(cos(ang), sin(ang)) * mid * (40.0 + aR.z * 260.0) * uScatter * min(uRes.x, uRes.y) / 900.0;
  pos += vec2(sin(uTime * 1.3 + aR.w * 40.0), cos(uTime * 1.1 + aR.z * 30.0)) * 0.8;
  vec2 ndc = pos / uRes * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  gl_PointSize = uSize * (0.55 + aR.z * 0.9) * (1.0 + mid * 0.8);
  vA = 0.55 + 0.45 * sin(uTime * (1.0 + aR.w * 2.0) + aR.y * 20.0);
  vC = aR.w;
}
`;
const PART_FS = ICE + /* glsl */`
uniform float uOpacity;
varying float vA;
varying float vC;
void main(){
  vec2 q = gl_PointCoord - 0.5;
  float s = smoothstep(0.5, 0.05, length(q));
  vec3 col = mix(ice(vC), vec3(1.0), 0.3);
  gl_FragColor = vec4(col, s * vA * uOpacity);
}
`;

// ---------------------------------------------------------------- маски слов
function layoutWord(ctx, cw, ch, spec) {
  ctx.font = `700 100px ${FONT}`;
  let maxW = 0, asc = 0, desc = 0;
  for (const l of spec.lines) {
    const mt = ctx.measureText(l);
    maxW = Math.max(maxW, mt.width);
    asc = Math.max(asc, mt.actualBoundingBoxAscent || 72);
    desc = Math.max(desc, mt.actualBoundingBoxDescent || 2);
  }
  const lh = 98; // межстрочный при 100px
  const n = spec.lines.length;
  const block100 = asc + desc + (n - 1) * lh;
  const size = Math.max(8, Math.min((spec.w * cw) / maxW * 100, (spec.h * ch) / block100 * 100));
  const k = size / 100;
  const top = spec.cy * ch - (block100 * k) / 2;
  const lines = spec.lines.map((t, i) => ({ t, x: cw / 2, y: top + asc * k + i * lh * k }));
  return { size, lines, bbox: { x0: (cw - maxW * k) / 2, x1: (cw + maxW * k) / 2, y0: top, y1: top + block100 * k } };
}

function paintWord(cv, spec, full) {
  const ctx = cv.getContext('2d', { willReadFrequently: !full });
  const cw = cv.width, ch = cv.height;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cw, ch);
  const L = layoutWord(ctx, cw, ch, spec);
  ctx.font = `700 ${L.size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ff0000';
  for (const l of L.lines) ctx.fillText(l.t, l.x, l.y);
  if (full) {
    ctx.globalCompositeOperation = 'lighter';
    // размытая копия через тень (работает во всех браузерах, в отличие от ctx.filter)
    const off = cw + L.size * 4;
    ctx.save();
    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = Math.max(4, L.size * 0.07);
    ctx.shadowOffsetX = off;
    ctx.fillStyle = '#00ff00';
    for (const l of L.lines) ctx.fillText(l.t, l.x - off, l.y);
    ctx.restore();
    // контур: обводку рисуем на отдельном слое и вырезаем всё, что внутри букв, —
    // иначе у шрифта с перекрывающимися частями видны линии стыков внутри букв
    const oc = document.createElement('canvas');
    oc.width = ctx.canvas.width; oc.height = ctx.canvas.height;
    const o = oc.getContext('2d');
    o.setTransform(ctx.getTransform());
    o.font = ctx.font; o.textAlign = ctx.textAlign; o.textBaseline = ctx.textBaseline;
    try { o.letterSpacing = ctx.letterSpacing; } catch (e) {}
    o.strokeStyle = '#0000ff';
    o.lineJoin = 'round';
    o.lineWidth = Math.max(3, L.size * 0.024);
    for (const l of L.lines) o.strokeText(l.t, l.x, l.y);
    o.globalCompositeOperation = 'destination-out';
    o.fillStyle = '#000';
    for (const l of L.lines) o.fillText(l.t, l.x, l.y);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(oc, 0, 0);
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
  }
  return L;
}

// ---------------------------------------------------------------- запуск
async function boot() {
  if (root.classList.contains('static')) return;

  const canvas = $('gl');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  } catch (e) {
    goStatic('webgl');
    return;
  }
  if (!renderer || !renderer.getContext()) { goStatic('webgl'); return; }
  renderer.setClearColor(0x000000, 1);
  renderer.autoClear = true;

  try {
    if (document.fonts && document.fonts.load) {
      await Promise.all([
        document.fonts.load(`700 100px ${FONT}`, 'САЙТВАШ0₽24&'),
        document.fonts.load(`600 100px ${FONT}`, 'ЧАСА'),
        document.fonts.load('500 20px "Inter"', 'Аа'),
        document.fonts.load('600 20px "Inter"', 'Аа'),
      ]);
      await document.fonts.ready;
    }
  } catch (e) { /* рисуем системным шрифтом */ }
  if (root.classList.contains('static')) return;

  const stage = $('stage');
  const film = $('film');
  const COARSE = window.matchMedia('(pointer: coarse)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(DPR);

  let W = 0, H = 0, PORT = false, MOBILE = false, SC = 1;
  const N = (COARSE || window.innerWidth < 760) ? 3200 : 8000;
  const STEPS = (COARSE || window.innerWidth < 760) ? 12 : 26;

  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.PlaneGeometry(2, 2);
  const blendPremul = {
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  };

  // ---- видео: только нужные играют
  const vbox = $('vbox');
  const loader = new THREE.TextureLoader();
  const clips = VIDS.map((c) => {
    const v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.loop = true; v.preload = 'metadata';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
    v.src = `../../assets/video/${c.v}.mp4`;
    vbox.appendChild(v);
    const poster = loader.load(`../../assets/video/${c.v}.jpg`);
    poster.minFilter = THREE.LinearFilter; poster.generateMipmaps = false;
    const vt = new THREE.VideoTexture(v);
    const clip = { ...c, el: v, poster, vt, ready: false, pending: false };
    const markReady = () => { if (v.readyState >= 2) clip.ready = true; };
    v.addEventListener('loadeddata', markReady);
    v.addEventListener('playing', markReady);
    return clip;
  });
  const texOf = (i) => (clips[i].ready ? clips[i].vt : clips[i].poster);
  function manageVideos(want) {
    clips.forEach((c, i) => {
      const w = want.has(i) && !document.hidden;
      if (w && c.el.paused && !c.pending) {
        c.pending = true;
        const pr = c.el.play();
        if (pr && pr.then) pr.then(() => { c.pending = false; }, () => { c.pending = false; });
        else c.pending = false;
      } else if (!w && !c.el.paused) {
        c.el.pause();
      }
    });
  }

  // ---- слой «экран» (сцена 2)
  const screenMat = new THREE.ShaderMaterial({
    uniforms: {
      uA: { value: null }, uB: { value: null }, uMix: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uOpacity: { value: 1 }, uFit: { value: 0 },
    },
    vertexShader: VS, fragmentShader: SCREEN_FS, ...blendPremul,
  });
  const screen = new THREE.Mesh(quad, screenMat);
  screen.frustumCulled = false; screen.renderOrder = 0; screen.visible = false;
  scene.add(screen);

  // ---- слои-слова
  function wordMat() {
    return new THREE.ShaderMaterial({
      uniforms: {
        uMask: { value: null }, uVid: { value: null },
        uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uOpacity: { value: 0 }, uFit: { value: 0 },
        uCam: { value: new THREE.Vector2(0.5, 0.5) }, uZoom: { value: 1 }, uReveal: { value: 1 },
        uFillVideo: { value: 0 }, uFillLit: { value: 0 }, uOutline: { value: 0 },
        uTilt: { value: new THREE.Vector2(0, 0) }, uLight: { value: new THREE.Vector2(-0.5, 0.6) },
        uTexel: { value: new THREE.Vector2(0.001, 0.001) }, uVidScale: { value: 1 }, uBlur: { value: 8 },
      },
      defines: { STEPS },
      vertexShader: VS, fragmentShader: WORD_FS, ...blendPremul,
    });
  }
  const words = {};
  for (const key of Object.keys(WORDS)) {
    const mesh = new THREE.Mesh(quad, wordMat());
    mesh.frustumCulled = false; mesh.renderOrder = 1; mesh.visible = false;
    scene.add(mesh);
    words[key] = { key, mesh, u: mesh.material.uniforms, tex: null, box: null, focus: { u: 0.5, v: 0.5, r: 20 }, pts: null };
  }

  // ---- частицы
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const attA = new THREE.BufferAttribute(new Float32Array(N * 2), 2);
  const attB = new THREE.BufferAttribute(new Float32Array(N * 2), 2);
  attA.setUsage(THREE.DynamicDrawUsage); attB.setUsage(THREE.DynamicDrawUsage);
  const rnd = new Float32Array(N * 4);
  for (let i = 0; i < N * 4; i++) rnd[i] = Math.random();
  pg.setAttribute('aA', attA);
  pg.setAttribute('aB', attB);
  pg.setAttribute('aR', new THREE.BufferAttribute(rnd, 4));
  const partMat = new THREE.ShaderMaterial({
    uniforms: {
      uRes: { value: new THREE.Vector2(1, 1) }, uP: { value: 0 }, uTime: { value: 0 }, uDrift: { value: 0 },
      uDustA: { value: 0 }, uDustB: { value: 0 }, uZA: { value: 1 }, uZB: { value: 1 },
      uSize: { value: 2.5 }, uScatter: { value: 1 }, uOpacity: { value: 0 },
    },
    vertexShader: PART_VS, fragmentShader: PART_FS,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(pg, partMat);
  points.frustumCulled = false; points.renderOrder = 2; points.visible = false;
  scene.add(points);
  const shapes = {};
  let curPair = '';
  function setPair(a, b) {
    const id = a + '>' + b;
    if (id === curPair) return;
    curPair = id;
    attA.array.set(shapes[a]); attA.needsUpdate = true;
    attB.array.set(shapes[b]); attB.needsUpdate = true;
  }

  // ---- анализ формы: точки для частиц и самая «толстая» точка буквы для наезда
  function analyze(spec) {
    const ss = Math.min(1, 520 / W);
    const sw = Math.max(4, Math.round(W * ss)), sh = Math.max(4, Math.round(H * ss));
    const cv = document.createElement('canvas');
    cv.width = sw; cv.height = sh;
    paintWord(cv, spec, false);
    const data = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, sw, sh).data;
    const bin = new Uint8Array(sw * sh);
    const inside = [];
    for (let i = 0; i < sw * sh; i++) if (data[i * 4] > 140) { bin[i] = 1; inside.push(i); }
    const pts = new Float32Array(N * 2);
    for (let k = 0; k < N; k++) {
      const idx = inside.length ? inside[(Math.random() * inside.length) | 0] : 0;
      pts[k * 2] = ((idx % sw) + Math.random()) / ss;
      pts[k * 2 + 1] = (((idx / sw) | 0) + Math.random()) / ss;
    }
    // фаска-расстояние (chamfer) до края
    const d = new Float32Array(sw * sh);
    for (let i = 0; i < sw * sh; i++) d[i] = bin[i] ? 1e6 : 0;
    const D2 = 1.414;
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const i = y * sw + x; if (!d[i]) continue;
      let v = d[i];
      v = x > 0 ? Math.min(v, d[i - 1] + 1) : Math.min(v, 1);
      if (y > 0) {
        v = Math.min(v, d[i - sw] + 1);
        if (x > 0) v = Math.min(v, d[i - sw - 1] + D2);
        if (x < sw - 1) v = Math.min(v, d[i - sw + 1] + D2);
      } else v = Math.min(v, 1);
      d[i] = v;
    }
    for (let y = sh - 1; y >= 0; y--) for (let x = sw - 1; x >= 0; x--) {
      const i = y * sw + x; if (!d[i]) continue;
      let v = d[i];
      v = x < sw - 1 ? Math.min(v, d[i + 1] + 1) : Math.min(v, 1);
      if (y < sh - 1) {
        v = Math.min(v, d[i + sw] + 1);
        if (x < sw - 1) v = Math.min(v, d[i + sw + 1] + D2);
        if (x > 0) v = Math.min(v, d[i + sw - 1] + D2);
      } else v = Math.min(v, 1);
      d[i] = v;
    }
    let best = -1, bi = 0;
    for (let i = 0; i < sw * sh; i++) {
      if (!d[i]) continue;
      const sc = d[i] * (1 - 0.5 * Math.abs((i % sw) / sw - 0.5));
      if (sc > best) { best = sc; bi = i; }
    }
    const fx = bi % sw, fy = (bi / sw) | 0;
    return { pts, focus: { u: (fx + 0.5) / sw, v: 1 - (fy + 0.5) / sh, r: Math.max(1, d[bi] - 1.2) / ss } };
  }

  // ---- DOM
  const el = {
    s1cap: $('s1cap'), hint: $('hint'), s2shade: $('s2shade'), s2title: $('s2title'), s2cap: $('s2cap'),
    clipN: $('clipN'), clipName: $('clipName'), clipTag: $('clipTag'),
    s3cap: $('s3cap'), s4word: $('s4word'), s4proc: $('s4proc'), track: $('track'),
    whoK: $('whoK'), whoD: $('whoD'), s5cap: $('s5cap'), crwin: $('crwin'), crroll: $('crroll'), s7: $('s7'),
  };
  const trackItems = Array.from(el.track.children);
  let trackCenters = [0, 0, 0, 0, 0];
  let crH = 1000;
  function vis(node, o, tf) {
    o = clamp(o);
    const ov = o.toFixed(3);
    if (node._o !== ov) {
      node._o = ov;
      node.style.opacity = ov;
      const v = o > 0.002 ? 'visible' : 'hidden';
      if (node._v !== v) { node._v = v; node.style.visibility = v; }
    }
    if (tf !== undefined && node._t !== tf) { node._t = tf; node.style.transform = tf; }
  }

  // индикатор сцен
  const rail = $('rail');
  const railBtns = SCENES.map(([at, name], i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Сцена ${i + 1}: ${name}`);
    b.title = name;
    b.innerHTML = '<i></i>';
    b.addEventListener('click', () => {
      const top = film.getBoundingClientRect().top + window.scrollY + at * H + 2;
      window.scrollTo({ top, behavior: 'auto' });
    });
    li.appendChild(b); rail.appendChild(li);
    return b;
  });
  let railOn = -1;

  // ---- раскладка (на старте и при смене размера)
  let ampDepth = 0;
  function build() {
    W = Math.max(1, stage.clientWidth);
    H = Math.max(1, stage.clientHeight);
    PORT = H > W * 1.05;
    MOBILE = COARSE || W < 760;
    SC = Math.min(DPR, 2048 / W, 2048 / H);
    renderer.setSize(W, H, false);
    film.style.height = Math.round((K.end + 1) * H) + 'px';

    const res = [W, H];
    screenMat.uniforms.uRes.value.set(...res);
    partMat.uniforms.uRes.value.set(...res);
    partMat.uniforms.uSize.value = (MOBILE ? 2.3 : 2.6) * DPR;

    for (const key of Object.keys(WORDS)) {
      const w = words[key];
      const spec = WORDS[key](PORT);
      const cv = document.createElement('canvas');
      cv.width = Math.max(4, Math.round(W * SC));
      cv.height = Math.max(4, Math.round(H * SC));
      const L = paintWord(cv, spec, true);
      if (w.tex) w.tex.dispose();
      const tex = new THREE.CanvasTexture(cv);
      tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
      w.tex = tex;
      w.u.uMask.value = tex;
      w.u.uRes.value.set(...res);
      w.u.uTexel.value.set(1 / cv.width, 1 / cv.height);
      w.u.uBlur.value = Math.max(4, L.size * 0.07);
      w.box = { x0: L.bbox.x0 / SC, x1: L.bbox.x1 / SC, y0: L.bbox.y0 / SC, y1: L.bbox.y1 / SC };
      const an = analyze(spec);
      w.focus = an.focus;
      shapes[key] = an.pts;
    }
    const dust = new Float32Array(N * 2);
    for (let k = 0; k < N; k++) { dust[k * 2] = Math.random() * W; dust[k * 2 + 1] = (Math.random() * 1.4 - 0.2) * H; }
    shapes.dust = dust;
    curPair = '';

    // подписи под словами
    ampDepth = Math.min(W, H) * 0.045;
    el.s1cap.style.top = Math.round(words.site.box.y1 + H * 0.04) + 'px';
    el.s3cap.style.top = Math.round(words.zero.box.y1 + ampDepth * 0.8 + H * 0.035) + 'px';
    el.s4word.style.top = Math.round(words.h24.box.y1 + ampDepth * 0.8 + H * 0.03) + 'px';
    el.s7.style.top = Math.round(words.your.box.y1 + H * (PORT ? 0.06 : 0.055)) + 'px';

    const a = words.amp.box;
    const acy = (a.y0 + a.y1) / 2;
    if (!PORT) {
      const gap = W * 0.028;
      Object.assign(el.whoK.style, { left: 'auto', right: Math.round(W - a.x0 + gap) + 'px', top: Math.round(acy) + 'px', justifyContent: 'flex-end' });
      Object.assign(el.whoD.style, { left: Math.round(a.x1 + gap) + 'px', right: 'auto', top: Math.round(acy) + 'px', justifyContent: 'flex-start' });
      el.whoK._ty = '-50%'; el.whoD._ty = '-50%';
      el.s5cap.style.top = Math.round(a.y1 + H * 0.1) + 'px';
    } else {
      const gap = H * 0.025;
      Object.assign(el.whoK.style, { left: '0px', right: '0px', top: Math.round(a.y0 - gap) + 'px', justifyContent: 'center' });
      Object.assign(el.whoD.style, { left: '0px', right: '0px', top: Math.round(a.y1 + gap) + 'px', justifyContent: 'center' });
      el.whoK._ty = '-100%'; el.whoD._ty = '0%';
      el.s5cap.style.top = '';
    }
    el.whoK._t = null; el.whoD._t = null;

    trackCenters = trackItems.map((li) => li.offsetLeft + li.offsetWidth / 2);
    crH = el.crroll.offsetHeight || H * 3;
  }

  // ---- наезд камеры в букву
  function fly(e, focus) {
    const halfDiag = Math.hypot(W, H) / 2;
    const zEnd = Math.max(4, (1.7 * halfDiag) / Math.max(focus.r, 2));
    const k = ioc(clamp(e));
    const z = Math.exp(Math.log(zEnd) * k);
    const a = smr(e, 0, 0.55);
    return { z, cx: 0.5 + (focus.u - 0.5) * a, cy: 0.5 + (focus.v - 0.5) * a };
  }

  function setWord(w, o) {
    const on = o.opacity > 0.002;
    w.mesh.visible = on;
    if (!on) return;
    const u = w.u;
    u.uOpacity.value = o.opacity;
    u.uZoom.value = o.zoom || 1;
    u.uCam.value.set(o.cx === undefined ? 0.5 : o.cx, o.cy === undefined ? 0.5 : o.cy);
    u.uReveal.value = o.reveal === undefined ? 1 : o.reveal;
    u.uFillVideo.value = o.video || 0;
    u.uFillLit.value = o.lit || 0;
    u.uOutline.value = o.outline || 0;
    u.uVidScale.value = o.vidScale || 1;
    u.uFit.value = 0;
    if (o.vid) u.uVid.value = o.vid;
    const ex = o.extrude || 0;
    if (ex > 0.001) {
      const dx = 0.55 - ptr.sx * 0.55 + Math.sin(clock * 0.31) * 0.12;
      const dy = 0.8 - ptr.sy * 0.35 + Math.cos(clock * 0.23) * 0.08;
      const len = Math.hypot(dx, dy) || 1;
      const depth = ampDepth * ex;
      u.uTilt.value.set((dx / len) * depth / W, -(dy / len) * depth / H);
    } else u.uTilt.value.set(0, 0);
    u.uLight.value.set(-0.45 + ptr.sx * 0.6 + Math.sin(clock * 0.4) * 0.15, 0.55 - ptr.sy * 0.45);
  }

  // ---- ввод
  const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
  if (!COARSE) {
    window.addEventListener('pointermove', (e) => {
      ptr.x = (e.clientX / window.innerWidth) * 2 - 1;
      ptr.y = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

  let clock = 0;
  let tS = 0;
  let shownClip = -1;
  let introAt = -1;
  const targetT = () => clamp(-film.getBoundingClientRect().top / H, 0, K.end);

  function update(t, time) {
    clock = time;
    if (introAt < 0) introAt = time;
    const it = time - introAt;
    const reveal = ioc(clamp((it - 0.15) / 2.4));
    const introCap = smr(it, 1.5, 2.6);

    // уменьшенное покачивание на телефоне — вместо мыши
    if (COARSE) { ptr.x = Math.sin(time * 0.35) * 0.5; ptr.y = Math.cos(time * 0.27) * 0.35; }

    const want = new Set();

    // ===== 1. САЙТ + наезд сквозь букву
    const e1 = seg(t, K.f1a, K.f1b);
    const f1 = fly(e1, words.site.focus);
    const par = (1 - e1) * 0.004;
    setWord(words.site, {
      opacity: t < K.f1b ? 1 - seg(t, K.f1b - 0.07, K.f1b) : 0,
      zoom: f1.z * (1 + 0.025 * smr(t, 0, K.f1a)),
      cx: f1.cx - ptr.sx * par, cy: f1.cy + ptr.sy * par,
      reveal, video: 1, vid: texOf(0), vidScale: lerp(1.1, 1.0, ioc(e1)),
    });
    if (t < K.f1b + 0.05) want.add(0);

    // ===== 2. Сайты на весь экран
    const s2on = t > K.f1b - 0.12 && t < K.f2a + 0.02;
    screen.visible = s2on;
    const u2 = clamp((t - K.s2a) / (K.s2b - K.s2a)) * 6;
    let idx = Math.min(5, Math.floor(u2));
    const fr = u2 - idx;
    let mix = 0;
    if (u2 < 6 && idx < 5 && fr > 0.7) mix = sm((fr - 0.7) / 0.3);
    if (u2 >= 6) idx = 5;
    if (s2on) {
      const su = screenMat.uniforms;
      su.uA.value = texOf(idx);
      su.uB.value = texOf(Math.min(5, idx + 1));
      su.uMix.value = mix;
      su.uFit.value = PORT ? 0.7 * smr(t, K.s2a, K.s2a + 0.35) * (1 - smr(t, K.s2b - 0.05, K.f2a)) : 0;
      su.uTime.value = time;
      want.add(idx);
      if (idx < 5 && fr > 0.55) want.add(idx + 1);
    }
    const clipShow = Math.min(5, idx + (mix > 0.5 ? 1 : 0));
    if (clipShow !== shownClip) {
      shownClip = clipShow;
      el.clipN.textContent = `0${clipShow + 1} / 06`;
      el.clipName.textContent = VIDS[clipShow].name;
      el.clipTag.textContent = VIDS[clipShow].tag;
    }

    // ===== 3. «0 ₽» — отъезд из буквы, видео гаснет, буквы становятся объёмными
    const e2 = 1 - seg(t, K.f2a, K.f2b);
    const f2 = fly(e2, words.zero.focus);
    const zv = 1 - smr(t, K.f2a + 0.25, K.f2b);
    setWord(words.zero, {
      opacity: t >= K.f2a ? 1 - smr(t, K.p1a - 0.05, K.p1a + 0.15) : 0,
      zoom: f2.z, cx: f2.cx, cy: f2.cy,
      video: zv, lit: 1 - zv, vid: texOf(5), vidScale: 1,
      extrude: smr(t, K.f2a + 0.35, K.f2b + 0.15),
    });
    if (t > K.f2a - 0.15 && t < K.f2b) want.add(5);

    // ===== 4. «24»
    const zH = 1 + 0.03 * seg(t, K.p1b, K.p2a);
    setWord(words.h24, {
      opacity: win(t, K.p1b - 0.15, K.p1b + 0.1, K.p2a - 0.05, K.p2a + 0.1),
      zoom: zH, lit: 1, extrude: 0.9,
    });

    // ===== 5. «&»
    const zA = 1 + 0.035 * seg(t, K.p2b, K.p3a);
    setWord(words.amp, {
      opacity: win(t, K.p2b - 0.15, K.p2b + 0.05, K.p3a - 0.05, K.p3a + 0.05),
      zoom: zA, lit: 1, extrude: 0.7,
    });

    // ===== 7. «ВАШ САЙТ»
    const zY = 1 + 0.02 * seg(t, K.p4b, K.end);
    setWord(words.your, {
      opacity: smr(t, K.p4b - 0.3, K.p4b + 0.05),
      zoom: zY, outline: 1,
    });

    // ===== частицы
    const pu = partMat.uniforms;
    let pa = 0, pp = 0, zAa = 1, zBb = 1, dA = 0, dB = 0;
    if (t < K.p1a - 0.1) { pa = 0; }
    else if (t < K.p1b) { setPair('zero', 'h24'); pp = seg(t, K.p1a, K.p1b); pa = smr(t, K.p1a - 0.1, K.p1a + 0.05); zBb = 1; }
    else if (t < K.p2a) { setPair('zero', 'h24'); pp = 1; pa = lerp(1, 0.45, smr(t, K.p1b, K.p1b + 0.3)); zBb = zH; }
    else if (t < K.p2b) { setPair('h24', 'amp'); pp = seg(t, K.p2a, K.p2b); pa = lerp(0.45, 1, smr(t, K.p2a, K.p2a + 0.12)); zAa = zH; }
    else if (t < K.p3a) { setPair('h24', 'amp'); pp = 1; pa = lerp(1, 0.45, smr(t, K.p2b, K.p2b + 0.3)); zAa = zH; zBb = zA; }
    else if (t < K.p3b) { setPair('amp', 'dust'); pp = seg(t, K.p3a, K.p3b); pa = lerp(lerp(0.45, 1, smr(t, K.p3a, K.p3a + 0.1)), 0.42, pp); zAa = zA; dB = 1; }
    else if (t < K.p4a) { setPair('amp', 'dust'); pp = 1; pa = 0.42; zAa = zA; dB = 1; }
    else if (t < K.p4b) { setPair('dust', 'your'); pp = seg(t, K.p4a, K.p4b); pa = lerp(0.42, 1, pp); dA = 1; }
    else { setPair('dust', 'your'); pp = 1; pa = lerp(1, 0.25, smr(t, K.p4b, K.p4b + 0.4)); dA = 1; zBb = zY; }
    points.visible = pa > 0.003;
    pu.uOpacity.value = pa;
    pu.uP.value = pp;
    pu.uZA.value = zAa; pu.uZB.value = zBb;
    pu.uDustA.value = dA; pu.uDustB.value = dB;
    pu.uDrift.value = Math.max(0, t - K.p3a) * H * 0.35;
    pu.uTime.value = time;
    pu.uScatter.value = MOBILE ? 0.7 : 1;

    for (const k of Object.keys(words)) words[k].u.uTime.value = time;
    manageVideos(want);

    // ===== DOM
    vis(el.s1cap, Math.min(1 - smr(t, 0.28, 0.6), introCap), `translate3d(0,${(-t * 60).toFixed(1)}px,0)`);
    vis(el.hint, Math.min(1 - smr(t, 0.04, 0.22), smr(it, 2.6, 3.4)));
    vis(el.s2shade, win(t, 1.5, 1.8, 4.3, 4.5));
    const s2p = seg(t, 1.6, 4.45);
    vis(el.s2title, win(t, 1.62, 1.95, 4.2, 4.45), `translate3d(0,${((1 - smr(t, 1.62, 2.0)) * 40 - s2p * 30).toFixed(1)}px,0)`);
    vis(el.s2cap, win(t, 1.72, 1.98, 4.2, 4.45));
    vis(el.s3cap, win(t, 5.05, 5.35, 5.95, 6.15), `translate3d(0,${((1 - smr(t, 5.05, 5.4)) * 24).toFixed(1)}px,0)`);
    vis(el.s4word, win(t, 6.72, 6.98, 7.8, 7.95), `translate3d(0,${((1 - smr(t, 6.72, 7.0)) * 20).toFixed(1)}px,0)`);
    const procO = win(t, 6.82, 7.05, 7.8, 7.95);
    vis(el.s4proc, procO);
    if (procO > 0.002) {
      const pos = seg(t, 7.0, 7.72) * 4;
      const i0 = Math.floor(pos), i1 = Math.min(4, i0 + 1);
      const cx = lerp(trackCenters[i0], trackCenters[i1], sm(pos - i0));
      el.track.style.transform = `translate3d(${(W / 2 - cx).toFixed(1)}px,0,0)`;
      const act = Math.round(pos);
      trackItems.forEach((li, i) => li.classList.toggle('on', i <= act));
    }
    const ne = ioc(seg(t, 8.0, 8.68));
    const nO = win(t, 8.0, 8.3, 9.42, 9.62);
    vis(el.whoK, nO, `translate3d(${(-(1 - ne) * W * 0.6).toFixed(1)}px,${el.whoK._ty || '-50%'},0)`);
    vis(el.whoD, nO, `translate3d(${((1 - ne) * W * 0.6).toFixed(1)}px,${el.whoD._ty || '-50%'},0)`);
    vis(el.s5cap, win(t, 8.55, 8.82, 9.42, 9.62), `translate3d(0,${((1 - smr(t, 8.55, 8.85)) * 18).toFixed(1)}px,0)`);
    const roll = seg(t, K.cr0, K.cr1);
    const crO = win(t, K.cr0 - 0.05, K.cr0 + 0.05, K.cr1 - 0.08, K.cr1);
    vis(el.crwin, crO);
    if (crO > 0.002) el.crroll.style.transform = `translate3d(0,${(H - roll * (crH + H)).toFixed(1)}px,0)`;
    vis(el.s7, smr(t, 12.85, 13.12), `translate3d(0,${((1 - smr(t, 12.85, 13.15)) * 26).toFixed(1)}px,0)`);

    let on = 0;
    for (let i = 0; i < SCENES.length; i++) if (t + 0.35 >= SCENES[i][0]) on = i;
    if (on !== railOn) {
      railOn = on;
      railBtns.forEach((b, i) => { b.classList.toggle('on', i === on); if (i === on) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    }
  }

  build();
  let resizeTimer = 0;
  let lastW = W, lastH = H;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const nw = stage.clientWidth, nh = stage.clientHeight;
      if (nw === lastW && Math.abs(nh - lastH) < 100) return;
      lastW = nw; lastH = nh;
      build();
    }, 220);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) clips.forEach((c) => c.el.pause()); });

  tS = targetT();
  let last = performance.now();
  const t0 = last;
  let first = true;
  function frame(now) {
    if (root.classList.contains('static')) { clips.forEach((c) => c.el.pause()); return; }
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    const time = Math.max(0, (now - t0) / 1000);
    const tt = targetT();
    tS += (tt - tS) * (1 - Math.exp(-dt * 6.5));
    if (Math.abs(tt - tS) < 0.0004) tS = tt;
    const kp = 1 - Math.exp(-dt * 3);
    ptr.sx += (ptr.x - ptr.sx) * kp;
    ptr.sy += (ptr.y - ptr.sy) * kp;
    update(tS, time);
    renderer.render(scene, cam);
    if (first) { first = false; window.__filmOK = true; }
  }
  requestAnimationFrame(frame);
}

boot().catch((e) => { goStatic('boot: ' + (e && e.message)); });
