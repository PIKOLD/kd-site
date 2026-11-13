// v9 — единственная 3D-сцена страницы: ноутбук с живым видео сайтов.
// Главы по прокрутке: 0 — первый экран, 1 — «Живые сайты» (ноутбук справа, видео переключается),
// 2 — «Четыре слоя» (экран раскладывается на код, макет, дизайн и заявку).
// Модели собраны из простых фигур прямо здесь, внешних файлов нет.
import * as THREE from 'three';

const PI = Math.PI, lerp = (a, b, x) => a + (b - a) * x, clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = x => x * x * (3 - 2 * x);
const TAN = Math.tan(15 * PI / 180); // половина вертикального угла камеры (fov 30)

/* гамма «Лёд» */
const G = ['#EAF2FF', '#9CC4FF', '#7C8CFF'], A = [60, 110, 255], B = [110, 95, 255];
const rgba = (c, o) => `rgba(${c[0]},${c[1]},${c[2]},${o})`;
const FONT = "'Inter', system-ui, sans-serif";

/* плита со скруглёнными углами */
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
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const api = { t, redraw: () => { draw(c.getContext('2d'), w, h); t.needsUpdate = true; } };
  api.redraw(); return api;
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
}

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
  ctx.fillStyle = '#0b0c12'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = G[1]; ctx.lineWidth = 3;
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
  const C = { t: G[1], a: G[2], s: G[0], x: '#E8E8EA', m: '#6E6E73' };
  const L = [
    [['m', '<!-- первый экран -->']],
    [['x', '<'], ['t', 'section'], ['a', ' class'], ['x', '='], ['s', '"hero"'], ['x', '>']],
    [['x', '  <'], ['t', 'h1'], ['x', '>Верхняя одежда</'], ['t', 'h1'], ['x', '>']],
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
  L.forEach((ln, i) => {
    let x = 74; ctx.fillStyle = C.m; ctx.fillText(String(i + 1).padStart(2, ' '), 26, 34 + i * 41);
    ln.forEach(([k, s]) => { ctx.fillStyle = C[k]; ctx.fillText(s, x, 34 + i * 41); x += ctx.measureText(s).width; });
  });
}
/* слой «заявка» */
function drawLead(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(245,245,247,.96)'; rr(ctx, 8, 8, w - 16, h - 16, 44); ctx.fill();
  ctx.fillStyle = '#2AABEE'; ctx.beginPath(); ctx.arc(84, h / 2, 44, 0, PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(62, h / 2 + 2); ctx.lineTo(108, h / 2 - 20); ctx.lineTo(98, h / 2 + 22); ctx.lineTo(84, h / 2 + 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#111'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.font = `600 34px ${FONT}`; ctx.fillText('Новая заявка', 152, h / 2 - 8);
  ctx.fillStyle = '#555'; ctx.font = `400 27px ${FONT}`; ctx.fillText('Пальто, размер 44 · Анна', 152, h / 2 + 32);
}
/* фон сцены: чёрный с двумя холодными пятнами */
function drawBack(ctx, w, h) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
  const blob = (x, y, r, c) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); };
  blob(w * .14, h * .45, w * .5, rgba(A, .15)); blob(w * .88, h * .62, w * .5, rgba(B, .16));
}
/* мягкое свечение под ноутбуком */
function drawGlow(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, rgba(A, .5)); g.addColorStop(.35, rgba(B, .18)); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.clearRect(0, 0, w, h); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

export function createScene(canvas, { videos }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('no webgl');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, .1, 80);
  const backTex = canvasTex(512, 512, drawBack); scene.background = backTex.t;

  /* свет: «студия» из светящихся панелей, чтобы металлу было что отражать */
  {
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.SphereGeometry(30, 16, 8), new THREE.MeshBasicMaterial({ color: 0x050506, side: THREE.BackSide })));
    const panel = (c, i, x, y, z, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
    panel('#ffffff', 4, 0, 14, 4, 10, 5); panel('#8FB8FF', 4, -14, 4, 6, 5, 9); panel('#8E86FF', 3.4, 14, 3, 5, 5, 9); panel('#ffffff', 1.6, 0, 3, 16, 9, 3); panel('#DCE8FF', 2.5, 6, -6, -10, 8, 5);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, .035).texture; pm.dispose();
  }
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(-3, 6, 5); scene.add(key);

  const metal = new THREE.MeshStandardMaterial({ color: 0x2a2b2f, metalness: .92, roughness: .32 });
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
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), screenMat); screen.position.set(0, 1.075, .003); lidPivot.add(screen);
  /* блик по стеклу экрана: полоса, которая скользит при повороте */
  const gloss = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uShift: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float uShift;
      void main(){ float d = vUv.x*0.75 + vUv.y*0.55 + uShift;
        float band = smoothstep(0.55,0.75,d) * (1.0 - smoothstep(0.75,1.05,d));
        gl_FragColor = vec4(vec3(0.85,0.92,1.0), band*0.07 + vUv.y*0.02); }`,
  }));
  gloss.position.set(0, 1.075, .0045); gloss.renderOrder = 8; lidPivot.add(gloss);

  /* слои «из чего состоит сайт»: расходятся от экрана */
  const layerMat = tex => new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
  const wireTex = canvasTex(960, 600, drawWire), codeTex = canvasTex(960, 600, drawCode), leadTex = canvasTex(640, 196, drawLead);
  const wire = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), layerMat(wireTex.t));
  const code = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), layerMat(codeTex.t));
  const lead = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .46), layerMat(leadTex.t));
  const design = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), layerMat(null));
  [code, wire, design, lead].forEach((m, i) => { m.position.set(0, 1.075, .004); m.renderOrder = 2 + i; lidPivot.add(m); });

  const glowTex = canvasTex(256, 256, drawGlow);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: glowTex.t, transparent: true, depthWrite: false, toneMapped: false, opacity: .7, blending: THREE.AdditiveBlending }));
  glow.rotation.x = -PI / 2; glow.position.y = -.98; glow.renderOrder = -1; scene.add(glow);

  /* ── видео на экране: играет только то, что видно ── */
  const loader = new THREE.TextureLoader(), vids = videos.map(v => ({ ...v, el: null, tex: null, poster: null, playing: false }));
  let curV = -1, pendingV = -1, fade = 1, fadeTo = 1, vis = true;
  function prep(i) {
    const v = vids[i]; if (v.el) return;
    v.poster = loader.load(v.poster_url, t => { t.colorSpace = THREE.SRGBColorSpace; if (curV === i && !v.playing) { screenMat.map = t; screenMat.needsUpdate = true; } });
    const el = document.createElement('video'); el.muted = true; el.loop = true; el.playsInline = true; el.preload = 'auto';
    el.setAttribute('muted', ''); el.setAttribute('playsinline', ''); el.src = v.src;
    v.el = el; v.tex = new THREE.VideoTexture(el); v.tex.colorSpace = THREE.SRGBColorSpace;
    el.addEventListener('playing', () => { v.playing = true; if (curV === i) { screenMat.map = v.tex; screenMat.needsUpdate = true; } });
  }
  function apply(i) {
    if (curV >= 0 && vids[curV].el) vids[curV].el.pause();
    curV = i; prep(i); const v = vids[i];
    screenMat.map = v.playing ? v.tex : v.poster; screenMat.needsUpdate = true;
    try { v.el.currentTime = 0; } catch (e) { /* видео ещё не готово */ }
    if (vis) v.el.play().catch(() => {});
  }
  function setVideo(i) { if (i === curV || i === pendingV || !vids[i]) return; if (curV < 0) { apply(i); return; } pendingV = i; fadeTo = 0; prep(i); }
  function setVisible(on) {
    if (on === vis) return; vis = on;
    const v = vids[curV]; if (!v || !v.el) return;
    if (on) v.el.play().catch(() => {}); else v.el.pause();
  }

  /* ── положения по главам; считаются от пропорций окна и высоты текста первого экрана ── */
  let asp = 1, heroBottom = .55;
  function poses() {
    const wide = asp >= 1;
    /* первый экран: ноутбук начинается сразу под текстом и на широком экране чуть уходит за нижний край */
    const nyTop = 1 - 2 * clamp(heroBottom, .3, .82) - .05, nyBot = wide ? -1.1 : -.74; // на телефоне снизу — полоса с кнопками
    let h0 = 2.3 / Math.max(.4, nyTop - nyBot);
    h0 = clamp(Math.max(h0, (wide ? 2.2 : 1.95) / asp), 2.2, 6.5);
    const hero = { x: 0, z: 0, ry: wide ? -.22 : -.16, lid: 82, sp: 0, cy: 1.75, cz: h0 / TAN, lx: 0, ly: 1.2 - nyTop * h0 };
    if (wide) {
      const k = clamp(1.78 / asp, 1, 1.55);
      const z1 = 7.4 * k, z2 = 7.9 * k, hw1 = z1 * TAN * asp, hw2 = z2 * TAN * asp;
      return [hero,
        { x: hw1 * .4, z: 0, ry: -.36, lid: 102, sp: 0, cy: 1.25, cz: z1, lx: .2, ly: .45 },
        { x: hw2 * .48, z: -.4, ry: .52, lid: 96, sp: 1, cy: 1.6, cz: z2, lx: .2, ly: .5 }];
    }
    /* узкий экран: текст глав внизу, ноутбук наверху */
    const top = .8, h1 = clamp(1.85 / asp, 2.6, 6), h2 = clamp(2.05 / asp, 2.8, 6.4);
    return [hero,
      { x: 0, z: 0, ry: -.3, lid: 102, sp: 0, cy: 1.3, cz: h1 / TAN, lx: 0, ly: 1.2 - top * h1 },
      { x: 0, z: -.4, ry: .3, lid: 96, sp: 1, cy: 1.5, cz: h2 / TAN, lx: 0, ly: 1.35 - top * h2 }];
  }
  const KEYS = ['x', 'z', 'ry', 'lid', 'sp', 'cy', 'cz', 'lx', 'ly'];
  function poseAt(t) {
    const P = poses(), i = Math.min(P.length - 2, Math.floor(t)), f = smooth(clamp((t - i - .12) / .76)), o = {};
    KEYS.forEach(k => { o[k] = lerp(P[i][k], P[i + 1][k], f); });
    return o;
  }

  let T = 0, Ts = 0, mx = 0, my = 0, tx = 0, ty = 0, intro = 0, first = true;
  const size = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); asp = w / h; cam.aspect = asp; cam.updateProjectionMatrix(); };
  new ResizeObserver(size).observe(canvas); size();
  new IntersectionObserver(e => setVisible(e[0].isIntersecting)).observe(canvas);
  document.addEventListener('visibilitychange', () => setVisible(!document.hidden && canvas.getBoundingClientRect().bottom > 0 && canvas.getBoundingClientRect().top < innerHeight));
  addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; }, { passive: true });
  document.fonts && document.fonts.ready.then(() => leadTex.redraw());

  const t0 = performance.now(); let last = t0;
  const cur = {};
  function frame(now) {
    requestAnimationFrame(frame); if (!vis) { last = now; return; }
    const raw = Math.max(0, Math.min(.5, (now - last) / 1000)), dt = Math.min(.05, raw), t = (now - t0) / 1000; last = now;
    Ts += (T - Ts) * Math.min(1, dt * 6); mx += (tx - mx) * .05; my += (ty - my) * .05;
    intro = Math.min(1, intro + raw / 1.8); const io = 1 - Math.pow(1 - intro, 3);
    const p = poseAt(clamp(Ts, 0, 2));
    if (first) { Object.assign(cur, p); first = false; }
    /* камера догоняет мягко, чтобы смена размеров окна не дёргала кадр */
    KEYS.forEach(k => { cur[k] += (p[k] - cur[k]) * Math.min(1, dt * 10); });

    laptop.position.set(cur.x, -.95, cur.z);
    laptop.rotation.y = cur.ry + mx * .14 + Math.sin(t * .5) * .01;
    lidPivot.rotation.x = PI / 2 - cur.lid * io * PI / 180;
    const sp = cur.sp, narrow = asp < 1;
    wire.position.z = .004 + sp * .5; design.position.z = .004 + sp * 1.0;
    lead.position.set(sp * (narrow ? .55 : .85), 1.075 - sp * .7, .004 + sp * 1.45);
    const so = clamp(sp * 3) * .97; code.material.opacity = so; wire.material.opacity = so; design.material.opacity = so; lead.material.opacity = clamp(sp * 2.4 - .6);
    if (design.material.map !== screenMat.map) { design.material.map = screenMat.map; design.material.needsUpdate = true; }
    code.visible = wire.visible = design.visible = lead.visible = sp > .01;
    gloss.material.uniforms.uShift.value = laptop.rotation.y * .5 + mx * .08;
    glow.position.x = cur.x * .6; glow.position.z = cur.z; glow.material.opacity = .7 - sp * .25;

    cam.position.set(mx * .4, cur.cy, cur.cz);
    cam.lookAt(cur.lx, cur.ly, 0);

    /* смена видео через короткое затемнение экрана */
    fade += (fadeTo - fade) * Math.min(1, dt * 12);
    if (fadeTo === 0 && fade < .04 && pendingV >= 0) { apply(pendingV); pendingV = -1; fadeTo = 1; }
    screenMat.color.setScalar(fade * clamp(io * 1.6 - .3));
    renderer.render(scene, cam);
  }
  requestAnimationFrame(frame);

  return {
    setProgress(v) { T = v; },
    setHero(v) { heroBottom = v; },
    setVideo,
    get video() { return curV; },
  };
}
