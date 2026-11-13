// 3D-сцена страницы: ноутбук с живым видео сайтов, телефон с перепиской бота, стеклянный знак «К&Д».
// Всё собрано из простых фигур прямо здесь — внешних моделей нет.
import * as THREE from 'three';

const PI = Math.PI, lerp = (a, b, x) => a + (b - a) * x, clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = x => x * x * (3 - 2 * x);

/* цветовые гаммы: g — градиент знака и акцентов, a/b — пятна света, e1..e3 — панели «студии», tint — оттенок стекла */
export const PALETTES = {
  ice: { g: ['#EAF2FF', '#9CC4FF', '#7C8CFF'], a: [60, 110, 255], b: [120, 90, 255], e1: '#8FB8FF', e2: '#8E86FF', e3: '#DCE8FF', tint: '#CFE0FF' },
  lilac: { g: ['#F6EAFF', '#C8A6FF', '#FF9AD5'], a: [140, 80, 255], b: [255, 80, 170], e1: '#C8A6FF', e2: '#FF9AD5', e3: '#F1E2FF', tint: '#EBD9FF' },
  mint: { g: ['#E8FFF6', '#7CF0C2', '#5CC8FF'], a: [30, 190, 160], b: [50, 120, 255], e1: '#7CF0C2', e2: '#5CC8FF', e3: '#DFFFF2', tint: '#D2FFEE' },
  mono: { g: ['#FFFFFF', '#D5D9E0', '#9AA0AA'], a: [110, 120, 140], b: [80, 90, 115], e1: '#FFFFFF', e2: '#C9D2E3', e3: '#FFFFFF', tint: '#EEF1F6' },
  day: { g: ['#2563EB', '#3B82F6', '#6366F1'], a: [70, 120, 255], b: [130, 110, 255], e1: '#BFD4FF', e2: '#C9C2FF', e3: '#FFFFFF', tint: '#DCE8FF' },
};
let P = PALETTES.ice, LIGHT = false;
const rgba = (c, o) => `rgba(${c[0]},${c[1]},${c[2]},${o})`;

/* плита со скруглёнными углами: ширина, высота, толщина, радиус */
function slab(w, h, t, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const b = Math.min(t * .32, .014);
  const g = new THREE.ExtrudeGeometry(s, { depth: t - b * 2, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 18 });
  g.center(); return g;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const api = { c, ctx: c.getContext('2d'), t, redraw: (...a) => { draw(api.ctx, w, h, ...a); t.needsUpdate = true; } };
  api.redraw(); return api;
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function wrap(ctx, text, maxW) {
  const out = []; let line = '';
  text.split(' ').forEach(w => { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
  if (line) out.push(line); return out;
}
const FONT = "'Inter', system-ui, sans-serif";

/* клавиатура и тачпад */
function drawDeck(ctx, w, h) {
  ctx.fillStyle = '#19191c'; ctx.fillRect(0, 0, w, h);
  const kx = w * .07, kw = w * .86, ky = h * .07, rows = 6, cols = 14, gap = 6, kh = (h * .5 - gap * (rows - 1)) / rows, cw = (kw - gap * (cols - 1)) / cols;
  ctx.fillStyle = '#0b0b0d';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (r === rows - 1 && c >= 4 && c <= 8) { if (c === 4) { rr(ctx, kx + c * (cw + gap), ky + r * (kh + gap), cw * 5 + gap * 4, kh, 7); ctx.fill(); } continue; }
    rr(ctx, kx + c * (cw + gap), ky + r * (kh + gap), cw, kh, 7); ctx.fill();
  }
  ctx.fillStyle = '#151518'; rr(ctx, w * .31, h * .64, w * .38, h * .3, 16); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 2; ctx.stroke();
}
/* слой «макет»: схема страницы линиями */
function drawWire(ctx, w, h) {
  ctx.fillStyle = '#0c0c12'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = P.g[1]; ctx.lineWidth = 3;
  const box = (x, y, bw, bh, cross) => { rr(ctx, x, y, bw, bh, 10); ctx.stroke(); if (cross) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bw, y + bh); ctx.moveTo(x + bw, y); ctx.lineTo(x, y + bh); ctx.globalAlpha = .35; ctx.stroke(); ctx.globalAlpha = 1; } };
  box(40, 30, 150, 34); [0, 1, 2, 3].forEach(i => box(520 + i * 100, 36, 76, 22)); box(w - 180, 28, 140, 40);
  box(40, 120, 460, 56); box(40, 196, 380, 56); box(40, 290, 420, 16); box(40, 318, 360, 16); box(40, 372, 190, 54); box(246, 372, 190, 54);
  box(560, 110, 360, 330, true);
  [0, 1, 2].forEach(i => box(40 + i * 300, 480, 280, 100));
}
/* слой «код» */
function drawCode(ctx, w, h) {
  ctx.fillStyle = '#0a0a0c'; ctx.fillRect(0, 0, w, h);
  ctx.font = "500 25px Consolas, 'Courier New', monospace"; ctx.textBaseline = 'top';
  const C = { t: P.g[1], a: P.g[2], s: P.g[0], x: '#E8E8EA', m: '#6E6E73' };
  const L = [
    [['m', '<!-- первый экран -->']],
    [['x', '<'], ['t', 'section'], ['a', ' class'], ['x', '='], ['s', '"hero"'], ['x', '>']],
    [['x', '  <'], ['t', 'h1'], ['x', '>Тренчи и пальто</'], ['t', 'h1'], ['x', '>']],
    [['x', '  <'], ['t', 'a'], ['a', ' href'], ['x', '='], ['s', '"#catalog"'], ['a', ' class'], ['x', '='], ['s', '"btn"'], ['x', '>']],
    [['x', '    Смотреть каталог']],
    [['x', '  </'], ['t', 'a'], ['x', '>']],
    [['x', '</'], ['t', 'section'], ['x', '>']],
    [],
    [['a', 'const'], ['x', ' order = '], ['a', 'await'], ['x', ' send({']],
    [['x', '  item: '], ['s', "'Пальто, р. 44'"], ['x', ',']],
    [['x', '  to: '], ['s', "'telegram'"]],
    [['x', '});']],
    [['m', '// заявка уходит владельцу сразу']],
  ];
  L.forEach((ln, i) => { let x = 74; ctx.fillStyle = C.m; ctx.fillText(String(i + 1).padStart(2, ' '), 26, 34 + i * 41);
    ln.forEach(([k, s]) => { ctx.fillStyle = C[k]; ctx.fillText(s, x, 34 + i * 41); x += ctx.measureText(s).width; }); });
}
/* слой «заявка» */
function drawLead(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(245,245,247,.96)'; rr(ctx, 8, 8, w - 16, h - 16, 44); ctx.fill();
  ctx.fillStyle = '#2AABEE'; ctx.beginPath(); ctx.arc(84, h / 2, 44, 0, PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(62, h / 2 + 2); ctx.lineTo(108, h / 2 - 20); ctx.lineTo(98, h / 2 + 22); ctx.lineTo(84, h / 2 + 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#111'; ctx.textBaseline = 'alphabetic'; ctx.font = `600 34px ${FONT}`; ctx.fillText('Новая заявка', 152, h / 2 - 8);
  ctx.fillStyle = '#555'; ctx.font = `400 27px ${FONT}`; ctx.fillText('Пальто, размер 44 · Анна', 152, h / 2 + 32);
}
/* знак «К&Д» */
function drawMark(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, P.g[0]); g.addColorStop(.5, P.g[1]); g.addColorStop(1, P.g[2]);
  ctx.fillStyle = g; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 ${h * .4}px ${FONT}`;
  ctx.fillText('К&Д', w / 2, h / 2 + h * .02);
}
/* фон сцены */
function drawBack(ctx, w, h) {
  ctx.fillStyle = LIGHT ? '#F5F5F7' : '#000'; ctx.fillRect(0, 0, w, h);
  const k = LIGHT ? .45 : 1;
  const blob = (x, y, r, c) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); };
  blob(w * .12, h * .42, w * .5, rgba(P.a, .2 * k)); blob(w * .9, h * .62, w * .5, rgba(P.b, .22 * k)); blob(w * .5, h * .95, w * .42, rgba(P.a, .1 * k));
}
/* мягкое свечение под устройствами */
function drawGlow(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, rgba(P.a, .55)); g.addColorStop(.35, rgba(P.b, .22)); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.clearRect(0, 0, w, h); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}
/* переписка с ботом: сцена на 6 сообщений, n — сколько уже показано, typing — печатает ли бот */
const CHAT = [
  ['u', 'Здравствуйте! Можно записаться на маникюр?'],
  ['b', 'Здравствуйте! Конечно. На какой день?', ['Сегодня', 'Завтра', 'Другой день']],
  ['u', 'Завтра'],
  ['b', 'Завтра свободно:', ['12:00', '15:00', '18:30']],
  ['u', '15:00'],
  ['b', 'Записала вас на завтра в 15:00. Напомню за два часа.'],
];
function drawChat(ctx, w, h, n = 0, typing = false) {
  ctx.fillStyle = '#0e0e10'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#1a1a1d'; ctx.fillRect(0, 0, w, 150);
  ctx.fillStyle = '#000'; rr(ctx, w / 2 - 70, 22, 140, 36, 18); ctx.fill();
  const av = ctx.createLinearGradient(30, 80, 86, 136); av.addColorStop(0, P.g[0]); av.addColorStop(1, P.g[2]);
  ctx.fillStyle = av; ctx.beginPath(); ctx.arc(60, 106, 28, 0, PI * 2); ctx.fill();
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.fillStyle = '#f5f5f7'; ctx.font = `600 27px ${FONT}`; ctx.fillText('Студия маникюра', 104, 102);
  ctx.fillStyle = '#8e8e93'; ctx.font = `400 21px ${FONT}`; ctx.fillText('бот · отвечает сразу', 104, 131);
  let y = 186; const pad = 22, maxW = w * .72;
  ctx.font = `400 26px ${FONT}`;
  CHAT.slice(0, n).forEach(([who, text, btn]) => {
    const lines = wrap(ctx, text, maxW - pad * 2), bw = Math.max(...lines.map(l => ctx.measureText(l).width)) + pad * 2, bh = lines.length * 35 + 30;
    const x = who === 'u' ? w - 24 - bw : 24;
    ctx.fillStyle = who === 'u' ? '#3A7BFF' : '#26262A'; rr(ctx, x, y, bw, bh, 24); ctx.fill();
    ctx.fillStyle = '#f5f5f7'; lines.forEach((l, i) => ctx.fillText(l, x + pad, y + 40 + i * 35));
    y += bh + 12;
    if (btn) { let bx = 24; ctx.font = `500 23px ${FONT}`;
      btn.forEach(b => { const tw = ctx.measureText(b).width + 34; ctx.fillStyle = '#1C1C20'; rr(ctx, bx, y, tw, 50, 16); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#9CC2FF'; ctx.fillText(b, bx + 17, y + 33); bx += tw + 10; });
      y += 64; ctx.font = `400 26px ${FONT}`; }
    y += 6;
  });
  if (typing) { ctx.fillStyle = '#26262A'; rr(ctx, 24, y, 96, 54, 24); ctx.fill(); ctx.fillStyle = '#8e8e93'; [0, 1, 2].forEach(i => { ctx.beginPath(); ctx.arc(52 + i * 20, y + 27, 6, 0, PI * 2); ctx.fill(); }); }
  ctx.fillStyle = '#1a1a1d'; rr(ctx, 20, h - 96, w - 40, 64, 32); ctx.fill();
  ctx.fillStyle = '#6e6e73'; ctx.font = `400 24px ${FONT}`; ctx.fillText('Сообщение', 48, h - 55);
}

export function createScene(canvas, { videos, reduce = false, palette = 'ice', light = false, start = 0 }) {
  P = PALETTES[palette] || PALETTES.ice; LIGHT = light;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  const mobile = () => canvas.clientWidth < 820;
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile() ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, .1, 80);
  /* фон сцены: чёрный с двумя мягкими пятнами света — его же преломляет стекло */
  const backTex = canvasTex(512, 512, drawBack); scene.background = backTex.t;

  /* свет: маленькая «студия» из светящихся панелей, чтобы металл и стекло было чему отражать */
  function buildEnv() {
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.SphereGeometry(30, 16, 8), new THREE.MeshBasicMaterial({ color: LIGHT ? 0x8f9098 : 0x050506, side: THREE.BackSide })));
    const panel = (c, i, x, y, z, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
    panel('#ffffff', 4, 0, 14, 4, 10, 5); panel(P.e1, 4, -14, 4, 6, 5, 9); panel(P.e2, 4, 14, 3, 5, 5, 9); panel('#ffffff', 1.6, 0, 3, 16, 9, 3); panel(P.e3, 2.5, 6, -6, -10, 8, 5);
    const pm = new THREE.PMREMGenerator(renderer), old = scene.environment;
    scene.environment = pm.fromScene(env, .035).texture; pm.dispose(); if (old) old.dispose();
  }
  buildEnv();
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(-3, 6, 5); scene.add(key);

  const metal = new THREE.MeshStandardMaterial({ color: light ? 0xc9ccd2 : 0x26262a, metalness: .92, roughness: light ? .3 : .34 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x050506, metalness: .2, roughness: .28 });

  /* ── ноутбук ── */
  const laptop = new THREE.Group(); scene.add(laptop);
  const base = new THREE.Mesh(slab(3.2, 2.2, .09, .17), metal); base.rotation.x = -PI / 2; base.position.y = .045; laptop.add(base);
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(3.04, 2.04), new THREE.MeshStandardMaterial({ map: canvasTex(1024, 688, drawDeck).t, metalness: .55, roughness: .55 }));
  deck.rotation.x = -PI / 2; deck.position.y = .0915; laptop.add(deck);
  const lidPivot = new THREE.Group(); lidPivot.position.set(0, .095, -1.08); laptop.add(lidPivot);
  const lid = new THREE.Mesh(slab(3.2, 2.12, .055, .17), metal); lid.position.set(0, 1.06, -.0275); lidPivot.add(lid);
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(3.12, 2.04), dark); bezel.position.set(0, 1.06, .001); lidPivot.add(bezel);
  const SW = 2.98, SH = SW / 1.6;
  const screenMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), screenMat); screen.position.set(0, 1.075, .003); lidPivot.add(screen);

  /* слои «из чего состоит сайт»: расходятся от экрана */
  const layerMat = (tex, o = {}) => new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, toneMapped: false, depthWrite: false, ...o });
  const wireTex = canvasTex(960, 600, drawWire), codeTex = canvasTex(960, 600, drawCode);
  const wire = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), layerMat(wireTex.t));
  const code = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), layerMat(codeTex.t));
  const lead = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .46), layerMat(canvasTex(640, 196, drawLead).t));
  const design = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), layerMat(null));
  [code, wire, design, lead].forEach((m, i) => { m.position.set(0, 1.075, .004); m.renderOrder = 2 + i; lidPivot.add(m); });

  /* ── телефон ── */
  const phone = new THREE.Group(); scene.add(phone);
  phone.add(new THREE.Mesh(slab(.8, 1.66, .085, .135), new THREE.MeshStandardMaterial({ color: 0x2c2c30, metalness: .95, roughness: .3 })));
  const pb = new THREE.Mesh(new THREE.PlaneGeometry(.77, 1.63), dark); pb.position.z = .0432; phone.add(pb);
  const chat = canvasTex(512, 1090, drawChat);
  const ps = new THREE.Mesh(new THREE.PlaneGeometry(.735, .735 * 1090 / 512), new THREE.MeshBasicMaterial({ map: chat.t, toneMapped: false })); ps.position.z = .0445; phone.add(ps);

  /* ── стекло: знак «К&Д» и две капли ── */
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .04, transmission: 1, thickness: .9, ior: 1.52, dispersion: 4, attenuationColor: new THREE.Color(P.tint), attenuationDistance: 4, envMapIntensity: .85, specularIntensity: 1 });
  const coin = new THREE.Group(); scene.add(coin);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, .13, 72, 1), glass); disc.rotation.x = PI / 2; coin.add(disc);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.62, .028, 16, 96), glass); coin.add(rim);
  const markTex = canvasTex(512, 512, drawMark);
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 1.06), new THREE.MeshBasicMaterial({ map: markTex.t, transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide })); mark.position.z = .072; mark.renderOrder = 5; coin.add(mark);
  const drop1 = new THREE.Mesh(new THREE.SphereGeometry(.3, 48, 32), glass); scene.add(drop1);
  const drop2 = new THREE.Mesh(new THREE.CapsuleGeometry(.14, .34, 12, 32), glass); scene.add(drop2);

  const glowTex = canvasTex(256, 256, drawGlow);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: glowTex.t, transparent: true, depthWrite: false, toneMapped: false, opacity: .8, blending: THREE.AdditiveBlending }));
  if (light) glow.visible = false;
  glow.rotation.x = -PI / 2; glow.position.y = -.98; glow.renderOrder = -1; scene.add(glow);

  /* ── видео на экране ── */
  const loader = new THREE.TextureLoader(), vids = videos.map(v => ({ ...v, el: null, tex: null, poster: null }));
  let curV = -1, fade = 1, fadeTo = 1, pendingV = -1;
  function prep(i) {
    const v = vids[i]; if (v.poster) return;
    v.poster = loader.load(v.poster_url, t => { t.colorSpace = THREE.SRGBColorSpace; if (curV === i && !v.playing) { screenMat.map = t; screenMat.needsUpdate = true; } });
    const el = document.createElement('video'); el.src = v.src; el.muted = true; el.loop = true; el.playsInline = true; el.preload = 'auto'; el.setAttribute('playsinline', '');
    v.el = el; v.tex = new THREE.VideoTexture(el); v.tex.colorSpace = THREE.SRGBColorSpace;
    el.addEventListener('playing', () => { v.playing = true; if (curV === i) { screenMat.map = v.tex; screenMat.needsUpdate = true; } });
  }
  function apply(i) {
    if (curV >= 0 && vids[curV].el) vids[curV].el.pause();
    curV = i; prep(i); const v = vids[i];
    screenMat.map = v.playing ? v.tex : v.poster; screenMat.needsUpdate = true;
    if (!reduce) { v.el.currentTime = 0; v.el.play().catch(() => {}); }
  }
  function setVideo(i) { if (i === curV || i === pendingV) return; if (curV < 0) { apply(i); return; } pendingV = i; fadeTo = 0; prep(i); }

  /* ── ключевые положения по главам: 0 первый экран, 1 сайты, 2 слои, 3 боты ── */
  const K = {
    lapX: [0, 1.4, 1.85, 2.7], lapZ: [0, 0, -.4, -3.4], lapRy: [-.22, -.36, .52, -.5], lidA: [82, 102, 96, 100], spread: [0, 0, 1, 0],
    phX: [5.4, 5.4, 5.8, 1.05], phY: [-1.6, -1.6, -1.2, .3], phZ: [0, 0, 0, 1.7], phRy: [1.3, 1.3, 1.1, -.34], phRx: [.3, .3, .2, -.04],
    camY: [1.75, 1.25, 1.6, 1.05], camZ: [9.6, 7.4, 7.9, 6.3], lookX: [0, .2, .2, 0], lookY: [1.45, .45, .5, .35],
    coinX: [2.95, -3.15, -3.0, -.5], coinY: [1.95, -1.8, -1.65, 2.2], coinZ: [.5, -.8, .4, -.6], coinS: [.9, .55, .6, .5],
    d1X: [-3.0, 3.2, -3.2, 3.1], d1Y: [.9, 1.9, 1.7, -.6], d2X: [-2.2, -3.4, 3.3, -2.3], d2Y: [-.2, -.9, 1.9, -.9],
  };
  const at = (arr, t) => { const i = Math.min(arr.length - 2, Math.floor(t)), f = smooth(clamp((t - i - .12) / .76)); return lerp(arr[i], arr[i + 1], f); };

  let T = start, Ts = start, mx = 0, my = 0, tx = 0, ty = 0, asp = 1, vis = true, intro = reduce ? 1 : 0, chatN = 0, chatTyping = false, chatClock = 0;
  const size = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); asp = w / h; cam.aspect = asp; cam.updateProjectionMatrix(); };
  new ResizeObserver(size).observe(canvas); size();
  new IntersectionObserver(e => { vis = e[0].isIntersecting; }).observe(canvas);
  addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; }, { passive: true });
  document.fonts && document.fonts.ready.then(() => { markTex.redraw(); chat.redraw(chatN, chatTyping); });

  const t0 = performance.now(); let last = t0;
  function frame(now) {
    requestAnimationFrame(frame); if (!vis) return;
    const raw = Math.max(0, Math.min(.5, (now - last) / 1000)), dt = Math.min(.05, raw), t = reduce ? 0 : (now - t0) / 1000; last = now;
    Ts += (T - Ts) * (reduce ? 1 : Math.min(1, dt * 6)); mx += (tx - mx) * .05; my += (ty - my) * .05;
    intro = Math.min(1, intro + raw / 1.9); const io = 1 - Math.pow(1 - intro, 3);
    const wide = asp >= 1.15, xk = wide ? 1 : 0, zk = wide ? 1 : lerp(1.62, 1.12, clamp((asp - .45) / .7)), up = wide ? 0 : .5;
    const tt = clamp(Ts, 0, 3);

    laptop.position.set(at(K.lapX, tt) * xk, -.95, at(K.lapZ, tt));
    laptop.rotation.y = at(K.lapRy, tt) + mx * .16 + Math.sin(t * .5) * .012;
    lidPivot.rotation.x = PI / 2 - at(K.lidA, tt) * io * PI / 180;
    const sp = at(K.spread, tt);
    wire.position.z = .004 + sp * .5; design.position.z = .004 + sp * 1.0; lead.position.set(sp * .85, 1.075 - sp * .7, .004 + sp * 1.45);
    const so = clamp(sp * 3) * .97; code.material.opacity = so; wire.material.opacity = so; design.material.opacity = so; lead.material.opacity = clamp(sp * 2.4 - .6);
    if (design.material.map !== screenMat.map) { design.material.map = screenMat.map; design.material.needsUpdate = true; }
    code.visible = wire.visible = design.visible = lead.visible = sp > .01;

    const pin = smooth(clamp((tt - 2.12) / .76));
    phone.position.set(wide ? at(K.phX, tt) : lerp(3.4, 0, pin), at(K.phY, tt) + Math.sin(t * .9) * .02, at(K.phZ, tt) + (wide ? 0 : .4));
    phone.rotation.set(at(K.phRx, tt) + my * .08, at(K.phRy, tt) + mx * .2 + (wide ? 0 : .34 * pin), 0);

    coin.position.set(at(K.coinX, tt) * (wide ? 1 : .42), (wide ? at(K.coinY, tt) : Math.min(at(K.coinY, tt), .85)) + Math.sin(t * .8) * .06, at(K.coinZ, tt));
    coin.scale.setScalar(at(K.coinS, tt) * (wide ? 1 : .8)); coin.rotation.set(Math.sin(t * .6) * .16 + my * .3, Math.sin(t * .4) * .5 + mx * .5, Math.sin(t * .3) * .08);
    drop1.position.set(at(K.d1X, tt) * (wide ? 1 : .5), at(K.d1Y, tt) + Math.sin(t * .7 + 1) * .1, .4);
    drop2.position.set(at(K.d2X, tt) * (wide ? 1 : .5), at(K.d2Y, tt) + Math.cos(t * .6) * .1, -.3); drop2.rotation.set(t * .2, 0, .6 + Math.sin(t * .4) * .3);
    glow.position.x = laptop.position.x * .6; glow.material.opacity = .75 - clamp(tt - 2) * .25;

    cam.position.set(mx * .5, at(K.camY, tt) + up * .2, at(K.camZ, tt) * zk);
    cam.lookAt(at(K.lookX, tt) * xk, at(K.lookY, tt) + up, 0);

    /* смена видео через короткое затемнение */
    fade += (fadeTo - fade) * Math.min(1, dt * 12);
    if (fadeTo === 0 && fade < .04 && pendingV >= 0) { apply(pendingV); pendingV = -1; fadeTo = 1; }
    screenMat.color.setScalar(fade * clamp(io * 1.6 - .3));

    /* переписка идёт, пока телефон в кадре */
    if (tt > 2.4 && !reduce) {
      chatClock += raw; const cyc = chatClock % 13, step = Math.min(6, Math.floor(cyc / 1.7)), who = CHAT[Math.min(5, step)][0];
      const typing = step < 6 && who === 'b' && (cyc % 1.7) < .9, n = typing ? step : Math.min(6, step + (cyc % 1.7 > .25 || who === 'b' ? 1 : 0));
      if (n !== chatN || typing !== chatTyping) { chatN = n; chatTyping = typing; chat.redraw(n, typing); }
    } else if (reduce && chatN !== 6) { chatN = 6; chat.redraw(6, false); }
    renderer.render(scene, cam);
  }
  requestAnimationFrame(frame);
  function setPalette(name) {
    if (!PALETTES[name]) return; P = PALETTES[name];
    [backTex, wireTex, codeTex, glowTex, markTex].forEach(t => t.redraw()); chat.redraw(chatN, chatTyping);
    glass.attenuationColor.set(P.tint); buildEnv();
  }
  return { setProgress(v) { T = v; }, setVideo, setPalette, get video() { return curV; } };
}
