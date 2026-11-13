// Концепция 3 «Галерея»: ночной музей. Прокрутка ведёт камеру по залам.
import * as THREE from 'three';

const RAD = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

const BG = 0x04060B;
const EYE = 1.6;            // высота глаз
const PIC_Y = 1.9;          // центр картины над полом
const SLAB_W = 3.9;         // ширина стелы
const SLAB_H = 4.7;         // высота стелы (и столько же вниз — «отражение»)
const DOOR_W = 2.6, DOOR_H = 4.4;
const FW = 4.4, FH = 2.5, FY = 2.05;   // пустая рама в финале
const Z_FINAL = -143;
const TEXT_Z = [-12, -57, -102];
const TITLE_Z = [-17.5, -62.5, -107.5];
const HALL_Z = { 1: [-23, -30, -37, -44], 2: [-68, -75, -82, -89], 3: [-113, -120, -127] };
const HALL_SIDE = { 1: [-1, 1, -1, 1], 2: [1, -1, 1, -1], 3: [-1, 1, -1] };
const END = 0.97;           // доля прокрутки, на которой камера уже в финале
const PLATE_W = 300;

// Фразы-экспликации: разбивка по строкам для широкого и узкого экрана
const PHRASES = {
  d: [
    [{ t: 'Каждый сайт —' }, { t: 'под одно конкретное дело.', grad: true }],
    [{ t: 'Сначала показываем.', grad: true }, { t: 'Потом берём деньги.' }],
    [{ t: '700+', k: 2.3, grad: true, lh: 0.98 }, { t: 'сайтов и концептов' }],
  ],
  m: [
    [{ t: 'Каждый сайт —' }, { t: 'под одно', grad: true }, { t: 'конкретное дело.', grad: true }],
    [{ t: 'Сначала', grad: true }, { t: 'показываем.', grad: true }, { t: 'Потом берём' }, { t: 'деньги.' }],
    [{ t: '700+', k: 2.3, grad: true, lh: 0.98 }, { t: 'сайтов' }, { t: 'и концептов' }],
  ],
};

// ───────────────────────── шейдеры ─────────────────────────
const VERT = `
varying vec2 vUv;
varying vec3 vPos;
varying float vFogDepth;
void main() {
  vUv = uv;
  vPos = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vFogDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const HEAD = `
uniform vec3 uFogColor;
uniform float uFogDensity;
varying vec2 vUv;
varying vec3 vPos;
varying float vFogDepth;
float gFog(float d) { return 1.0 - exp(-uFogDensity * uFogDensity * d * d); }
float gHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
`;

// Картина и её отражение под полом (MIRROR): размытое и гаснущее в глубину
const PIC_FRAG = HEAD + `
uniform sampler2D uMap;
uniform float uLit;
uniform float uReady;
void main() {
  vec3 base = vec3(0.04, 0.05, 0.075);
#ifdef MIRROR
  float s = 0.004 + 0.024 * vUv.y;
  vec3 t = texture2D(uMap, vUv).rgb * 0.36;
  t += texture2D(uMap, vUv + vec2(0.0, s)).rgb * 0.16;
  t += texture2D(uMap, vUv - vec2(0.0, s)).rgb * 0.16;
  t += texture2D(uMap, vUv + vec2(s * 0.6, 0.0)).rgb * 0.16;
  t += texture2D(uMap, vUv - vec2(s * 0.6, 0.0)).rgb * 0.16;
  vec3 col = mix(base, t, uReady);
  col *= mix(0.62, 0.05, smoothstep(0.0, 1.0, vUv.y)) * mix(0.45, 1.0, uLit);
#else
  vec3 col = mix(base, texture2D(uMap, vUv).rgb, uReady);
  vec2 q = (vUv - vec2(0.5, 0.64)) * vec2(1.0, 0.8);
  float wash = 1.0 - 0.2 * smoothstep(0.2, 0.75, length(q));
  col *= mix(0.32, 1.0, uLit) * wash;
#endif
  col = mix(col, uFogColor, gFog(vFogDepth));
  col += (gHash(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;

// Стела: тёмный камень, по которому сверху стекает свет от светильника
const SLAB_FRAG = HEAD + `
uniform float uLit;
uniform float uBarY;
void main() {
  float y = abs(vPos.y);
  float dy = uBarY - y;
  float spread = 1.25 + max(dy, 0.0) * 0.7;
  float r = vPos.x / spread;
  float beam = exp(-r * r);
  float fall = dy > 0.0 ? exp(-dy * 0.36) : exp(dy * 5.0);
  vec3 col = vec3(0.026, 0.032, 0.048) + vec3(0.62, 0.77, 1.0) * beam * fall * (0.04 + 0.3 * uLit);
  col *= mix(1.0, 0.6, step(vPos.y, 0.0));
  col = mix(col, uFogColor, gFog(vFogDepth));
  col += (gHash(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;

// Свет в воздухе и на полу. SHAPE 0 — мягкое пятно, 1 — расходящийся луч, 2 — столб света от пола
const GLOW_FRAG = HEAD + `
uniform vec3 uColor;
uniform vec3 uColor2;
uniform float uOpacity;
uniform float uLit;
uniform float uW0;
void main() {
  float a = 0.0;
  vec3 c = uColor;
#if SHAPE == 0
  float r = length(vUv - 0.5) * 2.0;
  a = max(exp(-r * r * 3.4) - 0.0334, 0.0) / 0.9666;
#elif SHAPE == 1
  float y = 1.0 - vUv.y;
  float w = mix(uW0, 1.0, y);
  float x = (vUv.x - 0.5) * 2.0 / w;
  a = exp(-x * x * 2.6) * (1.0 - smoothstep(0.3, 1.0, y)) * smoothstep(0.0, 0.04, y);
  a *= 1.0 - smoothstep(0.8, 1.0, abs(vUv.x - 0.5) * 2.0);
#else
  float x = (vUv.x - 0.5) * 2.0;
  float y = vUv.y;
  a = exp(-x * x * uW0) * (0.34 + 0.66 * exp(-y * 2.4));
  a *= (1.0 - smoothstep(0.6, 1.0, abs(x))) * (1.0 - smoothstep(0.8, 1.0, y));
  c = mix(uColor, uColor2, smoothstep(0.0, 0.9, y));
#endif
  a *= uOpacity * uLit * (1.0 - gFog(vFogDepth)) * smoothstep(0.5, 3.0, vFogDepth);
  vec3 col = c * a + (gHash(gl_FragCoord.xy) - 0.5) / 255.0 * step(0.002, a);
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}`;

// Пылинки: облако вокруг камеры, видны только в свете ближайшей картины
const DUST_VERT = `
attribute float aSeed;
uniform vec3 uBox;
uniform float uTime;
uniform float uSize;
uniform vec3 uLight;
uniform float uLightK;
varying float vA;
void main() {
  vec3 p = position;
  p.x += uTime * 0.03 * (aSeed - 0.5);
  p.y += sin(uTime * 0.13 + aSeed * 40.0) * 0.2 + uTime * 0.012;
  vec3 rel = mod(p - cameraPosition + uBox * 0.5, uBox) - uBox * 0.5;
  vec3 wp = cameraPosition + rel;
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  float d = -mv.z;
  float dl = distance(wp, uLight);
  vA = smoothstep(0.5, 2.5, d) * (1.0 - smoothstep(5.0, 8.0, length(rel))) * step(0.06, wp.y);
  vA *= 0.08 + 0.92 * uLightK * exp(-dl * dl / 7.0);
  vA *= 0.5 + 0.5 * aSeed;
  gl_PointSize = uSize * (0.6 + aSeed) / max(d, 0.5);
  gl_Position = projectionMatrix * mv;
}`;

const DUST_FRAG = `
uniform vec3 uColor;
varying float vA;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = (1.0 - smoothstep(0.0, 1.0, r)) * vA;
  gl_FragColor = vec4(uColor * a, 1.0);
}`;

// ───────────────────────── запуск ─────────────────────────
export function start(G) {
  THREE.ColorManagement.enabled = false;   // цвета задаём сразу «как на экране»

  const E = G.els;
  const root = document.documentElement;
  let compact = G.isCompact();
  let alive = true;
  let shaderBroken = false;
  let raf = 0;

  const renderer = G.makeRenderer
    ? G.makeRenderer(E.canvas)
    : new THREE.WebGLRenderer({ canvas: E.canvas, antialias: !compact, alpha: false, stencil: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  if (renderer.debug) {
    renderer.debug.onShaderError = (gl, program, vs, fs) => {
      let msg = '';
      try { msg = gl.getShaderInfoLog(vs) || gl.getShaderInfoLog(fs) || gl.getProgramInfoLog(program) || ''; } catch (e) { msg = ''; }
      window.__errs.push('shader: ' + String(msg).slice(0, 300));
      shaderBroken = true;
    };
  }
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);
  let pr = Math.min(window.devicePixelRatio || 1, 1.5);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.FogExp2(BG, 0.045);
  const camera = new THREE.PerspectiveCamera(50, 1.6, 0.12, 130);
  const U = { fogColor: { value: scene.fog.color }, fogDensity: { value: 0.045 } };

  const planeGeo = new THREE.PlaneGeometry(1, 1);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const slabGeo = new THREE.BoxGeometry(SLAB_W, SLAB_H * 2, 0.3);
  const blankTex = new THREE.DataTexture(new Uint8Array([10, 13, 19, 255]), 1, 1);
  blankTex.needsUpdate = true;
  const ONE = { value: 1 };

  // ── материалы
  function glowMat(shape, color, opacity, o = {}) {
    return new THREE.ShaderMaterial({
      defines: { SHAPE: shape },
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uColor2: { value: new THREE.Color(o.color2 !== undefined ? o.color2 : color) },
        uOpacity: { value: opacity },
        uLit: o.lit || ONE,
        uW0: { value: o.w0 !== undefined ? o.w0 : 0.35 },
        uFogColor: U.fogColor, uFogDensity: U.fogDensity,
      },
      vertexShader: VERT, fragmentShader: GLOW_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
  }
  function slabMat(lit, barY) {
    return new THREE.ShaderMaterial({
      uniforms: { uLit: lit, uBarY: { value: barY }, uFogColor: U.fogColor, uFogDensity: U.fogDensity },
      vertexShader: VERT, fragmentShader: SLAB_FRAG,
    });
  }
  function picMat(uMap, uReady, lit, mirror) {
    return new THREE.ShaderMaterial({
      defines: mirror ? { MIRROR: 1 } : {},
      uniforms: { uMap, uReady, uLit: lit, uFogColor: U.fogColor, uFogDensity: U.fogDensity },
      vertexShader: VERT, fragmentShader: PIC_FRAG,
    });
  }
  const wallMat = new THREE.MeshBasicMaterial({ color: 0x05070C });
  const C_FRAME0 = new THREE.Color(0x1B2233), C_FRAME1 = new THREE.Color(0x9FB4E4);
  const C_BAR0 = new THREE.Color(0x3A4660), C_BAR1 = new THREE.Color(0xEEF4FF);

  function mesh(geo, mat, sx, sy, sz, px, py, pz, order) {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(px, py, pz);
    if (order !== undefined) m.renderOrder = order;
    return m;
  }
  // Порядок отрисовки: 0 — всё, что под полом (отражения), 1 — пол, 2+ — свет и надписи над полом

  // ── пол, стены
  const floor = mesh(planeGeo, new THREE.MeshBasicMaterial({ color: BG, transparent: true, opacity: 0.5, depthWrite: false, fog: false }), 21.2, 200, 1, 0, 0, -68, 1);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  scene.add(mesh(boxGeo, wallMat, 0.8, 22, 200, -11, 0, -68));
  scene.add(mesh(boxGeo, wallMat, 0.8, 22, 200, 11, 0, -68));
  scene.add(mesh(boxGeo, wallMat, 24, 22, 0.8, 0, 0, Z_FINAL - 9));

  // ── вход: проём в тёмной стене, из которого льётся свет
  const door = new THREE.Group();
  [-1, 1].forEach(s => door.add(mesh(boxGeo, wallMat, 12, 22, 0.8, s * (DOOR_W / 2 + 6), 0, 0)));
  [1, -1].forEach(s => door.add(mesh(boxGeo, wallMat, DOOR_W, 11 - DOOR_H, 0.8, 0, s * (DOOR_H + (11 - DOOR_H) / 2), 0)));
  const stripMat = new THREE.MeshBasicMaterial({ color: 0xDCE8FF });
  [-1, 1].forEach(s => door.add(mesh(boxGeo, stripMat, 0.03, DOOR_H * 2, 0.03, s * DOOR_W / 2, 0, 0.41)));
  [1, -1].forEach(s => door.add(mesh(boxGeo, stripMat, DOOR_W + 0.03, 0.03, 0.03, 0, s * DOOR_H, 0.41)));
  {
    const bloom = glowMat(0, 0x2B5BFF, 0.11);
    door.add(mesh(planeGeo, bloom, 10, 6.4, 1, 0, 3.2, 0.43, 2));
    door.add(mesh(planeGeo, bloom, 10, -6.4, 1, 0, -3.2, 0.43, 0));
    const spill = mesh(planeGeo, glowMat(1, 0xA9C8FF, 0.34, { w0: 0.4 }), 9, 11.5, 1, 0, 0.012, 0.4 + 5.75, 2);
    spill.rotation.x = -Math.PI / 2;
    door.add(spill);
    const spillIn = mesh(planeGeo, glowMat(1, 0xA9C8FF, 0.2, { w0: 0.4 }), 9, 9, 1, 0, 0.012, -0.4 - 4.5, 2);
    spillIn.rotation.x = Math.PI / 2;     // тот же луч, но внутрь зала
    door.add(spillIn);
  }
  scene.add(door);
  const doorHaze = new THREE.Group();
  [[-1.2, 0.36], [-3.6, 0.22], [-6.5, 0.13]].forEach(([z, op]) => {
    const m = glowMat(2, 0xEAF2FF, op, { color2: 0x2B5BFF, w0: 3.0 });
    doorHaze.add(mesh(planeGeo, m, 7, 5.2, 1, 0, 2.6, z, 2));
    doorHaze.add(mesh(planeGeo, m, 7, -5.2, 1, 0, -2.6, z, 0));
  });
  scene.add(doorHaze);

  // ── дальние столбы света вдоль стен (только на широком экране)
  const slots = new THREE.Group();
  {
    const mA = glowMat(2, 0x2B5BFF, 0.2, { color2: 0x6B4BFF, w0: 4.0 });
    for (let z = -9, i = 0; z > Z_FINAL - 6; z -= 15, i++) {
      [-1, 1].forEach(s => {
        const zz = z - (s > 0 ? 7.5 : 0);
        const g = new THREE.Group();
        g.add(mesh(planeGeo, mA, 1.5, 5.6, 1, s * 9.6, 2.8, zz, 2));
        g.add(mesh(planeGeo, mA, 1.5, -5.6, 1, s * 9.6, -2.8, zz, 0));
        g.userData.z = zz;
        slots.add(g);
      });
    }
  }
  scene.add(slots);

  // ── картины
  const loader = new THREE.TextureLoader();
  const hallCount = { 1: 0, 2: 0, 3: 0 };
  const exhibits = G.works.map((work, i) => {
    const n = hallCount[work.hall]++;
    const isVid = !!work.v;
    const w = isVid ? 3.1 : 3.4;
    const h = isVid ? w / 1.6 : w / 2;
    const barY = PIC_Y + h / 2 + 0.4;
    const lit = { value: 0 }, uMap = { value: blankTex }, uReady = { value: 0 };
    const g = new THREE.Group();

    g.add(mesh(slabGeo, slabMat(lit, barY), 1, 1, 1, 0, 0, -0.15));

    const frameMat = new THREE.MeshBasicMaterial({ color: 0x1B2233 });
    g.add(mesh(boxGeo, frameMat, w + 0.07, h + 0.07, 0.06, 0, PIC_Y, 0.03));
    g.add(mesh(boxGeo, frameMat, w + 0.07, h + 0.07, 0.06, 0, -PIC_Y, 0.03));
    g.add(mesh(planeGeo, picMat(uMap, uReady, lit, false), w, h, 1, 0, PIC_Y, 0.066));
    g.add(mesh(planeGeo, picMat(uMap, uReady, lit, true), w, -h, 1, 0, -PIC_Y, 0.066));

    // светильник над картиной, его ореол, луч в воздухе и пятно на полу
    const barMat = new THREE.MeshBasicMaterial({ color: 0x3A4660 });
    g.add(mesh(boxGeo, barMat, w * 0.46, 0.022, 0.06, 0, barY, 0.2));
    g.add(mesh(boxGeo, barMat, w * 0.46, 0.022, 0.06, 0, -barY, 0.2));
    const halo = glowMat(0, 0xBFD6FF, 0.5, { lit });
    g.add(mesh(planeGeo, halo, w * 0.95, 0.7, 1, 0, barY, 0.24, 2));
    g.add(mesh(planeGeo, halo, w * 0.95, 0.7, 1, 0, -barY, 0.24, 0));
    const reach = 1.25;
    const ray = mesh(planeGeo, glowMat(1, 0xA9C8FF, 0.05, { lit, w0: 0.36 }), w + 1.4, Math.hypot(barY, reach), 1, 0, barY / 2, 0.25 + reach / 2, 2);
    ray.rotation.x = -Math.atan2(reach, barY);
    g.add(ray);
    const pool = mesh(planeGeo, glowMat(0, 0xB4CEFF, 0.26, { lit }), w + 1.8, 3.0, 1, 0, 0.012, 1.35, 2);
    pool.rotation.x = -Math.PI / 2;
    g.add(pool);

    scene.add(g);
    if (HALL_SIDE[work.hall][n] > 0) E.plates[i].classList.add('r');
    return {
      work, g, w, h, lit, uMap, uReady, frameMat, barMat,
      side: HALL_SIDE[work.hall][n], z: HALL_Z[work.hall][n], hall: work.hall,
      plate: E.plates[i], pVis: false, pA: 0, pT: '',
      anchor: new THREE.Vector3(), light: new THREE.Vector3(), stop: 0,
      url: isVid ? '../../assets/video/' + work.v + '.jpg' : '../../assets/shots/' + work.id + '.jpg',
      vurl: isVid ? '../../assets/video/' + work.v + '.mp4' : '',
      state: 0, still: null, video: null, vtex: null, vWant: false, vOn: false,
    };
  });

  // ── финальный зал: пустая подсвеченная рама
  const fin = new THREE.Group();
  fin.position.set(0, 0, Z_FINAL);
  const finSlab = mesh(slabGeo, slabMat(ONE, FY + FH / 2 + 0.5), 6.4 / SLAB_W, 1, 1, 0, 0, -0.15);
  fin.add(finSlab);
  const finMat = new THREE.MeshBasicMaterial({ color: 0xDCE8FF });
  const finGlow = glowMat(0, 0x2B5BFF, 0.2);
  const finAura = glowMat(0, 0x6B4BFF, 0.16);
  function frameBars(group) {
    const t = 0.035;
    group.add(mesh(boxGeo, finMat, FW + t, t, 0.07, 0, FH / 2, 0.035));
    group.add(mesh(boxGeo, finMat, FW + t, t, 0.07, 0, -FH / 2, 0.035));
    group.add(mesh(boxGeo, finMat, t, FH, 0.07, -FW / 2, 0, 0.035));
    group.add(mesh(boxGeo, finMat, t, FH, 0.07, FW / 2, 0, 0.035));
  }
  const finFrame = new THREE.Group(); finFrame.position.set(0, FY, 0);
  const finFrameM = new THREE.Group(); finFrameM.position.set(0, -FY, 0);
  frameBars(finFrame); frameBars(finFrameM);
  finFrame.add(mesh(planeGeo, finGlow, FW * 1.2, FH * 1.3, 1, 0, 0, 0.02, 2));
  finFrame.add(mesh(planeGeo, finAura, FW * 1.75, FY * 1.9, 1, 0, 0, 0.012, 2));
  finFrameM.add(mesh(planeGeo, finGlow, FW * 1.2, FH * 1.3, 1, 0, 0, 0.02, 0));
  fin.add(finFrame, finFrameM);
  {
    const barY = FY + FH / 2 + 0.5;
    fin.add(mesh(boxGeo, finMat, 2.2, 0.022, 0.06, 0, barY, 0.2));
    fin.add(mesh(boxGeo, finMat, 2.2, 0.022, 0.06, 0, -barY, 0.2));
    const halo = glowMat(0, 0xBFD6FF, 0.55);
    fin.add(mesh(planeGeo, halo, 4.4, 0.8, 1, 0, barY, 0.24, 2));
    fin.add(mesh(planeGeo, halo, 4.4, 0.8, 1, 0, -barY, 0.24, 0));
    const pool = mesh(planeGeo, glowMat(0, 0xB4CEFF, 0.32), FW + 3, 4.2, 1, 0, 0.012, 1.9, 2);
    pool.rotation.x = -Math.PI / 2;
    fin.add(pool);
  }
  scene.add(fin);
  const FIN_POS = new THREE.Vector3(0, FY, Z_FINAL);

  // ── пылинки
  const DUST_N = compact ? 110 : 240;
  const dustGeo = new THREE.BufferGeometry();
  {
    const pos = new Float32Array(DUST_N * 3), seed = new Float32Array(DUST_N);
    for (let i = 0; i < DUST_N; i++) {
      pos[i * 3] = Math.random() * 16; pos[i * 3 + 1] = Math.random() * 6; pos[i * 3 + 2] = Math.random() * 16;
      seed[i] = Math.random();
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  }
  const dustMat = new THREE.ShaderMaterial({
    uniforms: {
      uBox: { value: new THREE.Vector3(16, 6, 16) }, uTime: { value: 0 }, uSize: { value: 10 },
      uLight: { value: new THREE.Vector3(0, 2.4, 0) }, uLightK: { value: 0 }, uColor: { value: new THREE.Color(0x9DB8E8) },
    },
    vertexShader: DUST_VERT, fragmentShader: DUST_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  dust.renderOrder = 4;
  scene.add(dust);

  // ── маршрут: вход → фраза → картины зала → … → финал
  const SEQ = [{ kind: 'hero', hall: 0 }];
  [1, 2, 3].forEach(hall => {
    SEQ.push({ kind: 'text', n: hall - 1, z: TEXT_Z[hall - 1], hall, ty: 2.05 });
    exhibits.forEach(ex => { if (ex.hall === hall) { ex.stop = SEQ.length; SEQ.push({ kind: 'work', ex, hall }); } });
  });
  SEQ.push({ kind: 'final', hall: 4 });
  SEQ.forEach(s => { s.pos = new THREE.Vector3(); s.look = new THREE.Vector3(); });
  const NSEG = SEQ.length - 1;
  const wts = [], cum = [0];
  for (let k = 0; k < NSEG; k++) {
    const a = SEQ[k], b = SEQ[k + 1];
    const w = a.kind === 'hero' ? 1.0 : b.kind === 'final' ? 1.3 : (a.kind === 'text' || b.kind === 'text') ? 0.9 : 1.0;
    wts.push(w); cum.push(cum[k] + w);
  }
  const total = cum[NSEG];
  const hallStop = [0, 0, 0, 0, NSEG];
  [1, 2, 3].forEach(hall => { hallStop[hall] = SEQ.findIndex(s => s.kind === 'work' && s.hall === hall); });

  function poseAt(s, outPos, outLook) {
    let k = 0;
    while (k < NSEG - 1 && s >= cum[k + 1]) k++;
    const f = clamp((s - cum[k]) / wts[k], 0, 1);
    const e = lerp(f, f * f * (3 - 2 * f), 0.7);
    outPos.lerpVectors(SEQ[k].pos, SEQ[k + 1].pos, e);
    outLook.lerpVectors(SEQ[k].look, SEQ[k + 1].look, e);
    return k + f;
  }

  // ── надписи в пространстве (рисуем на холсте, когда загрузятся шрифты)
  const SANS = '"Inter", -apple-system, "SF Pro Display", system-ui, sans-serif';
  const SERIF = '"Cormorant Garamond", "Times New Roman", serif';
  function drawText(lines, px) {
    const cv = document.createElement('canvas');
    const cx = cv.getContext('2d');
    const prep = l => {
      const size = Math.round(px * (l.k || 1));
      cx.font = (l.serif ? 'italic 500 ' : '600 ') + size + 'px ' + (l.serif ? SERIF : SANS);
      if ('letterSpacing' in cx) cx.letterSpacing = (l.serif ? 0 : -0.03 * size).toFixed(1) + 'px';
    };
    const rows = [];
    let W = 1, H = 0;
    for (const l of lines) {
      prep(l);
      const size = px * (l.k || 1);
      const w = cx.measureText(l.t).width;
      rows.push({ l, w, size, y: H });
      W = Math.max(W, w);
      H += size * (l.lh || 1.08);
    }
    const pad = Math.round(px * 0.3);
    const fullW = W + pad * 2, fullH = H + pad * 2;
    const k = Math.min(1, 2048 / fullW, 2048 / fullH);
    cv.width = Math.max(2, Math.ceil(fullW * k));
    cv.height = Math.max(2, Math.ceil(fullH * k));
    cx.setTransform(k, 0, 0, k, 0, 0);
    cx.textAlign = 'center';
    cx.textBaseline = 'alphabetic';
    for (const r of rows) {
      prep(r.l);
      const mid = fullW / 2;
      if (r.l.grad) {
        const g = cx.createLinearGradient(mid - r.w / 2, 0, mid + r.w / 2, 0);
        g.addColorStop(0, '#EAF2FF'); g.addColorStop(0.55, '#9CC4FF'); g.addColorStop(1, '#7C8CFF');
        cx.fillStyle = g;
      } else {
        cx.fillStyle = r.l.color || '#F5F5F7';
      }
      cx.fillText(r.l.t, mid, pad + r.y + r.size * 0.86);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = aniso;
    return { tex, w: fullW, h: fullH };
  }

  const texts = [];
  let textsReady = false, textsFor = null;
  function addText(parent, lines, o) {
    const d = drawText(lines, o.px);
    let w = d.w * o.em / o.px, h = d.h * o.em / o.px;
    if (o.maxW && w > o.maxW) { h *= o.maxW / w; w = o.maxW; }
    const mat = new THREE.MeshBasicMaterial({ map: d.tex, transparent: true, depthWrite: false, opacity: o.base });
    if (o.additive) mat.blending = THREE.AdditiveBlending;
    const m = mesh(planeGeo, mat, w, h, 1, o.x || 0, o.y || 0, o.z || 0, 3);
    parent.add(m);
    const rec = { parent, mesh: m, mat, tex: d.tex, mirror: null, mirrorMat: null, base: o.base, fade: !!o.fade, pos: o.pos, w, h };
    if (o.mirrorY !== undefined) {
      rec.mirrorMat = new THREE.MeshBasicMaterial({ map: d.tex, transparent: true, depthWrite: false, opacity: o.base * 0.26 });
      rec.mirror = mesh(planeGeo, rec.mirrorMat, w, -h, 1, o.x || 0, o.mirrorY, o.z || 0, 0);
      parent.add(rec.mirror);
    }
    texts.push(rec);
    return rec;
  }
  function buildTexts() {
    for (const t of texts) {
      t.parent.remove(t.mesh); t.mat.dispose(); t.tex.dispose();
      if (t.mirror) { t.parent.remove(t.mirror); t.mirrorMat.dispose(); }
    }
    texts.length = 0;
    const c = compact;
    textsFor = c;
    const set = c ? PHRASES.m : PHRASES.d;
    SEQ.forEach(s => {
      if (s.kind !== 'text') return;
      addText(scene, set[s.n], { px: c ? 112 : 150, em: c ? 0.41 : 0.62, maxW: c ? 3.7 : 8.6, base: 1, fade: true, y: s.ty, z: s.z, mirrorY: -s.ty, pos: new THREE.Vector3(0, s.ty, s.z) });
    });
    TITLE_Z.forEach((z, n) => {
      const t = addText(scene, [{ t: 'Зал ' + (n + 1), serif: true, k: 0.52, color: '#9CC4FF' }, { t: G.halls[n + 1].t }],
        { px: 128, em: c ? 0.5 : 0.62, base: 0.5, additive: true, y: 0.014, z, pos: new THREE.Vector3(0, 0, z) });
      t.mesh.rotation.x = -Math.PI / 2;
      t.mesh.scale.y *= 1.9;                 // вытягиваем вглубь: с высоты глаз читается как обычный текст
      t.mesh.renderOrder = 2;
    });
    addText(finFrame, [{ t: 'Здесь будет' }, { t: 'ваш сайт', grad: true }], { px: 128, em: 0.44, base: 0.96, z: 0.03, pos: FIN_POS });
  }

  // ── раскладка: зависит от пропорций экрана
  let vw = 1, vh = 1, hudH = 1, scrollable = 1, walkTop = 0, viewDist = 46, sized = '';
  function layout() {
    vw = Math.max(1, E.stage.clientWidth);
    vh = Math.max(1, E.stage.clientHeight);
    hudH = E.hud.clientHeight || vh;
    compact = G.isCompact();
    root.classList.toggle('compact', compact);
    camera.fov = compact ? 62 : 50;
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
    const tanV = Math.tan(camera.fov * RAD / 2), tanH = tanV * camera.aspect;
    const dens = compact ? 0.038 : 0.045;
    scene.fog.density = dens;
    U.fogDensity.value = dens;
    viewDist = compact ? 30 : 46;
    slots.visible = !compact;

    const X = compact ? 2.7 : 3.6;
    const shift = compact ? 0 : 0.9;        // на широком экране картина смещена, рядом место для таблички

    for (const s of SEQ) {
      if (s.kind === 'hero') {
        if (compact) { s.pos.set(0, EYE, 15); s.look.set(0, 3.85, 0); }
        else { s.pos.set(-1.6, EYE, 11); s.look.set(-4.2, 2.0, 0); }
      } else if (s.kind === 'text') {
        const tw = compact ? 3.7 : 8.6;
        s.ty = compact ? 2.35 : 2.05;
        const d = compact ? Math.max(6, (tw / 2) / (0.84 * tanH)) : Math.max(7.5, (tw / 2) / (0.8 * tanH));
        s.pos.set(0, EYE, s.z + d);
        s.look.set(0, s.ty - (compact ? 0.2 : 0.28) * d * tanV, s.z);
      } else if (s.kind === 'work') {
        const ex = s.ex, side = ex.side;
        const d = compact
          ? Math.max(4.6, (ex.w / 2) / (0.86 * tanH))
          : Math.max(4.6, (ex.w / 2 + shift) / (0.72 * tanH));
        // на телефоне стела повёрнута ровно настолько, чтобы камера шла по центру зала
        const ang = compact ? clamp(Math.asin(clamp(X / d, 0, 1)), 14 * RAD, 38 * RAD) : 32 * RAD;
        const th = -side * ang;
        ex.g.position.set(side * X, 0, ex.z);
        ex.g.rotation.y = th;
        const nx = Math.sin(th), nz = Math.cos(th);      // нормаль стелы
        const tx = Math.cos(th), tz = -Math.sin(th);     // её ось X в мире
        const cs = -side;                                // с какой стороны проход (в осях стелы)
        s.pos.set(side * X + nx * d, EYE, ex.z + nz * d);
        s.look.set(side * X + tx * cs * shift, PIC_Y - (compact ? 0.28 : 0.23) * d * tanV, ex.z + tz * cs * shift);
        ex.anchor.set(cs * (ex.w / 2 + 0.55), PIC_Y - ex.h / 2, 0.07);
        ex.light.set(side * X + nx * 1.2, 2.3, ex.z + nz * 1.2);
      } else {
        const k = compact ? 0.82 : 1;
        finFrame.scale.setScalar(k);
        finFrameM.scale.setScalar(k);
        const half = FW * k / 2;
        if (compact) {
          const d = Math.max(6, half / (0.86 * tanH));
          s.pos.set(0, EYE, Z_FINAL + d);
          s.look.set(0, FY - 0.42 * d * tanV, Z_FINAL);
        } else {
          const sh = 1.5;
          const d = Math.max(6.6, (half + sh) / (0.74 * tanH));
          s.pos.set(0, EYE, Z_FINAL + d);
          s.look.set(sh, FY - 0.27 * d * tanV, Z_FINAL);
        }
      }
    }

    scrollable = Math.max(1, E.walk.offsetHeight - vh);
    walkTop = E.walk.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0);
    const key = vw + 'x' + vh + '@' + pr;
    if (key !== sized) {            // холст пересоздаём только при реальной смене размера
      sized = key;
      renderer.setPixelRatio(pr);
      renderer.setSize(vw, vh, false);
    }
    dustMat.uniforms.uSize.value = 0.011 * (vh * pr) / (2 * tanV);
    scene.updateMatrixWorld(true);
    if (textsReady && textsFor !== compact) buildTexts();
  }

  // ── текстуры: грузим только у ближайших картин
  function loadStill(ex) {
    if (ex.state) return;
    ex.state = 1;
    loader.load(ex.url, tex => {
      if (!alive) { tex.dispose(); return; }
      tex.anisotropy = aniso;
      ex.still = tex;
      if (!ex.vOn) ex.uMap.value = tex;
      ex.state = 2;
    }, undefined, () => { ex.state = 3; });
  }
  function setVideo(ex, want) {
    ex.vWant = want;
    if (want) {
      if (!ex.video) {
        const v = document.createElement('video');
        v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
        v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
        v.src = ex.vurl;
        ex.video = v;
        ex.vtex = new THREE.VideoTexture(v);
        ex.vtex.generateMipmaps = false;
        ex.vtex.minFilter = THREE.LinearFilter;
      }
      const p = ex.video.play();
      if (p && p.catch) p.catch(() => {});
    } else if (ex.video) {
      ex.video.pause();
    }
  }

  // ── интерфейс поверх сцены
  const navBtns = Array.prototype.slice.call(E.scale.querySelectorAll('button'));
  let navOn = 0, heroA = -1, finA = -1, finVis = false;
  function scrollToStop(k) {
    const p = k >= NSEG ? 1 : (cum[k] / total) * END;
    window.scrollTo({ top: walkTop + p * scrollable + (k > 0 && k < NSEG ? 1 : 0), behavior: 'smooth' });
  }
  navBtns.forEach(b => b.addEventListener('click', () => scrollToStop(hallStop[Number(b.dataset.hall) || 0])));
  exhibits.forEach(ex => ex.plate.addEventListener('focusin', () => { if (Math.abs(pathPos - ex.stop) > 0.3) scrollToStop(ex.stop); }));
  E.final.addEventListener('focusin', () => { if (NSEG - pathPos > 0.3) scrollToStop(NSEG); });

  const tmp = new THREE.Vector3();
  function setPlate(ex, a) {
    const el = ex.plate;
    if (a <= 0.004) {
      if (ex.pVis) { ex.pVis = false; ex.pA = 0; el.classList.remove('vis'); el.style.opacity = '0'; }
      return;
    }
    if (!ex.pVis) { ex.pVis = true; el.classList.add('vis'); }
    if (Math.abs(a - ex.pA) > 0.004) { ex.pA = a; el.style.opacity = a.toFixed(3); }
    if (compact) {
      if (ex.pT) { ex.pT = ''; el.style.transform = ''; }
      return;
    }
    tmp.copy(ex.anchor);
    ex.g.localToWorld(tmp);
    tmp.project(camera);
    let sx = (tmp.x * 0.5 + 0.5) * vw;
    const sy = clamp((-tmp.y * 0.5 + 0.5) * vh, 250, hudH - 24);
    let tr;
    if (ex.side < 0) {
      sx = clamp(sx, 150, vw - PLATE_W - 24);
      tr = 'translate3d(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px,0) translateY(-100%)';
    } else {
      sx = clamp(sx, PLATE_W + 150, vw - 24);
      tr = 'translate3d(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px,0) translate(-100%,-100%)';
    }
    if (tr !== ex.pT) { ex.pT = tr; el.style.transform = tr; }
  }

  // ── кадр
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let sNow = 0, sFirst = true, pathPos = 0, time = 0;
  let mx = 0, my = 0, mxT = 0, myT = 0;

  function update(dt) {
    time += dt;
    const y = (window.scrollY || window.pageYOffset || 0) - walkTop;
    const sT = Math.min(1, clamp(y / scrollable, 0, 1) / END) * total;
    if (sFirst) { sNow = sT; sFirst = false; }
    sNow += (sT - sNow) * (1 - Math.exp(-dt * 3.4));
    if (Math.abs(sT - sNow) < 0.0003) sNow = sT;
    pathPos = poseAt(sNow, camPos, camLook);

    const km = 1 - Math.exp(-dt * 3);
    mx += (mxT - mx) * km; my += (myT - my) * km;
    camera.position.set(camPos.x + mx * 0.22, camPos.y - my * 0.09 + Math.sin(time * 0.55) * 0.012, camPos.z);
    camera.lookAt(camLook);
    camera.updateMatrixWorld();
    const cz = camera.position.z;

    // картины: свет, видимость, текстуры, видео, таблички
    const kl = 1 - Math.exp(-dt * 4);
    let near = null, nearD = 9;
    for (const ex of exhibits) {
      const dist = Math.abs(pathPos - ex.stop);
      if (dist < nearD) { nearD = dist; near = ex; }
      ex.lit.value += ((1 - sstep(0.3, 0.95, dist)) - ex.lit.value) * kl;
      ex.frameMat.color.lerpColors(C_FRAME0, C_FRAME1, ex.lit.value);
      ex.barMat.color.lerpColors(C_BAR0, C_BAR1, ex.lit.value);
      const ahead = cz - ex.z;
      ex.g.visible = ahead > -9 && ahead < viewDist;
      if (pathPos > ex.stop - 3.2 && pathPos < ex.stop + 1.6) loadStill(ex);
      if (ex.still && ex.uReady.value < 1) ex.uReady.value = Math.min(1, ex.uReady.value + dt * 1.5);
      if (ex.vurl) {
        const want = dist < 0.42 && !document.hidden;
        if (want !== ex.vWant) setVideo(ex, want);
        if (ex.vWant && !ex.vOn && ex.video.readyState >= 2 && ex.video.currentTime > 0.03) {
          ex.uMap.value = ex.vtex;
          ex.vOn = true;
          ex.uReady.value = Math.max(ex.uReady.value, 0.6);
        }
      }
      setPlate(ex, 1 - sstep(0.22, 0.5, dist));
    }

    // вход
    door.visible = cz > -1.5;
    doorHaze.visible = cz > -9;
    const ha = 1 - sstep(0.04, 0.5, pathPos);
    if (Math.abs(ha - heroA) > 0.004) {
      heroA = ha;
      E.hud.style.setProperty('--hero', ha.toFixed(3));
      E.hud.classList.toggle('hero-off', ha <= 0.004);
    }

    // финал
    const fa = sstep(NSEG - 0.6, NSEG - 0.15, pathPos);
    if (Math.abs(fa - finA) > 0.004) {
      finA = fa;
      E.final.style.opacity = fa.toFixed(3);
      const v = fa > 0.004;
      if (v !== finVis) { finVis = v; E.final.classList.toggle('vis', v); }
    }
    fin.visible = cz - Z_FINAL < viewDist + 8;
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.9);
    finMat.color.setRGB(lerp(0.78, 1, pulse), lerp(0.85, 1, pulse), 1);
    finGlow.uniforms.uOpacity.value = lerp(0.15, 0.26, pulse);

    // шкала залов
    const hall = SEQ[clamp(Math.round(pathPos), 0, NSEG)].hall;
    if (hall !== navOn) {
      navBtns[navOn].classList.remove('on'); navBtns[navOn].removeAttribute('aria-current');
      navOn = hall;
      navBtns[navOn].classList.add('on'); navBtns[navOn].setAttribute('aria-current', 'true');
    }

    // надписи: гаснут, когда проходишь сквозь них
    for (const t of texts) {
      const d = camera.position.distanceTo(t.pos);
      const vis = cz > t.pos.z - 0.3 && d < viewDist + 8;
      t.mesh.visible = vis;
      if (t.mirror) t.mirror.visible = vis;
      if (vis) {
        const o = t.base * (t.fade ? sstep(1.0, 4.4, d) : 1);
        t.mat.opacity = o;
        if (t.mirrorMat) t.mirrorMat.opacity = o * 0.26;
      }
    }
    if (slots.visible) for (const g of slots.children) { const a = cz - g.userData.z; g.visible = a > -4 && a < viewDist; }

    // пыль в свете ближайшей картины
    const du = dustMat.uniforms;
    du.uTime.value = time;
    if (NSEG - pathPos < 0.75) { du.uLight.value.set(0, 2.3, Z_FINAL + 1.4); du.uLightK.value = 1; }
    else if (near) { du.uLight.value.copy(near.light); du.uLightK.value = near.lit.value; }
    else du.uLightK.value = 0;
  }

  // ── разрешение: если кадры идут тяжело — снижаем
  let warm = 0, acc = 0, cnt = 0;
  function adapt(dt) {
    if (warm < 60) { warm++; return; }
    if (dt <= 0 || dt > 0.09) return;
    acc += dt; cnt++;
    if (cnt < 45) return;
    const avg = acc / cnt;
    acc = 0; cnt = 0;
    if (avg > 0.03 && pr > 1) {
      pr = Math.max(1, pr - 0.25);
      sized = vw + 'x' + vh + '@' + pr;
      renderer.setPixelRatio(pr);
      renderer.setSize(vw, vh, false);
      dustMat.uniforms.uSize.value = 0.011 * (vh * pr) / (2 * Math.tan(camera.fov * RAD / 2));
    }
  }

  let last = performance.now();
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt > 0)) dt = 0;              // первый кадр может дать отрицательную разницу
    adapt(dt);
    if (dt > 0.1) dt = 0.1;
    update(dt);
    renderer.render(scene, camera);
    if (shaderBroken) G.goPlain('shader');
  }

  // ── события
  const onMove = e => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    mxT = clamp(e.clientX / Math.max(1, window.innerWidth) * 2 - 1, -1, 1);
    myT = clamp(e.clientY / Math.max(1, window.innerHeight) * 2 - 1, -1, 1);
  };
  const onResize = () => {
    if (!alive) return;
    layout();
    if (G.ready) { update(0); renderer.render(scene, camera); }   // сразу перерисовываем, чтобы не мигало
  };
  const onHide = () => { if (document.hidden) exhibits.forEach(ex => { if (ex.vWant) setVideo(ex, false); }); };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onHide);
  let ro = null;
  if (window.ResizeObserver) { ro = new ResizeObserver(onResize); ro.observe(E.stage); }

  G.stop = () => {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onHide);
    if (ro) ro.disconnect();
    exhibits.forEach(ex => { if (ex.video) { ex.video.pause(); ex.video.removeAttribute('src'); ex.video.load(); } });
    renderer.dispose();
  };

  G.dev = { camera, scene, SEQ, NSEG, cum, total, END, exhibits, texts, poseAt, finFrame, layout };   // для отладки

  // ── первый кадр сразу, без ожидания: так видно, что сцена поднялась
  layout();
  update(0);
  renderer.render(scene, camera);
  if (shaderBroken) { G.stop(); throw new Error('shader compile failed'); }
  G.ready = true;
  root.classList.add('ready');
  raf = requestAnimationFrame(frame);

  // надписи — после загрузки шрифтов (с запасом по времени, если шрифт не пришёл)
  const fontsUp = (document.fonts && document.fonts.load)
    ? Promise.all([
      document.fonts.load('600 64px Inter', 'Каждый сайт 700+'),
      document.fonts.load('italic 500 64px "Cormorant Garamond"', 'Зал 1'),
    ]).catch(() => {})
    : Promise.resolve();
  let fontsDone = false;
  fontsUp.then(() => { fontsDone = true; });
  Promise.race([fontsUp, new Promise(r => setTimeout(r, 2500))]).then(() => {
    if (!alive) return;
    textsReady = true;
    buildTexts();
    // шрифт пришёл позже — перерисуем надписи уже им
    if (!fontsDone) fontsUp.then(() => { if (alive) buildTexts(); });
  });
}
