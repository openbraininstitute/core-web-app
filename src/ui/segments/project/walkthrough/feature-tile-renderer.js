/** Tile geometry, shaders, hover and falling/rising wave imported from the user-supplied
 * HexaTile_Pages_V1/featuresPage.html. Navigation, copy and playback stay owned by React.
 * No source page scripts, placeholder content, network loaders or event navigation are run.
 */
export function createFeatureTileRenderer(
  canvas,
  host,
  { frameRect, reduced = false, onReady = () => {}, onError = () => {} }
) {
  let disposed = false,
    visible = false,
    request = 0;
  canvas.width = 1920;
  canvas.height = 1080;
  const gl = canvas.getContext('webgl2', {
    antialias: true,
    alpha: false,
    premultipliedAlpha: false,
  });
  if (!gl) throw new Error('WebGL2 unavailable');
  const activateProgram = (program) => gl['useProgram'](program);
  const smooth = (value) => {
    const f = Math.min(1, Math.max(0, value));
    return f * f * (3 - 2 * f);
  };
  const turnEase = (f) => (f < 0.5 ? 4 * f * f * f : 1 - (-2 * f + 2) ** 3 / 2);
  function gauss() {
    const u = 1 - Math.random(),
      v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function showError(message) {
    throw new Error(message);
  }
  const MODE = 'fall';
  const FALL_DUR = 320,
    FALL_SPREAD = 160,
    WHITE_HOLD = 80,
    RISE_DUR = 420,
    RISE_SPREAD = 160;
  const SLIDE_DUR = 1100;
  const skipIdle = true,
    shineOn = true,
    midFlashOn = true,
    faceShadingOn = false;
  let forceDraw = true,
    cur = 0,
    parity = 0,
    trans = null;
  const clock = () => performance.now();
  const mouse = { x: -9999, y: -9999 };
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
  // white tiles around the video frame (a noise zone centred on the frame, as on infoPage around the picture)
  const ZONE_CX = 1320,
    ZONE_CY = 497,
    ZONE_SX = 380,
    ZONE_SY = 260,
    ZONE_MIN = 0.12;
  // extension of the tile area to the left, only under the text (as on infoPage), stopping above the arrow
  const EXT = {
    cx: 760,
    cy: 790,
    sx: 330,
    sy: 150,
    strength: 0.75,
    left: 313,
    leftFade: 180,
    top: 610,
    bottom: 925,
    edgeFade: 70,
  };
  const SCALE_PER_H = 0.7;
  const PARALLAX = 0.6;
  const HOVER_RADIUS = 260,
    HOVER_BOOST = 0.9,
    EASE = 0.12;
  const FLIP_DUR = 600,
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

  // ---------- the video frame ----------
  const FRAME = frameRect; // 16:9, page px
  // The whole frame is always covered by video tiles (every tile touching the frame), so nothing eats into
  // the video. The edge only grows OUTWARDS: here and there extra tiles stick out past the frame.
  const EDGE_ROW = 1.5; // tile radii per extra row of static edge tiles
  const EDGE_ROWS_MAX = 3; // at most this many extra rows beyond the tiles crossing the frame line
  const EDGE_OUT = 0.6 + EDGE_ROW * EDGE_ROWS_MAX + 0.5; // tile radii: the farthest a static edge tile can be
  const EDGE_NOISE = 115; // px: width of the bulges along the edge (smaller = more, narrower bulges)
  const EDGE_STEPS = [0.0, 0.2, 0.36]; // noise levels where a bulge gets its 1st, 2nd, 3rd extra row (higher = rarer)
  const EDGE_RANDOM = 0.7; // tile radii: random in/out per tile, so the end of a bulge is not a straight line
  const EDGE_Y_MIN = 140,
    EDGE_Y_MAX = 855; // extra tiles stay between the header and the bottom menu
  const VIDEO_H = 0.22; // height of the video tiles: gives the video its soft shadow on the floor
  const VIDEO_HOVER = 0.5; // extra height under the mouse (inner video tiles): only the shadow grows
  const VIDEO_SCALE = 1.004; // video tiles a hair bigger than the grid, so no hairline shows between them
  // outside tiles (white, grow with the mouse) all around the video and its sticking-out tiles: close to the
  // video most places get one, further out fewer; how far they reach varies from place to place and is new
  // with every feature. Their sizes (heights) are random.
  const RING_MIN = 1.5,
    RING_MAX = 7; // reach of the ring in tile radii: the shortest and the longest bulge
  const RING_NOISE = 200; // px: size of the bulges of the ring
  const RING_AMP = 1.0; // 0..1: how many outside tiles near the video (more = more tiles)
  const RING_GAP = 1.8; // tile radii from a video tile's centre to the next tile's centre
  const RING_POOL = EDGE_OUT + RING_GAP + RING_MAX; // tiles this far from the frame can become outside tiles
  // edge tiles (the ones sticking out and the first ring crossing the frame line) lift higher under the
  // mouse than the inner ones, but the video never changes size: only the tile goes up and its shadow grows
  const EDGE_HOVER = 0.9; // extra height under the mouse for edge tiles (white tiles: HOVER_BOOST)
  // the video fits the frame exactly; past the frame (tiles sticking out) its edge pixels are used

  const VIDEO_INSET = 0.003; // part of the video cut off at each side (its thin black border line)

  const YAW = Math.PI / 4;
  const E0 = Math.atan(1 / Math.SQRT2); // 35.264 deg: isometric view, hexagon "up"
  const E1 = Math.PI - E0; // 144.736 deg: the same hexagon after the turn, "down"
  const K = R * GAP * Math.sqrt(3 / 8); // half the cube edge, so the iso outline has radius R

  const f4 = (v) => v.toFixed(5);

  // the page glow of infoPage (#tint: radial-gradient(circle 1300px at 100% 100%, rgba(204,224,248,0.45) -> 0)),
  // shared by the floor (background pass) and the white tiles
  const GLOW = 0.0; // strength of the cool glow at the bottom right: 0 = the whole page is plain white (infoPage: 0.45)
  const GLOW_GLSL = `
const vec3 GLOW_COL = vec3(204.0, 224.0, 248.0) / 255.0;
float glow(vec2 frag) {          // frag = gl_FragCoord.xy (origin bottom left, so the corner is (W, 0))
  return ${f4(GLOW)} * clamp(1.0 - length(frag - vec2(${W.toFixed(1)}, 0.0)) / 1300.0, 0.0, 1.0);
}`;

  const VERT = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec2 uOffset;
uniform float uK;
uniform float uYaw;
uniform float uE0;
uniform float uE1;
uniform float uR;
uniform int uPass;   // 0 = shadow and faces, 1 = shadow only, 2 = faces only
in vec3 aPos;        // cube corner (-1..1) for faces; quad corner (x, y) for the shadow
in vec3 aNormal;     // face normal; (0,0,0) marks the shadow quad
in vec2 iCenter;     // on-screen tile center (px)
in vec2 iRest;       // resting tile center (px): where the video under the tile is
in float iScale;     // size factor
in float iH;         // tile height
in float iP;         // cube pitch progress 0..1
in vec2 iLayers;     // video slot used in view 0 / view 1 (-1 = white tile)
in float iFade;
in vec2 iShine;      // x: height-shine position, y: height-shine strength
in float iWhite;     // 0..1: how far a video tile has turned white (fall mode)
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
out float vWhite;

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
  vScale = iScale;
  vWhite = iWhite;
  vLocal = vec2(0.0);
  vRef0 = vec2(0.0);
  vRef1 = vec2(0.0);
  vNv = vec3(0.0, 0.0, 1.0);
  vFlags = vec3(0.0);
  vec2 scr = iCenter;
  bool isShadow = dot(aNormal, aNormal) < 0.5;
  if (isShadow) {
    if (uPass == 2 || iH < 0.004 || iFade < 0.002) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
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
    if (uPass == 1 || nv.z <= 0.000001 || iFade < 0.002) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
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
// two video slots: in "turn" mode slot 0 = video on the cube's view 0, slot 1 = view 1;
// in "slide" mode slot 0 = the grid scrolling away, slot 1 = the grid coming in
uniform sampler2D uTex0;
uniform sampler2D uTex1;
uniform vec4 uRect0;
uniform vec4 uRect1;
uniform vec3 uLight;
uniform vec4 uFx;     // x: shine strength (0 = off), y: mid-turn flash strength, z: face shading on
uniform float uR;
uniform vec2 uRes;
in vec2 vLocal;
in vec2 vRef0;
in vec2 vRef1;
in vec3 vNv;
in vec3 vFlags;
in vec2 vRest;
in vec2 vLayers;
in vec3 vInst;
in vec2 vShine;
in float vScale;
in float vWhite;
out vec4 outColor;

const float PI = 3.14159265;
const float SHINE_W = ${f4(SHINE_W)};
const float SHINE_ALPHA = ${f4(SHINE_ALPHA)};
const float FACE_STAGGER = ${f4(FACE_STAGGER)};
const float SHADOW_STRENGTH = ${f4(SHADOW_STRENGTH)};
const float MID_FLASH_WIDTH = ${f4(MID_FLASH_WIDTH)};
const float VIDEO_INSET = ${f4(VIDEO_INSET)};

${GLOW_GLSL}
// color of video slot L at page position pos; white tiles (L < 0) stay white.
// Outside the video rectangle (the tiles sticking out of the frame, and the part of the edge tiles past
// the frame line) the tile is plain white.
vec3 pic(float L, vec2 pos) {
  if (L < -0.5) return vec3(1.0);
  bool s1 = L > 0.5;
  vec4 rect = s1 ? uRect1 : uRect0;
  vec2 uv = (pos - rect.xy) / rect.zw;
  if (uv.x < VIDEO_INSET || uv.x > 1.0 - VIDEO_INSET || uv.y < VIDEO_INSET || uv.y > 1.0 - VIDEO_INSET) return vec3(1.0);
  vec4 t = s1 ? textureLod(uTex1, uv, 0.0) : textureLod(uTex0, uv, 0.0);
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
  bool white = vLayers.x < -0.5;
  vec3 col = vec3(1.0);

  // video: view 0 / view 1 of the cube. A face seen in both views (the old top) cross-fades.
  float w = clamp((p - 0.38) / 0.24, 0.0, 1.0);
  w = w * w * (3.0 - 2.0 * w);
  if (has0) col = pic(vLayers.x, vRest + vRef0);
  if (has1) col = mix(col, pic(vLayers.y, vRest + vRef1), has0 ? w : 1.0);

  // the soft cool glow from the bottom right of the page (the #tint layer on infoPage), on the white tiles
  // only: on infoPage it lies over everything, here it must not wash over the video
  if (white) col = mix(col, GLOW_COL, glow(gl_FragCoord.xy));
  // a video tile sinking to the floor (or rising from it) is white, like the white tiles around it
  if (vWhite > 0.0) col = mix(col, mix(vec3(1.0), GLOW_COL, glow(gl_FragCoord.xy)), vWhite);

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

    // (2) while a white tile moves up or down: the sweep goes left face, top face, right face
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

  // faint outline of the resting hexagon on raised tiles (on the video it reads as a fine hex mosaic)
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
    showError('Link error:\n' + gl.getProgramInfoLog(prog));
    throw new Error('link failed');
  }
  activateProgram(prog);

  // background pass: the white floor with the page glow, one triangle over the whole canvas
  const bgProg = gl.createProgram();
  gl.attachShader(
    bgProg,
    compile(
      gl.VERTEX_SHADER,
      `#version 300 es
in vec2 aXY;
void main() { gl_Position = vec4(aXY, 0.0, 1.0); }`
    )
  );
  gl.attachShader(
    bgProg,
    compile(
      gl.FRAGMENT_SHADER,
      `#version 300 es
precision highp float;
${GLOW_GLSL}
out vec4 outColor;
void main() { outColor = vec4(mix(vec3(1.0), GLOW_COL, glow(gl_FragCoord.xy)), 1.0); }`
    )
  );
  gl.linkProgram(bgProg);
  if (!gl.getProgramParameter(bgProg, gl.LINK_STATUS)) {
    showError('Link error:\n' + gl.getProgramInfoLog(bgProg));
    throw new Error('link failed');
  }
  const bgVao = gl.createVertexArray();
  gl.bindVertexArray(bgVao);
  const bgBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bgBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(gl.getAttribLocation(bgProg, 'aXY'));
  gl.vertexAttribPointer(gl.getAttribLocation(bgProg, 'aXY'), 2, gl.FLOAT, false, 0, 0);
  activateProgram(prog);

  const U = {};
  for (const name of [
    'uRes',
    'uOffset',
    'uK',
    'uYaw',
    'uE0',
    'uE1',
    'uR',
    'uPass',
    'uTex0',
    'uTex1',
    'uRect0',
    'uRect1',
    'uLight',
    'uFx',
  ]) {
    U[name] = gl.getUniformLocation(prog, name);
  }

  // ---- static geometry: 1 shadow quad + 6 cube faces, 6 vertices each (2 triangles) ----
  const AX = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const geo = [];
  // the shadow quad goes FIRST, so a tile's shadow is painted before its own faces
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
  const instLayout = [];
  {
    let off = 0;
    for (const [name, size] of [
      ['iCenter', 2],
      ['iRest', 2],
      ['iScale', 1],
      ['iH', 1],
      ['iP', 1],
      ['iLayers', 2],
      ['iFade', 1],
      ['iShine', 2],
      ['iWhite', 1],
    ]) {
      const loc = attr(name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribDivisor(loc, 1);
      instLayout.push({ loc, size, off });
      off += size;
    }
  }
  // WebGL2 has no "first instance": point the instance attributes at instance `first` instead
  function bindInstances(first) {
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    for (const a of instLayout)
      gl.vertexAttribPointer(
        a.loc,
        a.size,
        gl.FLOAT,
        false,
        FLOATS * 4,
        (first * FLOATS + a.off) * 4
      );
  }

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // premultiplied alpha
  gl.viewport(0, 0, W, H);

  function makeTexture() {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255])
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  const records = [{ tex: makeTexture(), rect: { ...FRAME }, read: () => null, stamp: null }];
  const vidOf = (i) => records[i];
  function uploadVideo(v) {
    const source = v.read();
    if (!source || source.stamp === v.stamp) return false;
    gl.bindTexture(gl.TEXTURE_2D, v.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source.image);
    v.stamp = source.stamp;
    return true;
  }
  const tiles = [];
  let mainTiles = [],
    vidOrder = []; // rebuilt for every drawn frame: white tiles, video tiles
  const colW = Math.sqrt(3) * R,
    rowH = 1.5 * R;
  let instData = null;

  // smooth value noise (-1..1), used to make the edge of the video wander; a new random offset every visit
  const NSEED = Math.random() * 1000;
  function hash2(ix, iy) {
    let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function noise2(x, y) {
    const ix = Math.floor(x),
      iy = Math.floor(y),
      fx = x - ix,
      fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx),
      sy = fy * fy * (3 - 2 * fy);
    const a = hash2(ix, iy),
      b = hash2(ix + 1, iy),
      c = hash2(ix, iy + 1),
      d = hash2(ix + 1, iy + 1);
    return (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy) * 2 - 1;
  }
  // signed distance from a point to the frame rectangle (negative inside)
  function frameSdf(x, y) {
    const hx = FRAME.w / 2,
      hy = FRAME.h / 2;
    const dx = Math.abs(x - (FRAME.x + hx)) - hx,
      dy = Math.abs(y - (FRAME.y + hy)) - hy;
    return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0);
  }
  // tile (row, column) whose hexagon contains the point: the nearest tile centre
  function cellAt(px, py) {
    const r0 = Math.round(py / rowH);
    let best = null,
      bd = Infinity;
    for (let r = r0 - 1; r <= r0 + 1; r++) {
      const off = Math.abs(r) % 2 ? colW / 2 : 0,
        c0 = Math.round((px - off) / colW);
      for (let c = c0 - 1; c <= c0 + 1; c++) {
        const d = Math.hypot(c * colW + off - px, r * rowH - py);
        if (d < bd) {
          bd = d;
          best = r + ',' + c;
        }
      }
    }
    return best;
  }
  // tiles crossed by the frame line: together with the tiles whose centre is inside, they cover the whole frame
  const frameCells = new Set();
  {
    const step = R / 6;
    for (let x = FRAME.x; x <= FRAME.x + FRAME.w; x += step) {
      frameCells.add(cellAt(x, FRAME.y));
      frameCells.add(cellAt(x, FRAME.y + FRAME.h));
    }
    for (let y = FRAME.y; y <= FRAME.y + FRAME.h; y += step) {
      frameCells.add(cellAt(FRAME.x, y));
      frameCells.add(cellAt(FRAME.x + FRAME.w, y));
    }
  }
  // is the tile's hexagon completely inside the frame? (pointy-top: half width 0.866 R, half height R)
  function hexInside(x, y) {
    const hw = colW / 2;
    return (
      x - hw >= FRAME.x &&
      x + hw <= FRAME.x + FRAME.w &&
      y - R >= FRAME.y &&
      y + R <= FRAME.y + FRAME.h
    );
  }
  // is the tile part of the video? Every tile touching the frame is. Further out, smooth noise (two sizes of
  // bulge) lets the video reach several rows out here and there, so the edge is ragged without ever cutting
  // into the frame. `seed` picks the pattern. Returns 0 = no, 1 = inner video tile, 2 = edge tile (sticks out
  // or crosses the frame line).
  function inVideo(x, y, r, c, seed) {
    if (
      x + R * 2 > view.width - view.x ||
      y + R * 2 > view.height - view.y ||
      x < -view.x + R * 2 ||
      y < -view.y + R * 2
    )
      return 0;
    if (frameSdf(x, y) < 0 || frameCells.has(r + ',' + c)) return hexInside(x, y) ? 1 : 2;
    if (y < EDGE_Y_MIN || y > EDGE_Y_MAX) return 0;
    const n =
      0.7 * noise2(x / EDGE_NOISE + seed, y / EDGE_NOISE) +
      0.3 * noise2(x / (EDGE_NOISE * 0.4) + seed * 1.7, y / (EDGE_NOISE * 0.4));
    let rows = 0; // extra rows here: 0 (flush), 1, 2 or 3
    for (const step of EDGE_STEPS) if (n > step) rows++;
    if (rows === 0) return 0;
    const reach = (0.6 + EDGE_ROW * rows + (Math.random() - 0.5) * EDGE_RANDOM) * R;
    return frameSdf(x, y) < reach ? 2 : 0;
  }

  // how strongly each tile is wanted as an outside tile (0..1): the zones of infoPage, plus a ring around the
  // video tiles (those of the new set if useNew) that reaches further out in some places than in others
  function whiteMasks(useNew, seed) {
    const members = tiles.filter((t) => (useNew ? t.inNew : t.video));
    for (const t of tiles) {
      let d = Infinity;
      for (const m of members) d = Math.min(d, Math.hypot(t.x - m.x, t.y - m.y));
      const dd = Math.max(0, d / R - RING_GAP);
      const u = clamp01((noise2(t.x / RING_NOISE + seed, t.y / RING_NOISE) * 0.5 + 0.5 - 0.25) * 2);
      const reach = RING_MIN + (RING_MAX - RING_MIN) * u;
      const m = clamp01(1 - dd / reach) ** 0.8;
      const ring = RING_AMP * m * smooth((t.y - 100) / 60) * smooth((880 - t.y) / 60);
      t.maskNew = Math.max(t.mask, ring);
    }
  }
  // a random height for a white tile: small ones and big ones, none at all where the mask is low
  function whiteHeight(mask) {
    const h = mask > ZONE_MIN ? Math.max(0, HEIGHT_MEAN + gauss() * HEIGHT_SD) * mask : 0;
    return h < NOISE_FLOOR_CUT ? 0 : h;
  }

  function build() {
    tiles.length = 0;
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
        const kind = inVideo(x, y, r, c, NSEED),
          video = kind > 0,
          edge = kind === 2;
        const wbase = base < NOISE_FLOOR_CUT ? 0 : base; // the height this tile has as a white tile
        const cand = frameSdf(x, y) < (EDGE_OUT + 1) * R; // can be part of the video at some time
        base = video ? VIDEO_H : wbase; // all video tiles at one height: the video stays flat
        const pool = frameSdf(x, y) < RING_POOL * R && y > 90 && y < 890; // can be an outside tile at some time
        if (base <= 0 && !cand && !pool && mask <= ZONE_MIN) continue; // flat floor outside the zones: never drawn, not kept
        tiles.push({
          x,
          y,
          r,
          c,
          base,
          edgeFactor,
          wbase,
          mask,
          maskNew: mask,
          cand,
          h: base,
          prevH: base,
          motion: 0,
          lastH: -1,
          lastE: 0,
          lastShine: false,
          e: 0,
          video,
          edge,
          delay: Math.random() * FLIP_SPREAD,
          busy: false,
          // fall mode: part of the video before / after the change, when it sinks / rises, white 0..1, slot, alpha
          inOld: video,
          inNew: video,
          edgeNew: edge,
          fd: 0,
          rd: 0,
          hOld: 0,
          wNew: 0,
          white: 0,
          slot: 0,
          fadeOv: -1,
        });
      }
    }
    // the first set of outside tiles: the ring around the video tiles on top of the zones
    whiteMasks(false, NSEED);
    for (const t of tiles) {
      if (t.video) continue;
      t.wbase = whiteHeight(t.maskNew) * t.edgeFactor;
      t.base = t.h = t.prevH = t.wbase;
    }
    tiles.sort((a, b) => a.wbase - b.wbase); // stacking order of the white tiles (follows their heights)
    instData = new Float32Array(tiles.length * 2 * FLOATS); // room for two grids (slide mode)
  }

  // does the tile's hexagon touch the video (even by a pixel)? Pointy-top hexagon against the frame rectangle.
  function touchesVideo(t) {
    const hx = FRAME.w / 2,
      hy = FRAME.h / 2;
    const dx = Math.max(0, Math.abs(t.x - (FRAME.x + hx)) - hx),
      dy = Math.max(0, Math.abs(t.y - (FRAME.y + hy)) - hy);
    return dx <= colW / 2 && dy <= R - dx / Math.sqrt(3);
  }

  // ---------- fall mode ----------
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  // a new set of video tiles: same frame, other tiles sticking out; every tile gets its own delays
  function reshape() {
    const seed = Math.random() * 1000;
    for (const t of tiles) {
      if (!t.cand) continue;
      const kind = inVideo(t.x, t.y, t.r, t.c, seed);
      t.inOld = t.video;
      t.inNew = kind > 0;
      t.edgeNew = kind === 2;
    }
    whiteMasks(true, seed); // the ring of outside tiles around the new video tiles
    for (const t of tiles) {
      // outside (white) tiles: they sink from where they are now and rise again with a new random height
      t.hOld = t.video ? 0 : t.h;
      t.wNew = whiteHeight(t.maskNew) * t.edgeFactor;
      const along = clamp01((t.x - 300) / 1500); // sinking and rising sweep left to right, with some chaos
      t.fd = (0.55 * along + 0.45 * Math.random()) * FALL_SPREAD;
      t.rd = (0.55 * along + 0.45 * Math.random()) * RISE_SPREAD;
    }
  }
  function endFall() {
    for (const t of tiles) {
      t.wbase = t.wNew; // the new random heights are the white tiles' heights now
      if (t.cand) {
        t.video = t.inNew;
        t.edge = t.edgeNew;
        t.inOld = t.inNew;
        if (t.inNew) t.h = VIDEO_H;
      }
      t.base = t.video ? VIDEO_H : t.wbase;
      t.white = 0;
      t.slot = 0;
      t.fadeOv = -1;
    }
    tiles.sort((a, b) => a.wbase - b.wbase); // stacking order follows the new heights
  }

  function frame() {
    const now = clock();
    let changed = false;

    // The video is one unbroken image throughout the fade. Geometry and texture change
    // only at zero opacity; individual colored tiles never lead or trail the transition.
    let videoOpacity = 1;
    if (trans) {
      changed = true;
      const elapsed = now - trans.start;
      if (!trans.swapped && elapsed >= FALL_DUR) {
        const incoming = records[trans.to];
        uploadVideo(incoming);
        if (incoming.empty || incoming.stamp !== null) {
          cur = trans.to;
          endFall();
          trans.swapped = true;
          trans.fadeInAt = now + WHITE_HOLD;
        }
      }
      videoOpacity = !trans.swapped
        ? (trans.startOpacity ?? 1) * (1 - smooth(elapsed / FALL_DUR))
        : smooth((now - trans.fadeInAt) / RISE_DUR);
      canvas.dataset.featurePhase =
        !trans.swapped && elapsed < FALL_DUR
          ? 'out'
          : !trans.swapped || now < trans.fadeInAt
            ? 'white'
            : 'in';
      if (trans.swapped && videoOpacity >= 1) {
        trans = null;
        canvas.dataset.featurePhase = 'playing';
      }
    } else canvas.dataset.featurePhase = 'playing';
    canvas.dataset.featureVideoOpacity = String(videoOpacity);
    const sliding = MODE === 'slide' && trans;
    for (const t of tiles) {
      // turn mode: this video tile's part of the turn (t.e = 0 before it starts, eased 0..1 while it turns)
      let e = 0,
        turning = false;
      if (MODE === 'turn' && trans && t.video) {
        const v = (now - trans.start - t.delay) / FLIP_DUR;
        if (v >= 1) e = 1;
        else if (v > 0) {
          e = turnEase(v);
          turning = true;
        }
      }
      t.e = e;
      t.busy = turning;
      t.white = t.video ? 1 - videoOpacity : 0;

      if (!trans && !turning && !reduced) {
        // hover: lift with radial falloff (white tiles); video tiles only grow their shadow
        const d = Math.hypot(t.x - mouse.x, t.y - mouse.y);
        let f = 0;
        // static edge tiles (video-list tiles that do not touch the video) never react to the mouse
        const still = t.video && !touchesVideo(t);
        if (!sliding && (t.video || t.base > 0.03) && !still && d < HOVER_RADIUS) {
          const k = 1 - d / HOVER_RADIUS;
          f = k * k * (3 - 2 * k);
        }
        t.h +=
          (t.base +
            f * (t.edge ? EDGE_HOVER : t.video ? VIDEO_HOVER : HOVER_BOOST * t.edgeFactor) -
            t.h) *
          EASE;
      } // while turning the mouse is ignored and the tile keeps its height

      // height shine (white tiles only): jumps up with the speed, fades out once the tile stops
      const speed = Math.abs(t.h - t.prevH);
      t.prevH = t.h;
      if (shineOn && !t.video) {
        const tg = Math.min(1, Math.max(0, (speed - 0.001) * MOTION_GAIN));
        t.motion = tg > t.motion ? tg : t.motion * MOTION_DECAY;
      } else t.motion = 0;

      if (
        t.busy ||
        t.motion > 0.02 ||
        t.lastShine ||
        t.e !== t.lastE ||
        Math.abs(t.h - t.lastH) > REDRAW_EPS
      )
        changed = true;
    }
    if (sliding || (MODE === 'fall' && trans)) changed = true;

    // videos on screen: copy their new frames into the textures
    const to = trans ? trans.to : cur;
    for (const v of new Set([vidOf(cur), vidOf(to)])) if (uploadVideo(v)) changed = true;

    if (skipIdle && !changed && !forceDraw) return;
    forceDraw = false;

    // instances: per grid, the white tiles, then the video tiles (drawn last, so nothing covers the video)
    const cx = W / 2,
      cy = H / 2;
    let n = 0;
    const put = (t, offY, p, L0, L1) => {
      const o = n++ * FLOATS;
      let s, px, py;
      if (t.video) {
        s = VIDEO_SCALE;
        px = t.x;
        py = t.y;
      } // video tiles: real size, no parallax, never scaled
      else {
        s = 1 + t.h * SCALE_PER_H;
        const par = 1 + t.h * SCALE_PER_H * PARALLAX * 0.15;
        px = cx + (t.x - cx) * par;
        py = cy + (t.y - cy) * par;
      }
      instData[o] = px;
      instData[o + 1] = py + offY;
      instData[o + 2] = t.x;
      instData[o + 3] = t.y;
      instData[o + 4] = s;
      instData[o + 5] = t.h;
      instData[o + 6] = p;
      instData[o + 7] = L0;
      instData[o + 8] = L1;
      instData[o + 9] = t.fadeOv >= 0 ? t.fadeOv : t.video || t.busy ? 1 : Math.min(1, t.h / 0.08);
      instData[o + 10] = Math.min(1, Math.max(0, t.h / SHINE_HMAX));
      instData[o + 11] = t.motion;
      instData[o + 12] = t.video ? t.white : 0;
    };
    // turn: one grid, video slot 0 / 1 on view 0 / 1. slide: the old grid (slot 0) scrolls away while
    // the new grid (slot 1) comes in, both by a full page height, up when going forward
    let grids;
    if (sliding) {
      const k = turnEase(Math.min(1, (now - trans.start) / SLIDE_DUR));
      grids = [
        { offY: -trans.dir * k * H, slot: 0 },
        { offY: trans.dir * (1 - k) * H, slot: 1 },
      ];
    } else grids = [{ offY: 0, slot: -1 }];
    mainTiles = [];
    vidOrder = [];
    for (const t of tiles) (t.video ? vidOrder : mainTiles).push(t);
    vidOrder.sort((a, b) => a.edge - b.edge || a.h - b.h); // inner first, then edge tiles, a grown one on top
    const putVideo = (t, g) => {
      if (g.slot >= 0) put(t, g.offY, 0, g.slot, g.slot);
      else if (MODE === 'fall') put(t, 0, 0, t.slot, t.slot);
      else {
        let fe = t.e;
        if (fe < 1e-4) fe = 0;
        put(t, g.offY, parity === 0 ? fe : 1 - fe, 0, 1);
      }
    };
    // three groups per grid: the static edge tiles (video-list tiles that do not touch the video), the outside
    // (white) tiles, and the video tiles. Drawn video first, then static edge, then outside tiles on top.
    const staticEdge = vidOrder.filter((t) => !touchesVideo(t)),
      videoTiles = vidOrder.filter((t) => touchesVideo(t));
    const ranges = [];
    for (const g of grids) {
      const s0 = n;
      for (const t of staticEdge) putVideo(t, g);
      const m0 = n;
      for (const t of mainTiles) if (t.h >= 0.01) put(t, g.offY, 0, -1, -1);
      const v0 = n;
      for (const t of videoTiles) putVideo(t, g);
      ranges.push([s0, m0 - s0, m0, v0 - m0, v0, n - v0]);
    }

    activateProgram(bgProg); // the floor, with the glow
    gl.bindVertexArray(bgVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    activateProgram(prog);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    gl.bufferData(gl.ARRAY_BUFFER, instData.subarray(0, n * FLOATS), gl.DYNAMIC_DRAW);

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
    // the two videos of this moment (no change going on: both are the current feature's video)
    const slots = MODE !== 'turn' ? [cur, to] : parity === 0 ? [cur, to] : [to, cur];
    slots.forEach((f, i) => {
      const v = vidOf(f);
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, v.tex);
      gl.uniform1i(U['uTex' + i], i);
      gl.uniform4f(U['uRect' + i], v.rect.x, v.rect.y, v.rect.w, v.rect.h);
    });
    // white tiles with their shadows, then all video shadows, then the video faces on top: the video tiles'
    // shadows never fall on the video itself, only on the floor around it
    const draw = (pass, first, count) => {
      if (count <= 0) return;
      gl.uniform1i(U.uPass, pass);
      bindInstances(first);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, VERTS, count);
    };
    // the video tiles at the bottom (their shadows first, then their faces, so no video tile shades another),
    // the static edge tiles over them, and the outside tiles on top of everything: an outside tile that rises
    // covers the video and casts its shadow on it
    for (const [s0, sc, m0, mc, v0, vc] of ranges) {
      draw(1, v0, vc);
      draw(2, v0, vc);
      draw(1, s0, sc);
      draw(2, s0, sc);
      draw(0, m0, mc);
    }

    for (const t of tiles) {
      t.lastH = t.h;
      t.lastE = t.e;
      t.lastShine = t.motion > 0.02;
    }
  }

  function loop() {
    request = 0;
    if (disposed || !visible) return;
    try {
      frame();
      onReady();
    } catch (error) {
      visible = false;
      onError(error);
      return;
    }
    request = requestAnimationFrame(loop);
  }
  function wake() {
    forceDraw = true;
    if (visible && !disposed && !request) request = requestAnimationFrame(loop);
  }
  const pointerMove = (event) => {
    if (reduced || !visible) return;
    const box = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - box.left) * W) / box.width;
    mouse.y = ((event.clientY - box.top) * H) / box.height;
    wake();
  };
  const pointerLeave = () => {
    mouse.x = mouse.y = -9999;
    wake();
  };
  host.addEventListener('pointermove', pointerMove, { passive: true });
  host.addEventListener('pointerleave', pointerLeave);
  build();
  return {
    resize(width, height, x = 0, y = 0) {
      const next = { width: Math.round(width), height: Math.round(height), x, y };
      if (JSON.stringify(next) === JSON.stringify(view)) return;
      view = next;
      canvas.width = view.width;
      canvas.height = view.height;
      gl.viewport(0, 0, view.width, view.height);
      build();
      wake();
    },
    setSource(read, { empty = true } = {}) {
      if (trans) trans = null;
      const startOpacity = Number(canvas.dataset.featureVideoOpacity ?? 1);
      const old = records[cur];
      const first = records.length === 1 && cur === 0;
      for (const record of records) if (record !== old) gl.deleteTexture(record.tex);
      const record = { tex: makeTexture(), rect: { ...FRAME }, read, stamp: null, empty };
      records.splice(0, records.length, old, record);
      cur = 0;
      if (reduced || first) cur = 1;
      else {
        trans = { to: 1, dir: 1, start: clock(), startOpacity };
        reshape();
      }
      wake();
    },
    setVisible(value) {
      visible = value;
      if (value) wake();
      else {
        cancelAnimationFrame(request);
        request = 0;
      }
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(request);
      host.removeEventListener('pointermove', pointerMove);
      host.removeEventListener('pointerleave', pointerLeave);
      for (const v of records) if (v.tex) gl.deleteTexture(v.tex);
      for (const program of [prog, bgProg]) {
        for (const shader of gl.getAttachedShaders(program) || []) gl.deleteShader(shader);
        gl.deleteProgram(program);
      }
      for (const buffer of [geoBuf, instBuf, bgBuffer]) gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteVertexArray(bgVao);
    },
  };
}
