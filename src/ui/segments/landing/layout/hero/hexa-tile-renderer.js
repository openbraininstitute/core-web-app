/**
 * Visual renderer adapted from the user-supplied HexaTile_Export_V2.
 * Its UI, text, global layout, embedded scripts and font loaders are intentionally excluded.
 * Images and shine frames are local, decoded data assets; no external code is loaded.
 * Timeline as the supplied infoPage.html: the tiles open on picture `first`, then turn every FLIP_INTERVAL to another
 * picture in random order, every one once a round. `show(i)` turns them to picture i straight away, the same turn
 * (as a chapter picked on infoPage.html): the information pages share one renderer and call it as they open.
 * @param {HTMLCanvasElement} canvas
 * @param {{ onReady?: () => void, onError?: (error: Error) => void,
 *   pictures: ReadonlyArray<{ src: string, w?: number, full?: boolean }>, first?: number,
 *   onPicture?: (index: number) => void }} options
 *   `full`: a 1920 x 1080 composition, drawn over the whole stage; otherwise a picture `w` px wide round IMG_CX.
 *   `onPicture` hears of every picture turned to (to carry it over to the next page).
 */
export function createHexaTileRenderer(
  canvas,
  {
    onReady = () => {},
    onError = () => {},
    pictures,
    first = 0,
    onPicture = (/** @type {number} */ _index) => {},
  }
) {
  // ---------- Config (same values as the Canvas 2D page) ----------
  const W = 1920,
    H = 1080;
  let view = { width: W, height: H, x: 0, y: 0 };
  const R = 35; // hex circumradius (pointy-top)
  const GAP = 1.0;
  const HEIGHT_MEAN = 0.1;
  const NOISE_FLOOR_CUT = 0.08;
  const HEIGHT_SD = 0.4;
  const FLAT_LEFT = 640,
    FLAT_FADE = 200;
  const ZONE_CX = 1340,
    ZONE_CY = 520,
    ZONE_SX = 260,
    ZONE_SY = 220,
    ZONE_MIN = 0.12;
  // The supplied infoPage's low tile band extending left beneath the copy.
  const EXT = {
    cx: 760,
    cy: 790,
    sx: 330,
    sy: 150,
    strength: 0.75,
    left: 313,
    leftFade: 180,
    top: 610,
    bottom: 990,
    edgeFade: 70,
  };
  const smooth = (value) => {
    const f = Math.min(1, Math.max(0, value));
    return f * f * (3 - 2 * f);
  };
  const SCALE_PER_H = 0.7;
  const PARALLAX = 0.6;
  const HOVER_RADIUS = 260,
    HOVER_BOOST = 0.9,
    EASE = 0.12;
  const IMG_WHITE = 240,
    IMG_HITS = 3;
  const IMG_MIN_LO = 0.08,
    IMG_MIN_HI = 0.3,
    IMG_MAX_H = 0.45;
  const IMG_CX = 1340,
    IMG_CY = 520;
  const FLIP_INTERVAL = 10000,
    FLIP_DUR = 600,
    FLIP_SPREAD = 600;
  const SHINE_HMAX = 1.5,
    MOTION_GAIN = 40,
    MOTION_DECAY = 0.88;
  const SHINE_W = 0.28,
    SHINE_ALPHA = 0.56,
    FACE_STAGGER = 0.25,
    CUBE_STRENGTH = 1.0;
  const MID_FLASH = 0.85,
    MID_FLASH_WIDTH = 0.2;
  const SHADOW_STRENGTH = 1.1;
  const REDRAW_EPS = 0.0005;

  // Shine sequence overlay (ShineSequence/*.png, embedded in shine_seq.js).
  // After every picture swap has finished, it plays ONCE on each picture tile, as a wave from left to right.
  const SEQ_FRAMES = 20; // 20
  const SEQ_FPS = 30; // playback speed of the frames
  const SEQ_GAP = 200; // ms after the last tile finished turning before the wave starts
  const SEQ_WAVE = 1400; // ms for the wave to travel from the leftmost to the rightmost tile
  const SEQ_STRENGTH = 1.0; // 0..1+, overall brightness of the overlay
  const SEQ_PASSES = 1; // how many times the wave runs after each picture change
  const SEQ_PASS_GAP = 300; // ms between one pass finishing (rightmost tile done) and the next starting
  // time from one pass start to the next: the whole wave plus one full playback, plus the gap
  const SEQ_PASS_EVERY = SEQ_WAVE + (SEQ_FRAMES * 1000) / SEQ_FPS + SEQ_PASS_GAP;
  const SEQ_MODES = ['Screen', 'Add', 'Off'];

  // pictures, each loaded once; the page and the turns point at them by index
  const layers = pictures.map((l) => {
    const img = new Image();
    img.src = l.src;
    return { ...l, initialWidth: l.w ?? 1300, img, h: 0, x: 0, y: 0, tex: null };
  });

  // test switches (buttons at the bottom left; keys in brackets)
  // chosen settings (the test buttons are gone)
  const skipIdle = true; // skip frames when nothing changes
  const shineOn = true; // shine sweep
  const midFlashOn = true; // mid-turn white flash
  const faceShadingOn = false; // cube face shading while turning
  const seqMode = 0; // shine sequence blend: index into SEQ_MODES (0 = Screen)

  const turnEase = (f) => (f < 0.5 ? 4 * f * f * f : 1 - (-2 * f + 2) ** 3 / 2); // slow start, fast middle, slow end
  function gauss() {
    const u = 1 - Math.random(),
      v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function showError(message) {
    onError(new Error(message));
  }

  // ---------- WebGL setup ----------
  const gl = canvas.getContext('webgl2', {
    antialias: true,
    alpha: false,
    premultipliedAlpha: false,
  });
  if (!gl) {
    showError('WebGL2 is not available in this browser.');
    throw new Error('no webgl2');
  }

  const YAW = Math.PI / 4;
  const E0 = Math.atan(1 / Math.SQRT2); // 35.264 deg: isometric view, hexagon "up"
  const E1 = Math.PI - E0; // 144.736 deg: the same hexagon after the turn, "down"
  const K = R * GAP * Math.sqrt(3 / 8); // half the cube edge, so the iso outline has radius R

  const f4 = (v) => v.toFixed(5);

  const VERT = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec2 uOffset;
uniform float uK;
uniform float uYaw;
uniform float uE0;
uniform float uE1;
uniform float uR;
in vec3 aPos;        // cube corner (-1..1) for faces; quad corner (x, y) for the shadow
in vec3 aNormal;     // face normal; (0,0,0) marks the shadow quad
in vec2 iCenter;     // on-screen tile center (px)
in vec2 iRest;       // resting tile center (px): where the picture under the tile is
in float iScale;     // size factor 1 + 0.7 h
in float iH;         // tile height
in float iP;         // cube pitch progress 0..1
in vec2 iLayers;     // picture used in view 0 / view 1
in float iFade;
in vec2 iShine;      // x: height-shine position, y: height-shine strength
in float iSeq;       // shine sequence frame (fractional), < 0 = not playing
out float vSeq;
out vec2 vLocal;     // position from the tile center, resting-size px, y down
out vec2 vRef0;
out vec2 vRef1;
out vec3 vNv;
out vec3 vFlags;     // x: face seen in view 0, y: seen in view 1, z: 1 = shadow quad
out vec2 vRest;
out vec2 vLayers;
out vec3 vInst;      // p, fade, h
out vec2 vShine;
out float vScale;

vec3 rotv(vec3 v, float e) {
  float c = cos(uYaw);
  float s = sin(uYaw);
  float x1 = v.x * c + v.z * s;
  float z1 = -v.x * s + v.z * c;
  float y1 = v.y;
  return vec3(x1, y1 * cos(e) - z1 * sin(e), y1 * sin(e) + z1 * cos(e));
}
vec2 toScr(vec3 v, float e) {
  vec3 r = rotv(v, e);
  return vec2(r.x, -r.y);
}

void main() {
  vRest = iRest;
  vLayers = iLayers;
  vInst = vec3(iP, iFade, iH);
  vShine = iShine;
  vSeq = iSeq;
  vScale = iScale;
  vLocal = vec2(0.0);
  vRef0 = vec2(0.0);
  vRef1 = vec2(0.0);
  vNv = vec3(0.0, 0.0, 1.0);
  vFlags = vec3(0.0);
  vec2 scr = iCenter;
  bool isShadow = dot(aNormal, aNormal) < 0.5;
  if (isShadow) {
    if (iH < 0.004 || iFade < 0.002) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    float sigma = (4.0 + iH * 28.0) * 0.5;
    float r = uR * iScale;
    vec2 off = vec2(-iH * 8.0, iH * 14.0);
    float hw = r + sigma * 3.2 + max(abs(off.x), abs(off.y)) + 2.0;
    vec2 lp = aPos.xy * hw;
    vLocal = lp;
    vFlags = vec3(0.0, 0.0, 1.0);
    scr = iCenter + lp;
  } else {
    float e = uE0 + iP * (uE1 - uE0);
    vec3 nv = rotv(aNormal, e);
    if (nv.z <= 0.000001 || iFade < 0.002) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    vec3 c = aPos * uK;
    vec2 cur = toScr(c, e);
    vNv = nv;
    vLocal = cur;
    vRef0 = toScr(c, uE0);
    vRef1 = toScr(c, uE1);
    vFlags = vec3(rotv(aNormal, uE0).z > 0.000001 ? 1.0 : 0.0, rotv(aNormal, uE1).z > 0.000001 ? 1.0 : 0.0, 0.0);
    scr = iCenter + cur * iScale;
  }
  gl_Position = vec4((scr.x + uOffset.x) / uRes.x * 2.0 - 1.0, 1.0 - (scr.y + uOffset.y) / uRes.y * 2.0, 0.0, 1.0);
}`;

  const FRAG = `#version 300 es
precision highp float;
precision highp sampler2DArray;
uniform sampler2DArray uSeq;  // shine sequence frames, one layer per frame
uniform vec2 uSeqFx;          // x: 0 off, 1 screen, 2 add; y: strength
uniform sampler2D uTex0;
uniform sampler2D uTex1;
uniform sampler2D uTex2;
uniform vec4 uRect0;
uniform vec4 uRect1;
uniform vec4 uRect2;
uniform vec3 uLight;
uniform vec4 uFx;     // x: shine strength (0 = off), y: mid-turn flash strength, z: face shading on
uniform float uR;
in vec2 vLocal;
in vec2 vRef0;
in vec2 vRef1;
in vec3 vNv;
in vec3 vFlags;
in vec2 vRest;
in vec2 vLayers;
in vec3 vInst;
in vec2 vShine;
in float vSeq;
in float vScale;
out vec4 outColor;

const float PI = 3.14159265;
const float SHINE_W = ${f4(SHINE_W)};
const float SHINE_ALPHA = ${f4(SHINE_ALPHA)};
const float FACE_STAGGER = ${f4(FACE_STAGGER)};
const float SHADOW_STRENGTH = ${f4(SHADOW_STRENGTH)};
const float MID_FLASH_WIDTH = ${f4(MID_FLASH_WIDTH)};

// color of picture L at canvas position pos (white outside the picture)
vec3 pic(int L, vec2 pos) {
  vec4 rect = L == 0 ? uRect0 : (L == 1 ? uRect1 : uRect2);
  vec2 uv = (pos - rect.xy) / rect.zw;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec3(1.0);
  vec4 t = L == 0 ? textureLod(uTex0, uv, 0.0) : (L == 1 ? textureLod(uTex1, uv, 0.0) : textureLod(uTex2, uv, 0.0));
  return t.rgb * t.a + (1.0 - t.a);
}
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
  float p = vInst.x;
  float fade = vInst.y;
  float h = vInst.z;

  if (vFlags.z > 0.5) {
    // soft shadow of the hexagon, offset down-left and blurrier the higher the tile is
    float sigma = (4.0 + h * 28.0) * 0.5;
    vec2 off = vec2(-h * 8.0, h * 14.0);
    float d = hexSdf(vLocal - off, uR * vScale);
    float cov = 1.0 - smoothstep(-sigma * 1.6, sigma * 1.6, d);
    float a = min(0.28 * SHADOW_STRENGTH, h * 0.3 * SHADOW_STRENGTH) * cov * fade;
    outColor = vec4(vec3(70.0, 80.0, 100.0) / 255.0 * a, a);
    return;
  }

  bool has0 = vFlags.x > 0.5;
  bool has1 = vFlags.y > 0.5;
  vec3 col = vec3(1.0);

  // pictures: view 0 / view 1 of the cube. A face seen in both views (the old top) cross-fades.
  float w = clamp((p - 0.38) / 0.24, 0.0, 1.0);
  w = w * w * (3.0 - 2.0 * w);
  if (has0) col = pic(int(vLayers.x + 0.5), vRest + vRef0);
  if (has1) col = mix(col, pic(int(vLayers.y + 0.5), vRest + vRef1), has0 ? w : 1.0);

  // max(0, ...): at p = 1 the float PI is a hair above pi, so sin() comes out as a tiny NEGATIVE
  // number, and sqrt() of that below is NaN, which paints the whole tile black
  float turnAmt = max(0.0, sin(PI * clamp(p, 0.0, 1.0)));
  float lit = max(0.0, dot(normalize(vNv), uLight));

  // mid-turn flash: the face seen before and after goes almost white when it faces us
  if (has0 && has1 && uFx.y > 0.0) {
    float d = abs(p - 0.5) / MID_FLASH_WIDTH;
    if (d < 1.0) col = mix(col, vec3(1.0), uFx.y * (0.5 + 0.5 * cos(PI * d)));
  }
  // optional face shading (only while turning)
  if (uFx.z > 0.5) col = mix(col, vec3(30.0, 45.0, 80.0) / 255.0, (1.0 - lit) * 0.28 * turnAmt);

  // shine
  if (uFx.x > 0.0) {
    vec2 gs = vec2(-0.9, 0.9) * uR;
    vec2 ge = vec2(0.9, -0.9) * uR;
    vec2 gd = ge - gs;
    float u = dot(vLocal - gs, gd) / dot(gd, gd);       // 0..1 along the bottom-left -> top-right diagonal

    // (1) while the cube turns: one band sweeps across, lit faces catch it more
    float aT = sqrt(turnAmt) * SHINE_ALPHA * uFx.x * (0.45 + 0.55 * lit) * band(u, -SHINE_W + (1.0 + 2.0 * SHINE_W) * p);
    col += (1.0 - col) * aT;

    // (2) while the tile moves up or down: the sweep goes left face, top face, right face
    if (vShine.y > 0.02) {
      float ang = atan(vLocal.y, vLocal.x);
      int fi = 0;                                        // left
      if (ang >= -PI / 6.0 && ang < PI / 2.0) fi = 2;    // right
      else if (ang >= -5.0 * PI / 6.0 && ang < -PI / 6.0) fi = 1;   // top
      float gain = fi == 0 ? 1.0 : (fi == 1 ? 0.7 : 0.45);
      float sf = (vShine.x - float(fi) * FACE_STAGGER) / (1.0 - 2.0 * FACE_STAGGER);
      if (sf > 0.0 && sf < 1.0) {
        float q = -SHINE_W + (1.0 + 2.0 * SHINE_W) * sf;
        float aH = gain * sqrt(max(0.0, sin(PI * sf))) * vShine.y * SHINE_ALPHA * uFx.x * band(u, q);
        col += (1.0 - col) * aH;
      }
    }
  }

  // shine sequence overlay: the frame is a pointy-top hexagon filling the picture width,
  // drawn in the cube's "down" pose, so it is mirrored vertically while the cube rests "up"
  if (vSeq >= 0.0 && uSeqFx.x > 0.5) {
    float sw = 1.7320508 * uR;                          // hexagon width (flat side to flat side)
    vec2 uv = vec2(0.5 + vLocal.x / sw, 0.5 + vLocal.y / (sw * ${f4(531 / 452)}));
    if (p < 0.5) uv.y = 1.0 - uv.y;
    uv = clamp(uv, 0.0, 1.0);
    float f0 = floor(vSeq);
    float f1 = min(f0 + 1.0, ${(SEQ_FRAMES - 1).toFixed(1)});
    vec4 s = mix(texture(uSeq, vec3(uv, f0)), texture(uSeq, vec3(uv, f1)), vSeq - f0);
    vec3 light = s.rgb * s.a * uSeqFx.y;               // light on black: alpha weights it
    if (uSeqFx.x < 1.5) col = 1.0 - (1.0 - col) * (1.0 - clamp(light, 0.0, 1.0));   // screen
    else col = min(col + light, vec3(1.0));                                            // add
  }

  // faint outline of the resting hexagon on raised tiles
  if (p < 0.0001 || p > 0.9999) {
    float dd = abs(hexSdf(vLocal, uR)) * vScale;
    float ea = min(0.14, h * 0.12) * (1.0 - smoothstep(0.3, 1.0, dd));
    col = mix(col, vec3(120.0, 130.0, 150.0) / 255.0, ea);
  }

  outColor = vec4(col * fade, fade);       // premultiplied alpha
}`;

  function compile(type, src) {
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
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    showError(`Link error:\n${gl.getProgramInfoLog(prog)}`);
    throw new Error('link failed');
  }
  // biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram is not a React hook.
  gl.useProgram(prog);

  const U = {};
  for (const name of [
    'uRes',
    'uOffset',
    'uK',
    'uYaw',
    'uE0',
    'uE1',
    'uR',
    'uTex0',
    'uTex1',
    'uTex2',
    'uRect0',
    'uRect1',
    'uRect2',
    'uLight',
    'uFx',
    'uSeq',
    'uSeqFx',
  ]) {
    U[name] = gl.getUniformLocation(prog, name);
  }

  // ---- static geometry: 6 cube faces + 1 shadow quad, 6 vertices each (2 triangles) ----
  const AX = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const geo = [];
  // the shadow quad goes FIRST, so a tile's shadow is painted before its own faces
  // (otherwise it darkened the tile it belongs to, which showed as grey on white cubes)
  const quad = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, -1],
    [1, 1],
    [-1, 1],
  ];
  for (const q of quad) geo.push(q[0], q[1], 0, 0, 0, 0); // shadow quad: normal (0,0,0)
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

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const geoBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, geoBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geo), gl.STATIC_DRAW);
  const attr = (n) => gl.getAttribLocation(prog, n);
  gl.enableVertexAttribArray(attr('aPos'));
  gl.vertexAttribPointer(attr('aPos'), 3, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(attr('aNormal'));
  gl.vertexAttribPointer(attr('aNormal'), 3, gl.FLOAT, false, 24, 12);

  // ---- per-tile (instance) data: 13 floats ----
  const FLOATS = 13;
  const instBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
  const inst = [
    ['iCenter', 2],
    ['iRest', 2],
    ['iScale', 1],
    ['iH', 1],
    ['iP', 1],
    ['iLayers', 2],
    ['iFade', 1],
    ['iShine', 2],
    ['iSeq', 1],
  ];
  let off = 0;
  for (const [name, size] of inst) {
    const loc = attr(name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, FLOATS * 4, off * 4);
    gl.vertexAttribDivisor(loc, 1);
    off += size;
  }

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // premultiplied alpha
  gl.viewport(0, 0, W, H);

  function makeTexture(img) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  // all shine sequence frames in one texture array (one layer per frame)
  const seqImgs = Array.from({ length: SEQ_FRAMES }, (_, i) => {
    const img = new Image();
    img.src = `/static/hexa-tiles/shine-${String(i).padStart(2, '0')}.png`;
    return img;
  });
  let seqTex = null;
  function makeSeqTexture() {
    const w = seqImgs[0].naturalWidth,
      h = seqImgs[0].naturalHeight;
    seqTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, seqTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage3D(
      gl.TEXTURE_2D_ARRAY,
      0,
      gl.RGBA8,
      w,
      h,
      SEQ_FRAMES,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    seqImgs.forEach((img, i) => {
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, w, h, 1, gl.RGBA, gl.UNSIGNED_BYTE, img);
    });
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY); // frames are shrunk a lot on screen: mipmaps keep them smooth
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  // ---------- tiles (same simulation as the Canvas 2D page) ----------
  const tiles = [];
  const colW = Math.sqrt(3) * R,
    rowH = 1.5 * R;
  let instData = null;

  // which tiles sit over non-white picture pixels (read with a hidden 2D canvas)
  function buildImageMap(l, need0 = IMG_HITS) {
    const off = document.createElement('canvas');
    off.width = view.width;
    off.height = view.height;
    const octx = off.getContext('2d', { willReadFrequently: true });
    octx.fillStyle = '#fff';
    octx.fillRect(0, 0, view.width, view.height);
    octx.drawImage(l.img, l.x + view.x, l.y + view.y, l.w, l.h);
    const data = octx.getImageData(0, 0, view.width, view.height).data;
    return (cx, cy, need = need0) => {
      let hits = 0;
      for (let oy = -R; oy <= R; oy += 3) {
        for (let ox = -R; ox <= R; ox += 3) {
          if (Math.abs(ox) > R * 0.866 || Math.abs(oy) * 0.866 + Math.abs(ox) * 0.5 > R * 0.866)
            continue;
          const px = Math.round(cx + ox + view.x),
            py = Math.round(cy + oy + view.y);
          if (px < 0 || py < 0 || px >= view.width || py >= view.height) continue;
          const i = (py * view.width + px) * 4;
          if (Math.min(data[i], data[i + 1], data[i + 2]) < IMG_WHITE) hits++;
        }
      }
      return hits >= need;
    };
  }

  function build() {
    tiles.length = 0;
    for (const l of layers) {
      if (l.full) {
        // a composition made for the stage: its subject already where the pictures go
        l.w = W;
        l.h = H;
        l.x = 0;
        l.y = 0;
      } else {
        l.w = Math.min(l.initialWidth, Math.max(320, 2 * (view.width - view.x - IMG_CX - R * 3)));
        l.h = (l.w * l.img.naturalHeight) / l.img.naturalWidth;
        l.x = IMG_CX - l.w / 2;
        l.y = IMG_CY - l.h / 2;
      }
      if (l.tex) gl.deleteTexture(l.tex);
      l.tex = makeTexture(l.img);
    }
    const hasColor = layers.map((l) => buildImageMap(l));

    for (let r = Math.floor(-view.y / rowH) - 1; r * rowH < view.height - view.y + R * 2; r++) {
      for (let c = Math.floor(-view.x / colW) - 1; c * colW < view.width - view.x + colW * 2; c++) {
        const x = c * colW + (Math.abs(r) % 2 ? colW / 2 : 0);
        const y = r * rowH;
        const dx = (x - ZONE_CX) / ZONE_SX,
          dy = (y - ZONE_CY) / ZONE_SY;
        let mask = Math.exp(-(dx * dx + dy * dy) / 2);
        const k = Math.min(1, Math.max(0, (x - FLAT_LEFT) / FLAT_FADE));
        mask *= k * k * (3 - 2 * k);
        const ex = (x - EXT.cx) / EXT.sx,
          ey = (y - EXT.cy) / EXT.sy;
        let ext = Math.exp(-(ex * ex + ey * ey) / 2);
        ext *=
          smooth((x - EXT.left) / EXT.leftFade) *
          smooth((y - EXT.top) / EXT.edgeFade) *
          smooth((EXT.bottom - y) / EXT.edgeFade);
        mask = Math.max(mask, ext * EXT.strength);
        const edgeFactor =
          smooth((view.width - view.x - x - R * 2) / 160) *
          smooth((view.height - view.y - y - R * 2) / 120) *
          smooth((x + view.x - R * 2) / 120) *
          smooth((y + view.y - R * 2) / 100);
        let base = mask > ZONE_MIN ? Math.max(0, HEIGHT_MEAN + gauss() * HEIGHT_SD) * mask : 0;
        base *= edgeFactor;
        const artwork = hasColor.map((hasPixels) => hasPixels(x, y));
        const onImage = artwork.some(Boolean);
        if (!onImage && base < NOISE_FLOOR_CUT) base = 0;
        if (onImage && base < IMG_MIN_LO)
          base = IMG_MIN_LO + Math.random() * (IMG_MIN_HI - IMG_MIN_LO);
        if (onImage && base > IMG_MAX_H) base = IMG_MAX_H;
        if (base <= 0 && !onImage) continue; // flat, no picture: can never change, so not kept
        tiles.push({
          x,
          y,
          base,
          edgeFactor,
          h: artwork[cur] ? 0 : base,
          prevH: artwork[cur] ? 0 : base,
          motion: 0,
          lastH: -1,
          lastE: 0,
          lastShine: false,
          active: base > 0.03,
          delay: Math.random() * FLIP_SPREAD,
          flips: onImage,
          artwork,
          e: 0,
          busy: false,
        });
      }
    }
    // shine sequence wave: each picture tile starts later the further right it is
    const fx = tiles.filter((t) => t.flips).map((t) => t.x);
    const minX = Math.min(...fx),
      maxX = Math.max(...fx);
    for (const t of tiles) {
      t.seq = -1;
      t.lastSeq = -1;
      t.seqStart =
        FLIP_SPREAD +
        FLIP_DUR +
        SEQ_GAP +
        (maxX > minX ? (t.x - minX) / (maxX - minX) : 0) * SEQ_WAVE;
    }
    if (seqTex) gl.deleteTexture(seqTex);
    makeSeqTexture();
    tiles.sort((a, b) => a.base - b.base); // fixed stacking order, never changes
    instData = new Float32Array(tiles.length * FLOATS);
  }

  // ---------- input and layout ----------
  const mouse = { x: -9999, y: -9999 };
  function onMouseMove(event) {
    if (reduced) return;
    const box = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - box.left) * W) / box.width;
    mouse.y = ((event.clientY - box.top) * H) / box.height;
  }
  function onMouseLeave() {
    mouse.x = mouse.y = -9999;
  }
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseleave', onMouseLeave);

  let forceDraw = true;

  // ---------- which picture is shown, and the turn from one to the next (as infoPage.html) ----------
  const N = layers.length;
  let cur = first; // picture shown now
  let parity = 0; // pose the tiles rest in: 0 = hexagon "up", 1 = "down"; it flips with every turn
  let trans = null; // turn in progress: { to, start }
  let pending = -1; // picture asked for during a turn: turned to as soon as that one is done
  let nextAuto = FLIP_INTERVAL; // when the next automatic turn starts
  let lastTurnStart = -Infinity; // the shine sequence is timed from here
  let queue = []; // random order of the coming automatic turns
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  function nextRandom() {
    const here = trans ? trans.to : cur;
    for (let k = 0; k < 2; k++) {
      if (!queue.length) queue = shuffle(layers.map((_, i) => i));
      const i = queue.shift();
      if (i !== here) return i;
    }
    return (here + 1) % N;
  }
  function startTurn(i, now) {
    trans = { to: i, start: now };
    lastTurnStart = now;
    nextAuto = now + FLIP_INTERVAL; // the new picture then stays a full interval
    canvas.dataset.picture = String(i);
    onPicture(i);
    forceDraw = true;
  }
  canvas.dataset.picture = String(cur);

  function frame() {
    const now = elapsed;
    let changed = false;

    // timeline: finish the turn in progress (all tiles are done after FLIP_SPREAD + FLIP_DUR), then a picture asked
    // for during it, if any, otherwise the next random one when its time comes
    if (trans && now - trans.start >= FLIP_SPREAD + FLIP_DUR) {
      cur = trans.to;
      parity = 1 - parity;
      trans = null;
      if (pending >= 0) {
        const i = pending;
        pending = -1;
        if (i !== cur) startTurn(i, now);
      }
    }
    if (!reduced && !trans && now >= nextAuto) startTurn(nextRandom(), now);

    for (const t of tiles) {
      const flatArtwork = t.artwork[cur] || (trans && t.artwork[trans.to]);
      const distance = Math.hypot(t.x - mouse.x, t.y - mouse.y);
      const proximity = !reduced && distance < HOVER_RADIUS ? 1 - distance / HOVER_RADIUS : 0;
      const hover = flatArtwork || t.active ? proximity * proximity * (3 - 2 * proximity) : 0;
      // this tile's part of the turn: t.e = 0 before it starts, eased 0..1 while it turns, 1 when done
      let e = 0,
        turning = false;
      if (trans && t.flips) {
        const v = (now - trans.start - t.delay) / FLIP_DUR;
        if (v >= 1) e = 1;
        else if (v > 0) {
          e = turnEase(v);
          turning = true;
        }
      }
      t.e = e;
      t.busy = turning;

      // shine sequence: measured from the start of the latest turn (same for all tiles), so it begins only once
      // every tile has finished turning; a new turn cuts it off
      t.seq = -1;
      if (!flatArtwork && t.flips && SEQ_MODES[seqMode] !== 'Off' && !trans) {
        const local = now - lastTurnStart - t.seqStart;
        for (let k = 0; k < SEQ_PASSES; k++) {
          const f = ((local - k * SEQ_PASS_EVERY) * SEQ_FPS) / 1000;
          if (f >= 0 && f < SEQ_FRAMES) {
            t.seq = Math.min(f, SEQ_FRAMES - 1);
            break;
          }
        }
      }

      // Artwork rests at zero height, rising only around the pointer. White tiles keep their layered base.
      if (!turning) {
        const restingHeight = flatArtwork ? 0 : t.base;
        t.h += (restingHeight + hover * HOVER_BOOST * t.edgeFactor - t.h) * EASE;
        if (flatArtwork && hover === 0 && t.h < 0.0001) t.h = 0;
      }
      // The exported shining-cube frames play locally on hover instead of running over the idle image.
      if (flatArtwork && hover > 0.01 && !trans) {
        if (!t.hovered || t.hoverStarted === undefined) t.hoverStarted = now;
        const frame = (((now - t.hoverStarted) * SEQ_FPS) / 1000) % (SEQ_FRAMES + SEQ_FPS);
        t.seq = frame < SEQ_FRAMES ? frame : -1;
      }
      t.hovered = hover > 0.01;

      // height shine strength: jumps up with the speed, fades out once the tile stops
      const speed = Math.abs(t.h - t.prevH);
      t.prevH = t.h;
      if (shineOn) {
        const target = Math.min(1, Math.max(0, (speed - 0.001) * MOTION_GAIN));
        t.motion = target > t.motion ? target : t.motion * MOTION_DECAY;
      } else t.motion = 0;

      if (
        t.busy ||
        t.seq >= 0 ||
        t.lastSeq >= 0 ||
        t.motion > 0.02 ||
        t.lastShine ||
        t.e !== t.lastE ||
        Math.abs(t.h - t.lastH) > REDRAW_EPS
      )
        changed = true;
    }

    if (skipIdle && !changed && !forceDraw) return;
    forceDraw = false;

    // fill the instance buffer with the visible tiles
    const cx = W / 2,
      cy = H / 2;
    let count = 0;
    for (const t of tiles) {
      const flatArtwork = t.artwork[cur] || (trans && t.artwork[trans.to]);
      if (!flatArtwork && t.h < 0.01 && !t.busy) continue; // flat tiles are the floor itself: not drawn
      const s = 1 + t.h * SCALE_PER_H;
      const par = 1 + t.h * SCALE_PER_H * PARALLAX * 0.15;
      let fe = t.e;
      if (fe < 1e-4) fe = 0;
      // view 0 / view 1 of the cube: the two pictures of this moment, in texture slots 0 and 1
      const p = parity === 0 ? fe : 1 - fe,
        L0 = 0,
        L1 = 1;
      const o = count * FLOATS;
      instData[o] = cx + (t.x - cx) * par;
      instData[o + 1] = cy + (t.y - cy) * par;
      instData[o + 2] = t.x;
      instData[o + 3] = t.y;
      instData[o + 4] = s;
      instData[o + 5] = t.h;
      instData[o + 6] = p;
      instData[o + 7] = L0;
      instData[o + 8] = L1;
      instData[o + 9] = flatArtwork || t.busy ? 1 : Math.min(1, t.h / 0.08);
      instData[o + 10] = Math.min(1, Math.max(0, t.h / SHINE_HMAX));
      instData[o + 11] = t.motion;
      instData[o + 12] = t.seq;
      count++;
    }

    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram is not a React hook.
    gl.useProgram(prog);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    gl.bufferData(gl.ARRAY_BUFFER, instData.subarray(0, count * FLOATS), gl.DYNAMIC_DRAW);

    gl.uniform2f(U.uRes, view.width, view.height);
    gl.uniform2f(U.uOffset, view.x, view.y);
    gl.uniform1f(U.uK, K);
    gl.uniform1f(U.uYaw, YAW);
    gl.uniform1f(U.uE0, E0);
    gl.uniform1f(U.uE1, E1);
    gl.uniform1f(U.uR, R * GAP);
    gl.uniform3f(
      U.uLight,
      ...(() => {
        const l = [-0.35, 0.75, 0.55],
          m = Math.hypot(...l);
        return l.map((v) => v / m);
      })()
    );
    gl.uniform4f(
      U.uFx,
      shineOn ? CUBE_STRENGTH : 0,
      midFlashOn ? MID_FLASH : 0,
      faceShadingOn ? 1 : 0,
      0
    );
    // the two pictures of this moment (no turn going on: both the one shown); slot 2 unused
    const to = trans ? trans.to : cur;
    const views = parity === 0 ? [cur, to, to] : [to, cur, cur];
    views.forEach((index, i) => {
      const l = layers[index];
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, l.tex);
      gl.uniform1i(U[`uTex${i}`], i);
      gl.uniform4f(U[`uRect${i}`], l.x, l.y, l.w, l.h);
    });
    gl.activeTexture(gl.TEXTURE0 + 3);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, seqTex);
    gl.uniform1i(U.uSeq, 3);
    gl.uniform2f(U.uSeqFx, [1, 2, 0][seqMode], SEQ_STRENGTH);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, VERTS, count);

    for (const t of tiles) {
      t.lastSeq = t.seq;
      t.lastH = t.h;
      t.lastE = t.e;
      t.lastShine = t.motion > 0.02;
    }
  }

  let request = 0;
  let previous = 0;
  let lastDraw = 0;
  // Start the first tile turn immediately once the decoded artwork is visible.
  let elapsed = 0;
  let ready = false;
  let visible = false;
  let reduced = false;
  let disposed = false;
  function loop(now) {
    request = 0;
    if (disposed || !ready || !visible) return;
    if (previous) elapsed += Math.min(now - previous, 100);
    previous = now;
    if (now - lastDraw >= 1000 / 30 || reduced) {
      frame();
      lastDraw = now;
    }
    if (!reduced) request = requestAnimationFrame(loop);
  }
  function schedule() {
    cancelAnimationFrame(request);
    request = 0;
    previous = 0;
    lastDraw = 0;
    forceDraw = true;
    if (ready && visible && !disposed) request = requestAnimationFrame(loop);
  }
  Promise.all([...layers.map((l) => l.img), ...seqImgs].map((img) => img.decode()))
    .then(() => {
      if (disposed) return;
      build();
      ready = true;
      onReady();
      schedule();
    })
    .catch((error) => {
      if (!disposed) onError(error);
    });
  return {
    resize(width, height, x = 0, y = 0) {
      const next = { width: Math.round(width), height: Math.round(height), x, y };
      if (JSON.stringify(next) === JSON.stringify(view)) return;
      view = next;
      canvas.width = view.width;
      canvas.height = view.height;
      gl.viewport(0, 0, view.width, view.height);
      if (ready) {
        build();
        schedule();
      }
    },
    /** Turn to picture `i` (an information page opening), as a chapter picked on infoPage.html: straight away, or
     * once a turn in progress is done; without motion, at once. */
    show(i) {
      if (!(i >= 0 && i < N)) return;
      queue = queue.filter((k) => k !== i); // the random order will not bring it back right away
      if (!ready || reduced) {
        trans = null;
        pending = -1;
        cur = i;
        canvas.dataset.picture = String(i);
        nextAuto = elapsed + FLIP_INTERVAL;
        schedule();
        return;
      }
      if (trans) {
        pending = i === trans.to ? -1 : i;
        return;
      }
      if (i === cur) {
        nextAuto = elapsed + FLIP_INTERVAL;
        return;
      }
      startTurn(i, elapsed);
      schedule();
    },
    setVisible(value, motionReduced = false) {
      visible = value;
      reduced = motionReduced;
      schedule();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(request);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      layers.forEach((layer) => {
        if (layer.tex) gl.deleteTexture(layer.tex);
      });
      if (seqTex) gl.deleteTexture(seqTex);
      gl.deleteBuffer(instBuf);
      gl.deleteBuffer(geoBuf);
      gl.deleteVertexArray(vao);
      for (const shader of gl.getAttachedShaders(prog) || []) gl.deleteShader(shader);
      gl.deleteProgram(prog);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
