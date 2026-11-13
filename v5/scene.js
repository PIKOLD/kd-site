// 3D-«стопка»: каждое решение посетителя — стеклянная пластина с подписью на торце.
// Всё собрано из простых фигур прямо здесь — внешних моделей нет.
import * as THREE from '../assets/lib/three.module.js';

const PI = Math.PI, clamp = (x, a, b) => Math.min(b, Math.max(a, x)), lerp = (a, b, x) => a + (b - a) * x;
const C = { bg: '#05080F', frost: '#EAF2FF', ice: '#9CC4FF', violet: '#8E9BFF', blue: '#2B5BFF' };
const W = 2.7, D = 1.75, GAP = .045;
const HEAD = "'Unbounded', 'Manrope', system-ui, sans-serif", TEXT = "'Manrope', system-ui, sans-serif";

/* горизонтальная плита со скруглёнными углами: ширина, глубина, толщина */
const geoCache = new Map();
function slab(w, d, t, r = .16) {
  const key = [w, d, t, r].join('|'); if (geoCache.has(key)) return geoCache.get(key);
  const b = Math.min(t * .3, .022);   // фаска раздвигает контур наружу, поэтому сам контур ужимаем на её размер
  w -= b * 2; d -= b * 2; r -= b;
  const s = new THREE.Shape(), x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: t - b * 2, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 14 });
  g.center(); g.rotateX(-PI / 2); geoCache.set(key, g); return g;
}
function tex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function fit(ctx, text, weight, size, family, maxW) {
  do { ctx.font = `${weight} ${size}px ${family}`; size -= 2; } while (ctx.measureText(text).width > maxW && size > 16);
}

/* подпись на торце: название слева, цена справа */
function labelTex(spec, ratio) {
  const w = 1024, h = Math.max(40, Math.round(w * ratio));
  return tex(w, h, ctx => {
    ctx.clearRect(0, 0, w, h); ctx.textBaseline = 'middle';
    const size = Math.min(h * .62, 44), sub = spec.sub || '';
    ctx.font = `600 ${size * .86}px ${TEXT}`; const sw = sub ? ctx.measureText(sub).width + 26 : 0;
    fit(ctx, spec.label, 500, size, HEAD, w - sw - 8);
    ctx.fillStyle = C.frost; ctx.textAlign = 'left'; ctx.fillText(spec.label, 4, h / 2 + 1);
    if (sub) { ctx.font = `600 ${size * .86}px ${TEXT}`; ctx.fillStyle = C.ice; ctx.textAlign = 'right'; ctx.fillText(sub, w - 4, h / 2 + 1); }
  });
}

/* рисунок внутри пластины — светящаяся «гравировка»; alphaTest, поэтому только сплошные линии */
function glyphTex(kind) {
  const w = 768, h = 512;
  return tex(w, h, ctx => {
    ctx.clearRect(0, 0, w, h); ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineWidth = 7; ctx.lineJoin = ctx.lineCap = 'round';
    const box = (x, y, bw, bh, r = 14, fill) => { ctx.beginPath(); ctx.roundRect(x, y, bw, bh, r); fill ? ctx.fill() : ctx.stroke(); };
    const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    const circ = (x, y, r, fill) => { ctx.beginPath(); ctx.arc(x, y, r, 0, PI * 2); fill ? ctx.fill() : ctx.stroke(); };
    if (kind === 'card') { circ(384, 130, 62); box(234, 232, 300, 50, 25); box(234, 302, 300, 50, 25); box(234, 372, 300, 50, 25, true); }
    else if (kind === 'landing') { box(40, 40, 688, 432, 26); line(80, 100, 250, 100); box(540, 78, 150, 44, 22, true); box(80, 170, 330, 60, 14, true); line(80, 268, 360, 268); line(80, 306, 300, 306); box(470, 170, 220, 190, 18); [0, 1, 2].forEach(i => box(80 + i * 212, 390, 186, 52, 12)); }
    else if (kind === 'catalog') { box(40, 40, 688, 432, 26); line(80, 96, 300, 96); circ(672, 96, 20); for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { box(80 + c * 156, 150 + r * 152, 132, 92, 12, r === 0 && c === 1); line(80 + c * 156, 262 + r * 152, 170 + c * 156, 262 + r * 152); } }
    else if (kind === 'flagship') { box(40, 40, 688, 432, 26); const cx = 384, cy = 262, s = 104; ctx.beginPath(); ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s * .9, cy - s * .5); ctx.lineTo(cx + s * .9, cy + s * .5); ctx.lineTo(cx, cy + s); ctx.lineTo(cx - s * .9, cy + s * .5); ctx.lineTo(cx - s * .9, cy - s * .5); ctx.closePath(); ctx.stroke(); line(cx, cy, cx, cy + s); line(cx, cy, cx + s * .9, cy - s * .5); line(cx, cy, cx - s * .9, cy - s * .5); line(80, 110, 230, 110); box(560, 400, 130, 40, 20, true); circ(cx, cy, 168); }
    else if (kind === 'bot') { box(70, 70, 400, 104, 40); box(298, 204, 400, 104, 40, true); box(70, 338, 300, 104, 40); circ(560, 122, 12, true); circ(610, 122, 12, true); circ(660, 122, 12, true); }
    else if (kind === 'shop') { box(124, 120, 520, 296, 34); line(124, 204, 644, 204); box(184, 300, 130, 56, 14, true); circ(540, 328, 32); circ(584, 328, 32); }
    else if (kind === 'more') { circ(384, 256, 160); ctx.beginPath(); ctx.ellipse(384, 256, 70, 160, 0, 0, PI * 2); ctx.stroke(); line(224, 256, 544, 256); line(250, 170, 518, 170); line(250, 342, 518, 342); }
    else { box(60, 60, 648, 392, 30); [0, 1, 2, 3].forEach(i => line(120, 150 + i * 72, 648 - (i % 2) * 160, 150 + i * 72)); }
  });
}
function backTex() {
  return tex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, w, h);
    const blob = (x, y, r, c) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(5,8,15,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); };
    blob(w * .34, h * .46, w * .46, 'rgba(43,91,255,.30)'); blob(w * .7, h * .6, w * .4, 'rgba(124,140,255,.20)'); blob(w * .5, h * .86, w * .36, 'rgba(156,196,255,.10)');
  });
}
function glowTex() {
  return tex(256, 256, (ctx, w, h) => { const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(120,160,255,.55)'); g.addColorStop(.45, 'rgba(70,110,255,.16)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); });
}
function sentTex() {
  return tex(1024, 664, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h); ctx.strokeStyle = '#fff'; ctx.lineWidth = 34; ctx.lineCap = ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.arc(w / 2, 250, 150, 0, PI * 2); ctx.lineWidth = 18; ctx.stroke();
    ctx.lineWidth = 30; ctx.beginPath(); ctx.moveTo(w / 2 - 70, 256); ctx.lineTo(w / 2 - 14, 312); ctx.lineTo(w / 2 + 80, 196); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `600 62px ${HEAD}`; ctx.fillText('Заявка собрана', w / 2, 520);
  });
}

/* толщина и вид пластины по её роли */
const THICK = { plinth: .13, addon: .2, card: .22, landing: .32, catalog: .42, flagship: .56, unsure: .26 };
const TINT = { base: '#BFD6FF', bot: '#C9C4FF', shop: '#DCEBFF', more: '#D2E4F5' };

export function createStack(canvas, { onFirstFrame } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(27, 1, .1, 60);
  scene.background = backTex();   // стеклу нужен непрозрачный фон: его оно и преломляет

  /* свет: «студия» из светящихся панелей, чтобы стеклу было что отражать */
  {
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.SphereGeometry(30, 16, 8), new THREE.MeshBasicMaterial({ color: 0x04060b, side: THREE.BackSide })));
    const panel = (c, i, x, y, z, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
    panel('#ffffff', 4.2, 0, 14, 3, 11, 5); panel('#8FB8FF', 4, -14, 4, 6, 5, 10); panel('#8E86FF', 3.4, 14, 3, 5, 5, 9); panel('#ffffff', 1.4, 0, 2, 16, 10, 3); panel('#DCE8FF', 2.2, 6, -6, -10, 8, 5);
    panel('#9CC4FF', 1.05, 0, 5, -18, 30, 9);   // широкая панель сзади: её отражают верхние грани пластин
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, .04).texture; pm.dispose();
  }
  const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(-3, 6, 5); scene.add(key);

  const glass = {};
  const glassMat = tint => glass[tint] || (glass[tint] = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: .07, transmission: 1, thickness: .55, ior: 1.42,
    attenuationColor: new THREE.Color(tint), attenuationDistance: .9, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1.25,
  }));
  const plinthMat = new THREE.MeshPhysicalMaterial({ color: 0x0c1428, metalness: .75, roughness: .28, clearcoat: 1, clearcoatRoughness: .2, envMapIntensity: 1.1 });
  const glyphs = {};
  const glyphMat = (kind, color) => glyphs[kind] || (glyphs[kind] = new THREE.MeshBasicMaterial({ map: glyphTex(kind), alphaTest: .5, color: new THREE.Color(color), toneMapped: false, side: THREE.DoubleSide }));

  const root = new THREE.Group(); scene.add(root);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({ map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  glow.rotation.x = -PI / 2; glow.position.y = -.02; scene.add(glow);

  /* ── пластины ── */
  const plates = new Map();   // id → plate
  let order = [];             // id снизу вверх
  function makePlate(spec) {
    const plinth = spec.kind === 'plinth', t = THICK[spec.kind === 'base' ? (spec.tier || 'landing') : spec.kind] || .2;
    const w = plinth ? W + .34 : W, d = plinth ? D + .34 : D;
    const g = new THREE.Group();
    const body = new THREE.Mesh(slab(w, d, t, plinth ? .2 : .16), plinth ? plinthMat : glassMat(TINT[spec.kind === 'base' ? 'base' : spec.group] || TINT.more));
    g.add(body);
    if (!plinth) {
      const kind = spec.kind === 'base' ? (spec.tier || 'landing') : spec.group || 'more';
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(D * 1.2, D * .8), glyphMat(kind, spec.kind === 'base' ? '#7FA8FF' : '#7C83E8'));
      gl.rotation.x = -PI / 2; gl.position.y = -t * .18; g.add(gl);
    }
    const lh = Math.min(t * .62, .15), lw = w * .88, ratio = lh / lw;
    const lt = labelTex(spec, ratio), lm = new THREE.MeshBasicMaterial({ map: lt, transparent: true, depthWrite: false, toneMapped: false });
    const front = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), lm); front.position.z = d / 2 + .004; front.renderOrder = 5; g.add(front);
    const back = front.clone(); back.rotation.y = PI; back.position.z = -d / 2 - .004; g.add(back);
    root.add(g);
    const p = { id: spec.id, spec, g, t, lm, lt, ratio, y: 0, vy: 0, ty: 0, x: 4.6, vx: 0, tx: 0, out: false, born: now };
    g.position.x = p.x; return p;
  }
  function relabel(p, spec) { p.spec = spec; const old = p.lt; p.lt = labelTex(spec, p.ratio); p.lm.map = p.lt; p.lm.needsUpdate = true; old.dispose(); }
  function kill(p) { root.remove(p.g); p.lt.dispose(); p.lm.dispose(); plates.delete(p.id); }
  let H = 0;
  function layout() {
    let y = 0;
    order.forEach(id => { const p = plates.get(id); p.ty = y + p.t / 2; y += p.t + GAP; });
    H = Math.max(0, y - GAP);
  }
  function set(specs) {
    if (mode === 'sent') return;
    const ids = specs.map(s => s.id);
    plates.forEach(p => { if (!ids.includes(p.id) && !p.out) { p.out = true; p.tx = -5.2; } });
    specs.forEach((s, i) => {
      let p = plates.get(s.id);
      if (p && p.out) { kill(p); p = null; }
      if (!p) { p = makePlate(s); plates.set(s.id, p); p.x = (i % 2 ? -1 : 1) * 4.6; p.g.position.x = p.x; p.y = 0; p.fresh = true; }
      else if (p.spec.label !== s.label || p.spec.sub !== s.sub) relabel(p, s);
    });
    order = ids; layout();
    plates.forEach(p => { if (p.fresh) { p.y = p.ty + .5; p.fresh = false; } });
    wake();
  }

  /* пример сборки, пока посетитель ничего не выбрал */
  let demoSpecs = null, demoT = 0, demoN = 0;
  function demo(specs) { demoSpecs = specs; demoT = 0; demoN = 0; if (specs) set([]); wake(); }
  function demoTick(dt) {
    if (!demoSpecs || mode === 'sent') return;
    demoT += dt; const n = demoSpecs.length, cycle = n * .85 + 3.4;
    const tt = demoT % cycle, want = tt < n * .85 ? Math.floor(tt / .85) + 1 : tt < cycle - .9 ? n : 0;
    if (want !== demoN) { demoN = want; const keep = demoSpecs; set(keep.slice(0, want)); demoSpecs = keep; }
  }

  /* ── отправка: стопка схлопывается в одну светящуюся пластину ── */
  let mode = 'build', sentAt = 0;
  const sentMat = new THREE.MeshPhysicalMaterial({ color: 0xcfe0ff, emissive: new THREE.Color('#2B5BFF'), emissiveIntensity: .55, metalness: 0, roughness: .12, transmission: .55, thickness: .5, ior: 1.42, clearcoat: 1, envMapIntensity: 1.3 });
  const sentPlate = new THREE.Group(); sentPlate.visible = false; root.add(sentPlate);
  sentPlate.add(new THREE.Mesh(slab(W, D, .3), sentMat));
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(W * .8, W * .8 * 664 / 1024), new THREE.MeshBasicMaterial({ map: sentTex(), transparent: true, depthWrite: false, toneMapped: false }));
  mark.rotation.x = -PI / 2; mark.position.y = .156; mark.renderOrder = 6; sentPlate.add(mark);
  function sent() { if (mode === 'sent') return; mode = 'sent'; sentAt = now; demoSpecs = null; wake(); }
  function unsent() { if (mode !== 'sent') return; mode = 'build'; sentPlate.visible = false; plates.forEach(p => { p.g.visible = true; p.g.scale.y = 1; }); layout(); wake(); }

  /* ── вращение мышью и пальцем ── */
  let yaw = -.52, vyaw = 0, pitch = 0, tpitch = 0, drag = null, touched = 0;
  canvas.style.touchAction = 'pan-y';
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} canvas.classList.add('grab'); wake(); });
  canvas.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    yaw += dx * .0085; vyaw = dx * .0085 * 60; tpitch = clamp(tpitch + dy * .004, -.22, .3); touched = now;
  });
  const end = e => { if (drag && e.pointerId === drag.id) { drag = null; canvas.classList.remove('grab'); } };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  /* ── размер, видимость, цикл ── */
  let vis = true, now = 0, last = 0, raf = 0, first = true, odd = false, camD = 9, camY = .6, aspect = 1;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); aspect = w / h; cam.aspect = aspect; cam.updateProjectionMatrix(); wake();
  }
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(e => { vis = e[0].isIntersecting; if (vis) wake(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  function wake() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  function frame(ms) {
    raf = 0;
    if (!vis || document.hidden) return;             // не на экране — не рисуем и не крутим цикл
    const dt = Math.min(.05, (ms - last) / 1000); last = ms; now += dt;
    demoTick(dt);

    /* пружины пластин */
    plates.forEach(p => {
      const ax = (p.tx - p.x) * 70 - p.vx * 13, ay = (p.ty - p.y) * 150 - p.vy * 15;
      p.vx += ax * dt; p.x += p.vx * dt; p.vy += ay * dt; p.y += p.vy * dt;
      if (mode !== 'sent') p.g.position.set(p.x, p.y, 0);
      if (p.out && p.x < -4.9) kill(p);
    });
    if (mode === 'sent') {
      const k = clamp((now - sentAt) / .55, 0, 1), e = k * k * (3 - 2 * k), mid = Math.max(.2, H / 2);
      plates.forEach(p => { p.g.position.y = lerp(p.y, mid, e); p.g.position.x = p.x; p.g.scale.y = lerp(1, .25, e); p.g.visible = k < 1; });
      if (k >= 1) {
        const s = clamp((now - sentAt - .55) / .5, 0, 1), o = 1 + Math.sin(s * PI) * .12;
        sentPlate.visible = true; sentPlate.position.y = mid; sentPlate.scale.setScalar(lerp(.6, .86, s) * o);
        sentMat.emissiveIntensity = .5 + Math.sin(now * 2.2) * .18;
      }
    }

    /* поворот: инерция после руки, лёгкое покачивание в покое */
    if (!drag) { yaw += vyaw * dt; vyaw *= Math.pow(.04, dt);
      if (mode === 'sent' && now - touched > 1.2) { const goal = Math.round((yaw + .2) / (PI * 2)) * PI * 2 - .2; yaw = lerp(yaw, goal, 1 - Math.pow(.03, dt)); }   // знак «отправлено» разворачивается лицом
      if (now - touched > 2.5) tpitch = lerp(tpitch, mode === 'sent' ? .5 : 0, 1 - Math.pow(.2, dt)); }
    pitch = lerp(pitch, mode === 'sent' ? Math.max(tpitch, .5) : tpitch, 1 - Math.pow(.002, dt));
    root.rotation.y = yaw + Math.sin(now * .35) * .07; root.rotation.x = pitch;

    /* камера держит всю стопку в кадре */
    const hh = mode === 'sent' ? Math.max(.8, H) : Math.max(1.1, H), tan = Math.tan(cam.fov * PI / 360);
    const need = Math.max((hh + 1.7) / 2 / tan, 4.4 / 2 / (tan * aspect));
    camD = lerp(camD, need, 1 - Math.pow(.02, dt)); camY = lerp(camY, hh / 2 - .05, 1 - Math.pow(.02, dt));
    const el = .3; cam.position.set(0, camY + Math.sin(el) * camD, Math.cos(el) * camD); cam.lookAt(0, camY, 0);
    glow.scale.setScalar(1 + Math.min(1, H / 3) * .25);

    /* в покое (только лёгкое покачивание) рисуем через кадр — слабому компьютеру легче */
    let busy = !!drag || !!demoSpecs || Math.abs(vyaw) > .02 || (mode === 'sent' && now - sentAt < 2.5) || Math.abs(camD - need) > .02;
    if (!busy) plates.forEach(p => { if (p.out || Math.abs(p.vx) + Math.abs(p.vy) > .01) busy = true; });
    odd = !odd;
    if (!busy && odd && !first) { raf = requestAnimationFrame(frame); return; }
    renderer.render(scene, cam);
    if (first) { first = false; onFirstFrame && onFirstFrame(); }
    raf = requestAnimationFrame(frame);
  }

  /* шрифты подписей грузятся лениво — после загрузки перерисовываем подписи */
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load(`500 30px 'Unbounded'`, 'Ая1'), document.fonts.load(`600 30px 'Manrope'`, 'Ая1 ₽')]).then(() => {
      plates.forEach(p => relabel(p, p.spec));
      const old = mark.material.map; mark.material.map = sentTex(); old.dispose(); wake();
    }).catch(() => {});
  }
  resize(); wake();
  return { set(specs) { demoSpecs = null; set(specs); }, demo, sent, unsent };
}
