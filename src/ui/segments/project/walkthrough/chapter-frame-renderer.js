/**
 * White frame/background adapted from the user-supplied FramePage_Export.
 * It owns only its canvas; existing chapter UI and media remain untouched.
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLElement} host
 * @param {{width: number, height: number, video: {x:number,y:number,w:number,h:number},
 * exclusions: {x:number,y:number,w:number,h:number}[], reduced?: boolean, onError?: (error:Error)=>void}} options
 */
export function createChapterFrameRenderer(
  canvas,
  host,
  { width, height, video, exclusions, reduced = false, onError = () => {} }
) {
  let visible = false;
  let disposed = false;
  let request = 0;
  canvas.width = width;
  canvas.height = height;
  // ---------- Config (tile values are the same as the index page) ----------
  const W = width,
    H = height;
  const R = 35; // hex circumradius (pointy-top)
  const GAP = 1.0;
  const SCALE_PER_H = 0.7;
  const PARALLAX = 0.6;
  const HOVER_RADIUS = 260,
    HOVER_BOOST = 0.9,
    EASE = 0.12;
  const SHINE_HMAX = 1.5,
    MOTION_GAIN = 40,
    MOTION_DECAY = 0.88;
  const SHINE_W = 0.28,
    SHINE_ALPHA = 0.56,
    FACE_STAGGER = 0.25,
    CUBE_STRENGTH = 1.0;
  const SHADOW_STRENGTH = 1.1;
  const REDRAW_EPS = 0.0005;

  // the video and its white frame (stage px)
  const VIDEO = video; // 16:9, like the video file
  const FRAME_PAD_X = 0,
    FRAME_PAD_Y = 32; // white frame around the video (left/right, top/bottom)
  const FRAME = {
    x: VIDEO.x - FRAME_PAD_X,
    y: VIDEO.y - FRAME_PAD_Y,
    w: VIDEO.w + 2 * FRAME_PAD_X,
    h: VIDEO.h + 2 * FRAME_PAD_Y,
  };
  const FRAME_H = 0.35; // height of the frame tiles ("raised a bit")

  // rough edge: tiles beyond the rectangle that are raised to the frame height too, in connected patches
  const ROUGH_MAX = 150; // px: the most the edge can bulge out (about 2.5 tiles)
  const ROUGH_LO = 0.6,
    ROUGH_SPAN = 0.3; // noise level where bulges start / how fast they grow (higher LO = fewer bulges)

  // the tiles around the frame (distance is measured from the rough edge, not from the rectangle)
  const FALL = 300; // px: base reach of the surrounding tiles before they are flat
  const REACH_MIN = 0.5,
    REACH_VAR = 1.2; // reach = FALL * (REACH_MIN + REACH_VAR * patchy noise)
  const FREE_BONUS = 0.9; // extra reach (x1 + bonus) in empty space far from any text, e.g. below the text on the left
  const FREE_DIST = 220; // px from the text where that bonus is fully on
  const OUT_MIN = 0.15,
    OUT_MAX = 0.9; // a raised tile next to the frame gets FRAME_H * (OUT_MIN..OUT_MAX)
  const OUT_CUT = 0.015; // lower than this: flat
  const SIZE_MIN = 0.5; // smallest random size of a surrounding tile (1 = full size)
  const SHADOW_MIN = 0.4,
    SHADOW_MAX = 1.4; // random shadow strength of a surrounding tile
  // page edges: tiles get lower and smaller towards them, so nothing is cut off harshly
  const EDGE_SIDE = 110,
    EDGE_TOP = 90;
  const RIGHT_X0 = VIDEO.x + VIDEO.w - R; // frame tiles start to taper here (the video nearly touches the right edge)
  const RIGHT_X1 = W + R * 0.5; // and are flat by here

  const smooth = (value) => {
    const f = Math.min(1, Math.max(0, value));
    return f * f * (3 - 2 * f);
  };
  function showError(message) {
    onError(new Error(message));
  }

  // smooth value noise, 0..1, stretched so it uses the whole range; new pattern on every load
  const SEED = Math.random() * 1000;
  function hash(i, j) {
    const s = Math.sin(i * 127.1 + j * 311.7 + SEED) * 43758.5453;
    return s - Math.floor(s);
  }
  function vnoise(x, y) {
    const i = Math.floor(x),
      j = Math.floor(y),
      fx = x - i,
      fy = y - j;
    const u = fx * fx * (3 - 2 * fx),
      v = fy * fy * (3 - 2 * fy);
    const a = hash(i, j),
      b = hash(i + 1, j),
      c = hash(i, j + 1),
      d = hash(i + 1, j + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function nz(x, y) {
    const n = 0.65 * vnoise(x, y) + 0.35 * vnoise(2 * x + 17, 2 * y + 9);
    return Math.min(1, Math.max(0, (n - 0.5) * 1.8 + 0.5));
  }

  // distance from a point to a rectangle {x, y, w, h} (0 inside)
  function rectDist(px, py, r) {
    const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
    const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
    return Math.hypot(dx, dy);
  }

  // ---------- WebGL ----------
  const YAW = Math.PI / 4;
  const E0 = Math.atan(1 / Math.SQRT2); // 35.264 deg: isometric view, hexagon "up"
  const K = R * GAP * Math.sqrt(3 / 8); // half the cube edge, so the iso outline has radius R

  const VERT = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uK;
uniform float uYaw;
uniform float uE;
uniform float uR;
in vec3 aPos;        // cube corner (-1..1) for faces; quad corner (x, y) for the shadow
in vec3 aNormal;     // face normal; (0,0,0) marks the shadow quad
in vec2 iCenter;     // on-screen tile center (px)
in float iScale;     // size factor 1 + 0.7 h
in float iH;         // tile height
in float iFade;
in vec2 iShine;      // x: height-shine position, y: height-shine strength
in float iShadow;    // shadow strength factor
in float iTurn;
out float vFaceShade;
out float vShK;
out vec2 vLocal;     // position from the tile center, resting-size px, y down
out float vShadow;   // 1 = shadow quad
out vec3 vInst;      // fade, h, scale
out vec2 vShine;

vec3 rotv(vec3 v) {
  float c = cos(uYaw);
  float s = sin(uYaw);
  float x1 = v.x * c + v.z * s;
  float z1 = -v.x * s + v.z * c;
  float elevation = uE + iTurn * (3.14159265 - 2.0 * uE);
  return vec3(x1, v.y * cos(elevation) - z1 * sin(elevation), v.y * sin(elevation) + z1 * cos(elevation));
}

void main() {
  vInst = vec3(iFade, iH, iScale);
  vShine = iShine;
  vShK = iShadow;
  vShadow = 0.0;
  vFaceShade = 1.0;
  vLocal = vec2(0.0);
  vec2 scr = iCenter;
  if (dot(aNormal, aNormal) < 0.5) {
    if (iH < 0.004 || iFade < 0.002) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    float sigma = (4.0 + iH * 28.0) * 0.5;
    float r = uR * iScale;
    vec2 off = vec2(-iH * 8.0, iH * 14.0);
    float hw = r + sigma * 3.2 + max(abs(off.x), abs(off.y)) + 2.0;
    vec2 lp = aPos.xy * hw;
    vLocal = lp;
    vShadow = 1.0;
    scr = iCenter + lp;
  } else {
    if (rotv(aNormal).z <= 0.000001 || iFade < 0.002) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    vec3 normal = normalize(rotv(aNormal));
    float light = max(0.0, dot(normal, normalize(vec3(-0.35, 0.75, 0.55))));
    vFaceShade = 1.0 - 0.22 * (1.0 - light) * sin(3.14159265 * iTurn);
    vec3 r = rotv(aPos * uK);
    vec2 cur = vec2(r.x, -r.y);
    vLocal = cur;
    scr = iCenter + cur * iScale;
  }
  gl_Position = vec4(scr.x / uRes.x * 2.0 - 1.0, 1.0 - scr.y / uRes.y * 2.0, 0.0, 1.0);
}`;

  const f4 = (value) => value.toFixed(5);
  const FRAG = `#version 300 es
precision highp float;
uniform float uR;
uniform float uShine;
in vec2 vLocal;
in float vShadow;
in vec3 vInst;
in vec2 vShine;
in float vShK;
in float vFaceShade;
out vec4 outColor;

const float PI = 3.14159265;
const float SHINE_W = ${f4(SHINE_W)};
const float SHINE_ALPHA = ${f4(SHINE_ALPHA)};
const float FACE_STAGGER = ${f4(FACE_STAGGER)};
const float SHADOW_STRENGTH = ${f4(SHADOW_STRENGTH)};

// signed distance to a pointy-top regular hexagon with circumradius r (negative inside)
float hexSdf(vec2 p, float r) {
  float d0 = abs(p.x);
  float d1 = abs(dot(p, vec2(0.5, 0.8660254)));
  float d2 = abs(dot(p, vec2(-0.5, 0.8660254)));
  return max(d0, max(d1, d2)) - r * 0.8660254;
}
float band(float u, float q) {
  float d = abs(u - q) / SHINE_W;
  return d < 1.0 ? 0.5 + 0.5 * cos(PI * d) : 0.0;
}

void main() {
  float fade = vInst.x;
  float h = vInst.y;
  float scale = vInst.z;

  if (vShadow > 0.5) {
    // soft shadow of the hexagon, offset down-left and blurrier the higher the tile is
    float sigma = (4.0 + h * 28.0) * 0.5;
    vec2 off = vec2(-h * 8.0, h * 14.0);
    float d = hexSdf(vLocal - off, uR * scale);
    float cov = 1.0 - smoothstep(-sigma * 1.6, sigma * 1.6, d);
    float a = min(0.28 * SHADOW_STRENGTH, h * 0.3 * SHADOW_STRENGTH) * cov * fade * vShK;
    outColor = vec4(vec3(70.0, 80.0, 100.0) / 255.0 * a, a);
    return;
  }

  vec3 col = vec3(vFaceShade);

  // shine while the tile moves up or down: the sweep goes left face, top face, right face
  if (uShine > 0.0 && vShine.y > 0.02) {
    vec2 gs = vec2(-0.9, 0.9) * uR;
    vec2 ge = vec2(0.9, -0.9) * uR;
    vec2 gd = ge - gs;
    float u = dot(vLocal - gs, gd) / dot(gd, gd);       // 0..1 along the bottom-left -> top-right diagonal
    float ang = atan(vLocal.y, vLocal.x);
    int fi = 0;                                          // left
    if (ang >= -PI / 6.0 && ang < PI / 2.0) fi = 2;      // right
    else if (ang >= -5.0 * PI / 6.0 && ang < -PI / 6.0) fi = 1;   // top
    float gain = fi == 0 ? 1.0 : (fi == 1 ? 0.7 : 0.45);
    float sf = (vShine.x - float(fi) * FACE_STAGGER) / (1.0 - 2.0 * FACE_STAGGER);
    if (sf > 0.0 && sf < 1.0) {
      float q = -SHINE_W + (1.0 + 2.0 * SHINE_W) * sf;
      float aH = gain * sqrt(max(0.0, sin(PI * sf))) * vShine.y * SHINE_ALPHA * uShine * band(u, q);
      col += (1.0 - col) * aH;
    }
  }

  // faint outline of the resting hexagon on raised tiles
  float dd = abs(hexSdf(vLocal, uR)) * scale;
  float ea = min(0.14, h * 0.12) * (1.0 - smoothstep(0.3, 1.0, dd));
  col = mix(col, vec3(120.0, 130.0, 150.0) / 255.0, ea);

  outColor = vec4(col * fade, fade);       // premultiplied alpha
}`;

  // ---- static geometry: 1 shadow quad + 6 cube faces, 6 vertices each (2 triangles) ----
  // the shadow quad goes FIRST, so a tile's shadow is painted before its own faces
  const geo = [];
  for (const q of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, -1],
    [1, 1],
    [-1, 1],
  ])
    geo.push(q[0], q[1], 0, 0, 0, 0);
  const AX = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let i = 0; i < 3; i++) {
    for (const sgn of [1, -1]) {
      const n = AX[i].map((v) => v * sgn);
      const u = AX[(i + 1) % 3],
        v = AX[(i + 2) % 3];
      const corner = (su, sv) => [0, 1, 2].map((k) => n[k] + su * u[k] + sv * v[k]);
      const c = [corner(1, 1), corner(-1, 1), corner(-1, -1), corner(1, -1)];
      for (const idx of [0, 1, 2, 0, 2, 3]) geo.push(...c[idx], ...n);
    }
  }
  const VERTS = geo.length / 6; // 42
  const SHADOW_VERTS = 6; // the first 6 vertices are the shadow quad

  // per-tile (instance) data
  const INST = [
    ['iCenter', 2],
    ['iScale', 1],
    ['iH', 1],
    ['iFade', 1],
    ['iShine', 2],
    ['iShadow', 1],
    ['iTurn', 1],
  ];
  const FLOATS = INST.reduce((s, a) => s + a[1], 0); // 8

  // one renderer per canvas: the same program, the tiles of each canvas drawn in instanced calls
  function makeRenderer(cv, opaque) {
    const gl = cv.getContext('webgl2', {
      antialias: true,
      alpha: !opaque,
      premultipliedAlpha: true,
    });
    if (!gl) {
      showError('WebGL2 is not available in this browser.');
      throw new Error('no webgl2');
    }
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        showError(
          (type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment') +
            ' shader error:\n' +
            gl.getShaderInfoLog(s)
        );
        throw new Error('shader compile failed');
      }
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      showError('Link error:\n' + gl.getProgramInfoLog(prog));
      throw new Error('link failed');
    }
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL program selection is not a React hook.
    gl.useProgram(prog);
    const uni = (n) => gl.getUniformLocation(prog, n);
    gl.uniform2f(uni('uRes'), W, H);
    gl.uniform1f(uni('uK'), K);
    gl.uniform1f(uni('uYaw'), YAW);
    gl.uniform1f(uni('uE'), E0);
    gl.uniform1f(uni('uR'), R * GAP);
    gl.uniform1f(uni('uShine'), CUBE_STRENGTH);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const attr = (n) => gl.getAttribLocation(prog, n);
    const geometryBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, geometryBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geo), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(attr('aPos'));
    gl.vertexAttribPointer(attr('aPos'), 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(attr('aNormal'));
    gl.vertexAttribPointer(attr('aNormal'), 3, gl.FLOAT, false, 24, 12);

    const instBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    const locs = INST.map(([name, size]) => {
      const l = attr(name);
      gl.enableVertexAttribArray(l);
      gl.vertexAttribDivisor(l, 1);
      return [l, size];
    });
    // point the instance attributes at instance number `first` (WebGL2 has no base-instance draw)
    const pointAt = (first) => {
      let o = 0;
      for (const [l, size] of locs) {
        gl.vertexAttribPointer(l, size, gl.FLOAT, false, FLOATS * 4, (first * FLOATS + o) * 4);
        o += size;
      }
    };

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // premultiplied alpha
    gl.viewport(0, 0, W, H);
    if (opaque) gl.clearColor(1, 1, 1, 1);
    else gl.clearColor(0, 0, 0, 0);

    // parts: [first instance, instance count, first vertex, vertex count]
    const draw = (data, count, parts) => {
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (!count) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
      gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, count * FLOATS), gl.DYNAMIC_DRAW);
      for (const [first, n, v0, nv] of parts) {
        if (!n) continue;
        pointAt(first);
        gl.drawArraysInstanced(gl.TRIANGLES, v0, nv, n);
      }
    };
    return {
      draw,
      dispose() {
        gl.deleteBuffer(geometryBuffer);
        gl.deleteBuffer(instBuf);
        gl.deleteVertexArray(vao);
        for (const shader of gl.getAttachedShaders(prog) || []) gl.deleteShader(shader);
        gl.deleteProgram(prog);
      },
    };
  }

  const rendering = makeRenderer(canvas, true);
  const drawBottom = rendering.draw;

  const textRects = () => exclusions;

  // ---------- tiles ----------
  const frameTiles = []; // raised, fixed
  const outTiles = []; // around the frame: random height, mouse lift, shine
  let instData = null;

  function build() {
    const colW = Math.sqrt(3) * R,
      rowH = 1.5 * R;
    const free = textRects();
    const s = 1 + FRAME_H * SCALE_PER_H;
    const par = 1 + FRAME_H * SCALE_PER_H * PARALLAX * 0.15;
    const blocked = (x, y) => free.some((t) => rectDist(x, y, t) < R);

    // all grid cells
    const cells = [];
    for (let r = -1; r * rowH < H + R * 2; r++) {
      for (let c = -1; c * colW < W + colW * 2; c++) {
        cells.push({ x: c * colW + (Math.abs(r) % 2 ? colW / 2 : 0), y: r * rowH });
      }
    }

    // 1) frame tiles: the ones the video or its white frame touches (their hexagon, as drawn at the frame height) ...
    const thr = R * s * 0.9;
    const isFrame = new Set();
    const hiddenBorder = new Set();
    const cand = [];
    for (const q of cells) {
      q.dRect = rectDist(W / 2 + (q.x - W / 2) * par, H / 2 + (q.y - H / 2) * par, FRAME);
      // Leave irregular holes through the visible rim, rather than showing every cell in a row.
      // Deep support tiles remain complete underneath the opaque video.
      const inset = Math.min(
        q.x - VIDEO.x,
        VIDEO.x + VIDEO.w - q.x,
        q.y - VIDEO.y,
        VIDEO.y + VIDEO.h - q.y
      );
      if (inset < R * 1.5 && q.dRect < thr + ROUGH_MAX) {
        const density = 0.35 + 0.45 * nz(q.x / 120 + 63, q.y / 120 + 19);
        const show = hash(Math.round(q.x / colW) + 137, Math.round(q.y / rowH) + 71) < density;
        if (!show) {
          hiddenBorder.add(q);
          continue;
        }
      }
      if (q.dRect < thr) isFrame.add(q);
      else if (q.dRect < thr + ROUGH_MAX) cand.push(q);
    }
    // ... plus a rough edge: patches (smooth noise + a bit of randomness) where it bulges outward by a few tiles.
    // Going from the inside out, a bulge tile only counts if it touches a tile that is already part of the frame.
    cand.sort((a, b) => a.dRect - b.dRect);
    const grown = [...isFrame];
    for (const q of cand) {
      const v = 0.7 * nz(q.x / 150, q.y / 150) + 0.3 * Math.random();
      const ext = ROUGH_MAX * Math.min(1, Math.max(0, (v - ROUGH_LO) / ROUGH_SPAN));
      if (q.dRect >= thr + ext || blocked(q.x, q.y)) continue;
      if (grown.some((g) => Math.hypot(g.x - q.x, g.y - q.y) < colW * 1.1)) {
        isFrame.add(q);
        grown.push(q);
      }
    }

    // page edge fade for the outer tiles: lower and smaller towards any edge of the page
    const edgeK = (x, y) =>
      smooth(x / EDGE_SIDE) *
      smooth((W - x) / EDGE_SIDE) *
      smooth(y / EDGE_TOP) *
      smooth((H - y) / EDGE_TOP);
    // the frame sits close to the right edge: its tiles taper off there instead
    const rightK = (x) => 1 - smooth((x - RIGHT_X0) / (RIGHT_X1 - RIGHT_X0));
    const sizeOf = (k) => 0.55 + 0.45 * k; // k = 1: full size, k = 0: just over half

    for (const q of grown) {
      const k = rightK(q.x);
      frameTiles.push({
        x: q.x,
        y: q.y,
        base: FRAME_H * k,
        h: FRAME_H * k,
        motion: 0,
        sz: sizeOf(k),
        sh: 1,
      });
    }
    frameTiles.sort((a, b) => a.h - b.h); // fixed stacking order: higher on top

    // 2) surrounding tiles: height, size and shadow are random; the fade follows the rough edge
    for (const q of cells) {
      if (isFrame.has(q) || hiddenBorder.has(q) || blocked(q.x, q.y)) continue;
      let minD = Infinity;
      for (const g of grown) {
        const dd = Math.hypot(g.x - q.x, g.y - q.y);
        if (dd < minD) minD = dd;
      }
      const d = Math.max(0, minD - colW); // 0 for a tile touching the frame
      // reach is patchy, and much longer in empty space away from the text (e.g. below the text on the left)
      let textD = Infinity;
      for (const t of free) textD = Math.min(textD, rectDist(q.x, q.y, t));
      const freeK = smooth(textD / FREE_DIST);
      const reach =
        FALL * (REACH_MIN + REACH_VAR * nz(q.x / 260 + 50, q.y / 260)) * (1 + FREE_BONUS * freeK);
      if (d >= reach) continue; // too far out: always flat, not kept
      const f = smooth(1 - d / reach); // 1 at the frame, 0 at the reach
      const k = edgeK(q.x, q.y) * rightK(q.x);
      // raised at random in patches: the further out, the less likely and the lower
      const dens = Math.min(1, 0.45 + 0.9 * nz(q.x / 120 + 200, q.y / 120 + 300));
      let base =
        Math.random() < Math.sqrt(f) * dens
          ? FRAME_H * f * k * (OUT_MIN + Math.random() * (OUT_MAX - OUT_MIN))
          : 0;
      if (base < OUT_CUT) base = 0;
      const sz = (1 - (1 - SIZE_MIN) * Math.random() ** 1.5 * (1 - 0.5 * f)) * sizeOf(k);
      const sh = SHADOW_MIN + Math.random() * (SHADOW_MAX - SHADOW_MIN);
      outTiles.push({
        x: q.x,
        y: q.y,
        base,
        h: base,
        prevH: base,
        motion: 0,
        zone: (0.3 + 0.7 * f) * k,
        cap: FRAME_H * k,
        sz,
        sh,
        lastH: -1,
        lastShine: false,
      });
    }
    outTiles.sort((a, b) => a.base - b.base); // fixed stacking order among the surrounding tiles
    instData = new Float32Array((frameTiles.length + outTiles.length) * FLOATS);
  }

  let interactiveTiles = [];

  // ---------- input ----------
  const mouse = { x: -9999, y: -9999 };
  const pointerMove = (event) => {
    if (!visible || reduced) return;
    const box = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - box.left) * W) / box.width;
    mouse.y = ((event.clientY - box.top) * H) / box.height;
    canvas.dataset.framePointer = `${Math.round(mouse.x)},${Math.round(mouse.y)}`;
    wake();
  };
  const pointerLeave = () => {
    mouse.x = mouse.y = -9999;
    wake();
  };
  host.addEventListener('pointermove', pointerMove, { passive: true });
  host.addEventListener('pointerleave', pointerLeave);
  let lastScrollFlip = -Infinity;
  const scrollFlip = () => {
    if (!visible || reduced) return;
    const now = performance.now();
    if (now - lastScrollFlip < 250) return;
    lastScrollFlip = now;
    const available = [...frameTiles, ...outTiles].filter(
      (tile) => tile.h > 0.015 && tile.flipAt === undefined && rectDist(tile.x, tile.y, VIDEO) > R
    );
    const count = Math.min(available.length, 4 + Math.floor(Math.random() * 4));
    for (let index = 0; index < count; index++) {
      const at = Math.floor(Math.random() * available.length);
      const [tile] = available.splice(at, 1);
      tile.flipAt = now + Math.random() * 160;
      tile.flipDuration = 650 + Math.random() * 350;
    }
    canvas.dataset.frameScrollFlips = String(Number(canvas.dataset.frameScrollFlips || 0) + count);
    wake();
  };
  host.addEventListener('scroll', scrollFlip, { passive: true });

  // ---------- frame loop ----------
  let forceDraw = true;

  function put(o, t) {
    const s = (1 + t.h * SCALE_PER_H) * t.sz;
    const par = 1 + t.h * SCALE_PER_H * PARALLAX * 0.15;
    instData[o] = W / 2 + (t.x - W / 2) * par;
    instData[o + 1] = H / 2 + (t.y - H / 2) * par;
    instData[o + 2] = s;
    instData[o + 3] = t.h;
    instData[o + 4] = Math.min(1, t.h / 0.08);
    instData[o + 5] = Math.min(1, Math.max(0, t.h / SHINE_HMAX));
    instData[o + 6] = t.motion;
    instData[o + 7] = t.sh;
    instData[o + 8] = t.turn || 0;
  }

  function frame() {
    let changed = false;
    const now = performance.now();
    for (const tile of [...frameTiles, ...outTiles]) {
      const previousTurn = tile.turn || 0;
      let turn = 0;
      if (tile.flipAt !== undefined) {
        const progress = (now - tile.flipAt) / tile.flipDuration;
        if (progress < 1) {
          const f = Math.max(0, progress);
          turn = f < 0.5 ? 4 * f * f * f : 1 - (-2 * f + 2) ** 3 / 2;
          changed = true;
        } else tile.flipAt = undefined;
      }
      tile.turn = turn;
      if (previousTurn !== turn) changed = true;
    }
    for (const t of interactiveTiles) {
      // mouse lift with radial falloff, weaker the further the tile is from the frame
      const d = Math.hypot(t.x - mouse.x, t.y - mouse.y);
      let f = 0;
      if (d < HOVER_RADIUS) {
        const k = 1 - d / HOVER_RADIUS;
        f = k * k * (3 - 2 * k);
      }
      // The original outer-tile lift, extended to the frame tiles so every visible tile responds.
      t.h += (Math.min(t.base + f * HOVER_BOOST * t.zone, t.cap) - t.h) * EASE;

      // height shine strength: jumps up with the speed, fades out once the tile stops
      const speed = Math.abs(t.h - t.prevH);
      t.prevH = t.h;
      const target = Math.min(1, Math.max(0, (speed - 0.001) * MOTION_GAIN));
      t.motion = target > t.motion ? target : t.motion * MOTION_DECAY;

      if (t.motion > 0.02 || t.lastShine || Math.abs(t.h - t.lastH) > REDRAW_EPS) changed = true;
    }
    if (!changed && !forceDraw) return false;
    forceDraw = false;

    // instance order never changes: [ surrounding tiles | frame tiles ], so the frame is always in front
    let n = 0;
    for (const t of outTiles) if (t.h >= 0.01) put(n++ * FLOATS, t);
    const nOut = n;
    for (const t of frameTiles) if (t.h >= 0.01) put(n++ * FLOATS, t);
    const nFrame = n - nOut;

    // the surrounding tiles first, then ALL frame shadows, then all frame faces
    // (so no frame tile throws a grey shadow onto its white neighbours)
    drawBottom(instData, n, [
      [0, nOut, 0, VERTS],
      [nOut, nFrame, 0, SHADOW_VERTS],
      [nOut, nFrame, SHADOW_VERTS, VERTS - SHADOW_VERTS],
    ]);

    for (const t of interactiveTiles) {
      t.lastH = t.h;
      t.lastShine = t.motion > 0.02;
    }
    return true;
  }

  function loop() {
    request = 0;
    if (disposed || !visible) return;
    const moving = frame();
    if (moving && !reduced) request = requestAnimationFrame(loop);
  }
  function wake() {
    if (!disposed && visible && !request) request = requestAnimationFrame(loop);
  }
  build();
  for (const tile of frameTiles) {
    tile.prevH = tile.h;
    tile.lastH = -1;
    tile.lastShine = false;
    tile.zone = 1;
    tile.cap = tile.base + 0.45;
  }
  interactiveTiles = [...outTiles, ...frameTiles];
  frame();
  return {
    setVisible(value) {
      visible = value;
      if (!visible) {
        cancelAnimationFrame(request);
        request = 0;
      } else wake();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(request);
      host.removeEventListener('pointermove', pointerMove);
      host.removeEventListener('pointerleave', pointerLeave);
      host.removeEventListener('scroll', scrollFlip);
      rendering.dispose();
    },
  };
}
