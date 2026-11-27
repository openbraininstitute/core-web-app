import { LANDING_MODELS as FEATURES } from './landing-models';
import { LANDING_SUBJECTS } from './landing-tile-icons';
import { createLandingPlayback } from './landing-video-playback';
import { limitTileOverlap, TILE_AXES } from './tile-overlap';

/**
 * Canvas artwork adapted from LandingPage_V1; application UI stays in React.
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLDivElement} picksContainer
 * @param {{ initialIndex?: number, reduced?: boolean, textInField?: boolean, heroBeside?: boolean,
 * heroAbove?: boolean, phoneStageH?: number,
 * flightMs?: number, seed?: number, backdrop?: boolean, whiteField?: boolean, introAt?: number, onShowChosen?: () => void,
 * onCentreIn?: () => void, onSelect?: (index: number) => void,
 * onReady?: () => void, onInteraction?: () => void, onError?: (error: Error) => void }} options
 */
export function createLandingTileRenderer(
  canvas,
  picksContainer,
  {
    initialIndex = 0,
    reduced = false,
    // Whether the headline sits over the field (a phone) rather than beside it (wider screens).
    textInField = true,
    // Whether the chosen example is drawn large beside the field, its own tile grown into a big cube there: every tile
    // is then a pick, its tile moving over and growing as the one there shrinks back to its place.
    heroBeside = false,
    // A phone (with heroBeside): the chosen one above the field, not beside it, the field smaller under it, nothing
    // over the chosen one; the words are under the canvas. Phones see the stage's x PHONE.x0 .. x1 (landing-tile-stage).
    heroAbove = false,
    // how tall the stage is on a phone, px (1080 or more): the field and the words at its foot, and the chosen one
    // taking whatever height is left above them (user: "Move everything down, so the main example is bigger")
    phoneStageH = 1080,
    flightMs = 1100,
    // the same seed lays the same tiles out: the chapters' backdrop draws the landing's own arrangement
    seed,
    // the arrangement alone, every tile white, nothing to pick, nothing beside the field (behind the chapters)
    backdrop = false,
    // every tile in the field white and none a pick; the films only beside the field, one at a time, changed with
    // `show(i)` (with heroBeside)
    whiteField = false,
    // when (performance.now() clock) the first white tiles are to show: as the page's logo and words start coming in
    introAt,
    // with the chosen one beside the field: told when the opening is far enough on for it to show there
    onShowChosen = () => {},
    // (whiteField) told as the field's central tile, which the page's logo stands on, comes in
    onCentreIn = () => {},
    onSelect = () => {},
    onReady = () => {},
    onInteraction = () => {},
    onError = () => {},
  } = {}
) {
  // mulberry32, from the seed given; or the browser's own
  const random =
    seed == null
      ? Math.random
      : (() => {
          let a = seed >>> 0;
          return () => {
            a = (a + 0x6d2b79f5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          };
        })();
  let disposed = false;
  let visible = true;
  let frameId = 0;
  const timers = new Set();
  const later = (callback, delay) => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      if (!disposed) callback();
    }, delay);
    timers.add(timer);
    return timer;
  };
  const requestFrame = (callback) => {
    frameId = requestAnimationFrame(callback);
  };
  // ---- hex grid (same as index.html): pointy-top, circumradius R; a tile lifted to height h is R * (1 + 0.7 h) ----
  const R = 55,
    SCALE_PER_H = 0.7,
    FLOOR_R0 = 0.72 * R;
  const colW = Math.sqrt(3) * R,
    rowH = 1.5 * R;
  const hForRadius = (r) => (r / R - 1) / SCALE_PER_H;

  // ---- picture tiles, as on the first landing: a big one in the middle third, and medium ones straight beside it on
  // random sides, slid along its edges. With the chosen one beside the field (out of any cube), one tile fewer than
  // the examples, and none on the big one's right, which the chosen one has. ----
  // On a phone (user: "the selected model above the small examples"): the stage's middle 1000 px across, the chosen one
  // in its top half, the field under it from `fieldTop`, and no tiles over the chosen one.
  // how many picture tiles the field has: one per film, or (white) as many as the first landing's eight films had
  const FIELD_TILES = whiteField ? 8 : FEATURES.length;
  const STAGE_H = heroAbove ? Math.max(1080, phoneStageH) : 1080,
    FOOT = STAGE_H - 40;
  const PHONE = { x0: 450, x1: 1410, fieldTop: FOOT - 440, big: 112, medium: 69 };
  // Enlarge the phone model into the spare space before the capability tile field.
  // The CTA and the smaller capability tiles keep their positions.
  const PHONE_HERO_H = PHONE.fieldTop + 20;
  const FEATURE_SLOTS = [
    heroAbove ? { x: 930, y: FOOT - 240, r: PHONE.big } : { x: 960, y: 540, r: 174 },
    ...Array.from({ length: Math.max(1, FIELD_TILES - (heroBeside ? 2 : 1)) }, () => ({
      x: 0,
      y: 0,
      r: heroAbove ? PHONE.medium : 88,
    })),
  ];
  // where the chosen one goes, in the right third, its tile growing as if to a cube this big as the cube melts away
  // from round it; and how far a moving tile bows off its way (none: a straight path, user: the arc "makes the
  // animation look weird"; it was 90)
  // (whiteField) the films fill the right third, from under the top bar down to their name, level with the
  // chapters along the foot
  const HERO_TILE = heroAbove
      ? { x: 930, y: 10 + PHONE_HERO_H / 2, r: (210 * PHONE_HERO_H) / 480 }
      : whiteField
        ? { x: 1550, y: 530, r: 330 }
        : { x: 1590, y: 480, r: 330 },
    BOW = 0;
  // the chosen one itself, out of its cube: as wide as the example says (smaller in step on a phone), within this box
  const BIG_W = heroAbove ? 960 : whiteField ? 760 : 720,
    BIG_H = heroAbove ? PHONE_HERO_H : whiteField ? 860 : 620,
    HERO_K = HERO_TILE.r / 330;
  // ---- small white tiles round them, a new set on every pick, as on the first landing: each grown until its straight
  // edge almost touches a picture tile; a fade of lower, smaller ones round them; a few tiny ones for depth ----
  // (smaller in step with the picture tiles on a phone)
  const SMALL_K = heroAbove ? PHONE.medium / 97 : 1;
  const SMALL_COUNT = heroAbove ? 8 : 10,
    SMALL_R = [65 * SMALL_K, 84 * SMALL_K],
    SMALL_GAP = 6,
    SMALL_ON_BIG = 0.2;
  const EDGE_GAP = 6;
  const FADE_RINGS = [
      [58 * SMALL_K, 63 * SMALL_K],
      [55.8 * SMALL_K, 57.5 * SMALL_K],
    ],
    FADE_PER = 2,
    FADE_CLEAR = 30;
  const TINY_COUNT = 7,
    TINY_R0 = [22 * SMALL_K, 30 * SMALL_K],
    TINY_H = [0.15, 0.4];
  // ---- and a flourish of cubes off to the left under the words: along its curve, out to the page's edge, they thin
  // out, shrink, sink and cast less shadow ----
  const FLOOR_H = [0.3, 0.6],
    FLOURISH = {
      from: [760, 700],
      bend: [420, 820],
      to: [30, 680],
      width: [200, 110],
      fill: [1, 0.6],
    },
    // and cubes spread over the rest of the left third, fewer, smaller and lower towards the page's edge
    LEFT_FIELD = { x1: 760, fill: 0.62 };
  // the page in thirds: the words, the examples, the chosen one; nothing in the chosen one's third, no white tiles
  // over the words
  const HERO_THIRD_X = 1280,
    WORDS_BOX = { x0: 0, x1: 560, y0: 360, y1: 700 };
  // start: every tile begins at a random moment within LIFT_SPREAD ms and rises with LIFT_EASE per frame
  const LIFT_EASE = 0.06;
  // first open: each picture tile turns from white to its picture WHILE it grows from the floor - its size follows
  // the turn, so it reaches full size exactly as the turn ends; INTRO_FLIP_DUR = length of that turn + growth
  const INTRO_TURN_DELAY = 0,
    INTRO_FLIP_DUR = 1100;
  // cube face shading while turning, only on the picture tiles (strength as on index.html)
  const FACE_SHADE = 0.28;
  // At rest the tiles are flat hexagons, as on the About and Team pages (user): no face is shaded, so a cube seen
  // along its diagonal shows as a plain hexagon; they read as cubes only while they turn. false = cubes at rest too.
  const FLAT_AT_REST = true;
  // They turn over as the About and Team pages' tiles do (user, hexa-tile-renderer.js): a cube seen along its
  // diagonal tumbling about the horizontal axis, its faces unshaded, with the mid-turn flash and the shine.
  // true = the flat flip about the upright axis instead (user, before: "just rotation of hexagons").
  const FLAT_TURN = false;
  const SHADE_PICTURE = 0.5,
    SHADE_WHITE = 0.1; // share of FACE_SHADE on picture tiles / white tiles
  // shine while a tile grows or shrinks under the mouse (1 = same as the lift from the floor)
  const HOVER_SHINE = 0.7;

  // ---- motion / look (same values as index.html where they exist) ----
  const EASE = 0.12; // height follows its target by 12 % per frame
  // whether, on a pick, the picture tiles that stay where they are turn over, passing their examples on (off for now)
  const TURN_ON_PICK = false;
  // the opening: the white tiles rise in a sweep from left to right as the words fade in (on the page), taking
  // INTRO_SWEEP, without waiting for the pictures; then the chosen one shows beside the field and the picture tiles
  // rise, once the pictures are in. White on white a tile shows only by its shadow, which grows as it rises, and the
  // sweep starts with the low faint ones under the words: so it starts INTRO_LEAD before `introAt` (else
  // INTRO_AFTER ms in), for tiles to be seen from `introAt` on (measured from screencast frames). Drawn late (the
  // app slow to load), it goes on from where it would be, up to INTRO_LEAD along, its first tiles part risen.
  const INTRO_AFTER = 750,
    INTRO_LEAD = 600,
    INTRO_SWEEP = 1300,
    INTRO_JITTER = 140,
    // from the white tiles' start: the chosen one beside the field once most of them are up; the picture tiles after it
    HERO_AFTER = 0.7 * INTRO_SWEEP,
    PICTURES_AFTER = HERO_AFTER + 600,
    PICTURES_SWEEP = 500;
  const MOTION_GAIN = 40,
    MOTION_DECAY = 0.88;
  const FLIP_DUR = 600,
    FLIP_SPREAD = 450; // turn duration, left-to-right stagger
  const MID_FLASH = 0.85,
    MID_FLASH_W = 0.2,
    SHINE_W = 0.28,
    SHINE_ALPHA = 0.56,
    FACE_STAGGER = 0.25;
  const MOTION_ATTACK = 0.35; // how fast the shine fades in when a tile starts moving
  const HOVER_BOOST = 0.3; // a medium tile lifts this much higher under the mouse
  const reduceMotion = reduced;

  // ---------- helpers ----------
  const $ = (id) => (id === 'tiles' ? canvas : picksContainer);
  const turnEase = (f) => (f < 0.5 ? 4 * f * f * f : 1 - (-2 * f + 2) ** 3 / 2); // same as index.html
  const band = (u, q) => {
    const d = Math.abs(u - q) / SHINE_W;
    return d < 1 ? 0.5 + 0.5 * Math.cos(Math.PI * d) : 0;
  };

  const stage = canvas.parentElement;
  // ---------- canvas ----------
  const cv = canvas;
  // (a let: a tile fading in or out is drawn into a layer of its own, `ctx` pointed at it meanwhile)
  let ctx = cv.getContext('2d');
  if (!ctx) throw new Error('Canvas rendering is unavailable');
  const DPR = Math.min(whiteField && !heroAbove ? 2 : 1.5, window.devicePixelRatio || 1);
  cv.width = 1920 * DPR;
  cv.height = STAGE_H * DPR;

  // ---------- cube maths (as in the WebGL shader) ----------
  const YAW = Math.PI / 4,
    E0 = Math.atan(1 / Math.SQRT2),
    E1 = Math.PI - E0;
  const LIGHT = (() => {
    const l = [-0.35, 0.75, 0.55],
      m = Math.hypot(...l);
    return l.map((v) => v / m);
  })();
  function rotv(v, e, yaw = YAW) {
    const c = Math.cos(yaw),
      s = Math.sin(yaw);
    const x1 = v[0] * c + v[2] * s,
      z1 = -v[0] * s + v[2] * c,
      y1 = v[1];
    return [x1, y1 * Math.cos(e) - z1 * Math.sin(e), y1 * Math.sin(e) + z1 * Math.cos(e)];
  }
  const proj = (v, e) => {
    const q = rotv(v, e);
    return [q[0], -q[1]];
  }; // screen, y down, unit = K
  const FACES = [];
  for (let i = 0; i < 3; i++)
    for (const sg of [1, -1]) {
      const n = [0, 0, 0];
      n[i] = sg;
      const u = [0, 0, 0];
      u[(i + 1) % 3] = 1;
      const v = [0, 0, 0];
      v[(i + 2) % 3] = 1;
      const corners = [
        [1, 1],
        [-1, 1],
        [-1, -1],
        [1, -1],
      ].map(([a, b]) => [0, 1, 2].map((k) => n[k] + a * u[k] + b * v[k]));
      FACES.push({
        n,
        corners,
        seen0: rotv(n, E0)[2] > 1e-6,
        seen1: rotv(n, E1)[2] > 1e-6,
        ref0: corners.map((c) => proj(c, E0)),
        ref1: corners.map((c) => proj(c, E1)),
      });
    }
  const restingFootprints = new Map();
  const footprintAt = (p) => {
    const cached = restingFootprints.get(p);
    if (cached) return cached;
    const points = FACES.flatMap((face) =>
      face.corners.map((point) => proj(point, E0 + p * (E1 - E0)))
    );
    const supports = TILE_AXES.map(
      ([nx, ny]) =>
        Math.max(...points.map(([x, y]) => Math.abs(x * nx + y * ny))) * Math.sqrt(3 / 8)
    );
    if (p === 0 || p === 1) restingFootprints.set(p, supports);
    return supports;
  };
  // affine map taking the triangle s0,s1,s2 onto d0,d1,d2 (canvas transform order a,b,c,d,e,f)
  function affine(s, d) {
    const sx1 = s[1][0] - s[0][0],
      sy1 = s[1][1] - s[0][1],
      sx2 = s[3][0] - s[0][0],
      sy2 = s[3][1] - s[0][1];
    const dx1 = d[1][0] - d[0][0],
      dy1 = d[1][1] - d[0][1],
      dx2 = d[3][0] - d[0][0],
      dy2 = d[3][1] - d[0][1];
    const det = sx1 * sy2 - sx2 * sy1;
    const a = (dx1 * sy2 - dx2 * sy1) / det,
      c = (dx2 * sx1 - dx1 * sx2) / det;
    const b = (dy1 * sy2 - dy2 * sy1) / det,
      dd = (dy2 * sx1 - dy1 * sx2) / det;
    return [a, b, c, dd, d[0][0] - a * s[0][0] - c * s[0][1], d[0][1] - b * s[0][0] - dd * s[0][1]];
  }
  const tracePath = (pts) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };

  // pictures cut into a hexagon (one per feature, made once, at the big tile's size x2 for sharpness)
  const SLICE_R = heroBeside ? HERO_TILE.r : FEATURE_SLOTS[0].r,
    SLICE_K = heroBeside ? 1.5 : 2;

  // blurred hexagon shadows, made once at a few blur levels (sprite hexagon radius 100)
  const SH_R = 100,
    SH_LEVELS = [2, 4, 7, 11, 16, 23, 32, 44];
  // One pre-blurred atlas gives every browser the same pixels, without canvas filter support.
  const shadowAtlas = new Image();
  shadowAtlas.onload = kick;
  shadowAtlas.src = '/static/landing-v1/shadows/tile-shadows-v1.webp';
  let shadowX = 0;
  const shadowSprites = SH_LEVELS.map((b) => {
    const size = 2 * (SH_R + Math.ceil(b * 3));
    const x = shadowX;
    shadowX += size;
    return { x, size, b };
  });
  function drawShadow(x, y, r, sigma, alpha) {
    if (!shadowAtlas.complete || !shadowAtlas.naturalWidth) return;
    const scale = r / SH_R,
      want = sigma / scale; // blur needed at sprite scale
    // cross-fade the two blur levels around the wanted blur, so the shadow softens smoothly instead of
    // jumping from one ready-made level to the next while the tile moves
    let i = 0;
    while (i < shadowSprites.length - 2 && shadowSprites[i + 1].b < want) i++;
    const a = shadowSprites[i],
      b = shadowSprites[i + 1];
    const f = Math.min(1, Math.max(0, (want - a.b) / (b.b - a.b)));
    const one = (s, w) => {
      if (w <= 0.001) return;
      const d = s.size * scale;
      ctx.globalAlpha = alpha * w;
      ctx.drawImage(shadowAtlas, s.x, 0, s.size, s.size, x - d / 2, y - d / 2, d, d);
    };
    one(a, 1 - f);
    one(b, f);
    ctx.globalAlpha = 1;
  }
  function makeSlice(f, img) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(Math.sqrt(3) * SLICE_R * SLICE_K);
    c.height = Math.ceil(2 * SLICE_R * SLICE_K);
    paintSlice(c, f, img);
    return c;
  }
  // (again on every frame of a playing video)
  function paintSlice(c, f, src) {
    const w = Math.sqrt(3) * SLICE_R,
      h = 2 * SLICE_R;
    const g = c.getContext('2d');
    g.setTransform(SLICE_K, 0, 0, SLICE_K, 0, 0);
    g.clearRect(0, 0, w, h);
    g.save();
    g.beginPath();
    [
      [w / 2, 0],
      [w, h / 4],
      [w, (3 * h) / 4],
      [w / 2, h],
      [0, (3 * h) / 4],
      [0, h / 4],
    ].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fillStyle = '#fff';
    g.fill();
    g.clip();
    const iw = w * f.zoom,
      ih = (iw * (src.naturalHeight || src.videoHeight)) / (src.naturalWidth || src.videoWidth);
    g.drawImage(src, (w - iw) / 2, (h - ih) / 2, iw, ih);
    // one that runs to its frame's edges fades to white well inside the hexagon, so neither shows (`feather`)
    if (f.feather) {
      const fade = g.createRadialGradient(
        w / 2,
        h / 2,
        0.6 * SLICE_R,
        w / 2,
        h / 2,
        0.98 * SLICE_R
      );
      fade.addColorStop(0, 'rgba(255,255,255,0)');
      fade.addColorStop(1, 'rgba(255,255,255,1)');
      g.fillStyle = fade;
      g.fillRect(0, 0, w, h);
    }
    g.restore();
  }

  // (whiteField, the main landing only) a shadowed hexagon (user: html_Inject/tileShadow.png) over each field tile at
  // rest, unseen on the small tiles near the floor and stronger the bigger and nearer the tile, up to 60% on the
  // biggest one (user: 60%). Multiplied in, so it shades the white and leaves the icons as dark as they are.
  const TILE_SHADOW = {
    src: '/static/landing-v1/tile-shadow.png',
    max: 0.6,
    // tile radius at which it starts to show (a normal tile on the floor) and reaches `max` (the central tile)
    from: R * SMALL_K,
    to: FEATURE_SLOTS[0].r,
  };
  let tileShadow = null;
  if (whiteField) {
    const img = new Image();
    img.onload = () => {
      tileShadow = img;
      kick();
    };
    img.src = TILE_SHADOW.src;
  }
  const tileShadowAlpha = (r) =>
    TILE_SHADOW.max *
    Math.min(1, Math.max(0, (r - TILE_SHADOW.from) / (TILE_SHADOW.to - TILE_SHADOW.from)));

  // one tile: cube at (x, y) with outline radius r (slot radius rs for the picture), turn position p (0..1),
  // pictures pic0 / pic1 on the faces seen in view 0 / view 1 (null = white), lift height h and height shine,
  // overlay = how much of TILE_SHADOW to lay over it at rest (0 = none)
  function drawTile(
    x,
    y,
    r,
    rs,
    p,
    pic0,
    pic1,
    h,
    shineX,
    shineAmt,
    shade,
    shadowK = 1,
    overlay = 0
  ) {
    const K = r * Math.sqrt(3 / 8),
      Ks = rs * Math.sqrt(3 / 8);
    const e = E0 + p * (E1 - E0);
    const turnAmt = Math.max(0, Math.sin(Math.PI * p));
    let w = Math.min(1, Math.max(0, (p - 0.38) / 0.24));
    w = w * w * (3 - 2 * w);
    const vis = [];
    for (const f of FACES) {
      const nv = rotv(f.n, e);
      if (nv[2] <= 1e-6) continue;
      const pts = f.corners.map((c) => {
        const q = proj(c, e);
        return [x + q[0] * K, y + q[1] * K];
      });
      vis.push({
        f,
        pts,
        lit: Math.max(0, nv[0] * LIGHT[0] + nv[1] * LIGHT[1] + nv[2] * LIGHT[2]),
      });
    }
    if (!vis.length) return;

    // soft shadow, offset down-left, bigger and softer the higher the tile is (as on index.html);
    // drawn from ready-made blurred hexagons, so a hundred tiles stay cheap
    // flat hexagons (`FLAT_AT_REST`) turn as flat hexagons too: about their upright axis, edge-on half-way, the new
    // picture on the other side (user: "just rotation of hexagons", not cubes); `across` is how wide it shows
    const flatTurn = FLAT_TURN && FLAT_AT_REST && p >= 1e-4 && p <= 1 - 1e-4,
      across = flatTurn ? Math.max(0.02, Math.abs(Math.cos(Math.PI * p))) : 1;
    const squeezed = (paint) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(across, 1);
      ctx.translate(-x, -y);
      paint();
      ctx.restore();
    };
    if (h > 0.004) {
      const k = Math.sqrt(r / R);
      const sigma = (4 + h * 28) * 0.5 * Math.min(k, 2.4);
      const shadow = () =>
        drawShadow(
          x - 8 * h * k,
          y + 14 * h * k,
          r,
          sigma,
          Math.min(0.28, h * 0.3) * 1.1 * shadowK
        );
      if (flatTurn) squeezed(shadow);
      else shadow();
    }

    const pic = (slice, ref, pts, alpha) => {
      // picture seen through this face, as on the shader
      const s = ref.map(([u, v]) => [u * Ks, v * Ks]);
      const d = pts.map(([px, py]) => [px - x, py - y]);
      const m = affine(s, d);
      const sw = Math.sqrt(3) * rs,
        sh = 2 * rs;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.transform(m[0], m[1], m[2], m[3], m[4] + x, m[5] + y);
      ctx.drawImage(slice, -sw / 2, -sh / 2, sw, sh);
      ctx.restore();
    };
    const white = (alpha) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.globalAlpha = 1;
    };
    const hexPath = (rr) => {
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 3;
        k
          ? ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a))
          : ctx.moveTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
      }
      ctx.closePath();
    };

    // the shadow image over the hexagon's own box (pointy-top, 2r high), multiplied in; the caller clips it
    const shadowOver = () => {
      if (overlay <= 0.001 || !tileShadow) return;
      ctx.save();
      ctx.globalAlpha = overlay;
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(tileShadow, x - (Math.sqrt(3) * r) / 2, y - r, Math.sqrt(3) * r, 2 * r);
      ctx.restore();
    };

    if (flatTurn) {
      const slice = p < 0.5 ? pic0 : pic1;
      squeezed(() => {
        hexPath(r);
        ctx.fillStyle = '#fff';
        ctx.fill();
        if (slice) {
          ctx.save();
          ctx.clip();
          const k = r / rs,
            sw = Math.sqrt(3) * rs * k,
            sh = 2 * rs * k;
          ctx.drawImage(slice, x - sw / 2, y - sh / 2, sw, sh);
          ctx.restore();
        }
        // a little darker the further it has turned from the light
        hexPath(r);
        ctx.globalAlpha = 0.22 * (1 - across) * (shade ? 1 : 0.4);
        ctx.fillStyle = 'rgb(30, 45, 80)';
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      return;
    }
    if (p < 1e-4 || p > 1 - 1e-4) {
      // at rest the faces exactly make up the hexagon and show the picture undistorted: draw it in one piece (no seams)
      const slice = p < 0.5 ? pic0 : pic1;
      ctx.save();
      hexPath(r);
      ctx.fillStyle = '#fff';
      ctx.fill();
      if (slice) {
        ctx.clip();
        const k = r / rs,
          sw = Math.sqrt(3) * rs * k,
          sh = 2 * rs * k;
        ctx.drawImage(slice, x - sw / 2, y - sh / 2, sw, sh);
      }
      ctx.restore();
      shadowOver();
      // face shading at rest too (picture tiles only): each visible cube face darkened by how much it faces away
      if (shade && !FLAT_AT_REST) {
        ctx.fillStyle = 'rgb(30, 45, 80)';
        for (const v of vis) {
          tracePath(v.pts);
          ctx.globalAlpha = (1 - v.lit) * FACE_SHADE * shade;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (shineAmt <= 0.02) {
        restOutline();
        return;
      }
    }
    // faces grown by half a pixel so neighbouring faces overlap and no seam shows between them
    const grow = (pts) => {
      const cx = pts.reduce((s, q) => s + q[0], 0) / 4,
        cy = pts.reduce((s, q) => s + q[1], 0) / 4;
      return pts.map(([px, py]) => {
        const dx = px - cx,
          dy = py - cy,
          l = Math.hypot(dx, dy) || 1;
        return [px + (dx / l) * 0.6, py + (dy / l) * 0.6];
      });
    };
    const atRest = p < 1e-4 || p > 1 - 1e-4;

    for (const v of vis) {
      const { f } = v,
        pts = grow(v.pts);
      ctx.save();
      tracePath(pts);
      if (!atRest) {
        ctx.fillStyle = '#fff';
        ctx.fill();
      }
      ctx.clip();
      if (atRest) {
        tracePath(pts);
      } // picture already drawn above: only the shine below
      else {
        if (f.seen0 && pic0) pic(pic0, f.ref0, v.pts, 1);
        if (f.seen1) {
          const a = f.seen0 ? w : 1;
          if (pic1) pic(pic1, f.ref1, v.pts, a);
          else if (a > 0) {
            tracePath(pts);
            white(a);
          }
        }
        tracePath(pts);
      }
      // mid-turn flash on the face seen before and after
      if (f.seen0 && f.seen1) {
        const d = Math.abs(p - 0.5) / MID_FLASH_W;
        if (d < 1) white(MID_FLASH * (0.5 + 0.5 * Math.cos(Math.PI * d)));
      }
      // cube face shading on the picture tiles (at rest it is drawn above, with the picture); none with the tiles
      // flat at rest, as on the About pages, which shade no face while turning either
      if (shade && !atRest && !FLAT_AT_REST) {
        ctx.globalAlpha = (1 - v.lit) * FACE_SHADE * shade;
        ctx.fillStyle = 'rgb(30, 45, 80)';
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // shine bands along the bottom-left -> top-right diagonal
      const bandFill = (alphaAt) => {
        const g = ctx.createLinearGradient(x - 0.9 * r, y + 0.9 * r, x + 0.9 * r, y - 0.9 * r);
        for (let k = 0; k <= 24; k++)
          g.addColorStop(k / 24, `rgba(255,255,255,${Math.min(1, alphaAt(k / 24)).toFixed(3)})`);
        ctx.fillStyle = g;
        ctx.fill();
      };
      if (turnAmt > 0.001) {
        // (1) while turning
        const a = Math.sqrt(turnAmt) * SHINE_ALPHA * (0.45 + 0.55 * v.lit),
          q = -SHINE_W + (1 + 2 * SHINE_W) * p;
        bandFill((u) => a * band(u, q));
      }
      if (shineAmt > 0.02) {
        // (2) while lifting: left face, top face, right face
        const cx = pts.reduce((s, q) => s + q[0], 0) / 4 - x,
          cy = pts.reduce((s, q) => s + q[1], 0) / 4 - y;
        const ang = Math.atan2(cy, cx);
        let fi = 0;
        if (ang >= -Math.PI / 6 && ang < Math.PI / 2) fi = 2;
        else if (ang >= (-5 * Math.PI) / 6 && ang < -Math.PI / 6) fi = 1;
        const gain = [1, 0.7, 0.45][fi];
        const sf = (shineX - fi * FACE_STAGGER) / (1 - 2 * FACE_STAGGER);
        if (sf > 0 && sf < 1) {
          const q = -SHINE_W + (1 + 2 * SHINE_W) * sf,
            a = gain * Math.sqrt(Math.max(0, Math.sin(Math.PI * sf))) * shineAmt * SHINE_ALPHA;
          bandFill((u) => a * band(u, q));
        }
      }
      // while turning, the shadow stays on every face (at rest it is drawn above), so it does not drop out and
      // come back at the end of the flip (user)
      if (!atRest) shadowOver();
      ctx.restore();
    }
    if (atRest) restOutline();

    // faint outline of the hexagon at rest (as on index.html), so white tiles read on the white page
    function restOutline() {
      ctx.save();
      hexPath(r);
      ctx.strokeStyle = `rgba(120, 130, 150, ${Math.min(0.14, h * 0.12)})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }
  }

  // ---------- tiles on the hex grid ----------
  // every cell: base = its floor-noise height (0 = flat floor, not drawn), role = 'feature' / 'small' / null,
  // h follows target like on index.html, plus the cube turn state
  const cells = [];
  for (let row = 1; row * rowH < STAGE_H - R; row++) {
    // (from the page's left edge, so the cubes there run off it)
    for (let col = 0; col * colW < 1900; col++) {
      const x = col * colW + (row % 2 ? colW / 2 : 0),
        y = row * rowH;
      cells.push({
        x,
        y,
        base: 0,
        role: null,
        slot: -1,
        lift: 0,
        h: 0,
        prevH: 0,
        motion: 0,
        start: 0,
        orient: 0,
        pics: [null, null],
        turnStart: -1,
        turnDelay: 0,
        hover: 0,
        hoverTarget: 0,
        // idle drift: a slow wander about its place, its own phase and pace on each axis (ms per radian)
        driftPhase: [random() * 2 * Math.PI, random() * 2 * Math.PI],
        driftPace: [
          (7000 + random() * 5000) / (2 * Math.PI),
          (8000 + random() * 5000) / (2 * Math.PI),
        ],
      });
    }
  }
  // how far a tile has drifted from its place at `now`: a few px, more for a bigger tile; none with reduced motion
  const DRIFT_PER_R = 0.04,
    DRIFT_MAX = 7;
  const driftAt = (c, now) => {
    // the honeycomb holds still, its cracks with it; the tiles that stand out of it wander
    // (and the central tile holding the logo holds still: the logo stays in its middle)
    if (reduceMotion || c.still || (!c.role && !c.stray)) return [0, 0];
    const a = Math.min(DRIFT_MAX, DRIFT_PER_R * radiusOf(c));
    return [
      a * Math.sin(now / c.driftPace[0] + c.driftPhase[0]),
      a * Math.sin(now / c.driftPace[1] + c.driftPhase[1]),
    ];
  };
  const nearestCell = (x, y, free = () => true) => {
    let best = null,
      bd = Infinity;
    for (const c of cells) {
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bd && free(c)) {
        bd = d;
        best = c;
      }
    }
    return best;
  };
  // r0 = the tile's size on the floor (R for normal tiles, smaller for the tiny scattered ones)
  const radiusOf = (c) => (c.r0 || R) * (1 + SCALE_PER_H * c.h);

  // keep the header strip, the text block and the bottom navigation free of tiles
  const KEEP_CLEAR = [
    { x0: 0, x1: 1920, y0: 0, y1: 50 },
    { x0: 0, x1: 1920, y0: 1010, y1: 1080 },
    // the arrow down to the next page, at the foot's middle
    { x0: 740, x1: 1240, y0: 880, y1: 1080 },
  ];
  const openArea = (x, y, r) =>
    KEEP_CLEAR.every((b) => x + r < b.x0 || x - r > b.x1 || y + r < b.y0 || y - r > b.y1);

  // ---- edge-to-edge fitting ----
  // All tiles are pointy-top hexagons with the same orientation, so their straight edges are always parallel.
  // Two such hexagons are apart exactly when, along one of the 3 edge normals (0, 60, 120 deg), the distance
  // between centres is larger than the sum of their apothems (apothem = radius x sqrt(3)/2).
  // fitRadius = the radius a tile at (x, y) may have so its straight edge stays `gap` px from tile t.
  const APO = Math.sqrt(3) / 2;
  const NORMALS = [0, 60, 120].map((a) => [
    Math.cos((a * Math.PI) / 180),
    Math.sin((a * Math.PI) / 180),
  ]);
  const fitRadius = (x, y, t, gap) => {
    const sep = Math.max(...NORMALS.map(([nx, ny]) => Math.abs((x - t.x) * nx + (y - t.y) * ny)));
    return (sep - t.r * APO - gap) / APO;
  };

  // fits = does not come closer than `gap` px to any of the tiles in `others`
  const fits = (p, others, gap) => others.every((o) => fitRadius(p.x, p.y, o, gap) >= p.r - 0.01);
  const inBounds = (p) =>
    heroAbove
      ? p.x - p.r > PHONE.x0 &&
        p.x + p.r < PHONE.x1 &&
        p.y - p.r > PHONE.fieldTop &&
        p.y + p.r < FOOT
      : p.x - p.r > 40 &&
        p.y - p.r > 40 &&
        p.y + p.r < 1040 &&
        p.x + p.r < HERO_THIRD_X &&
        openArea(p.x, p.y, p.r);
  const clearOfWords = (p) =>
    heroAbove || p.x - p.r > WORDS_BOX.x1 || p.y + p.r < WORDS_BOX.y0 || p.y - p.r > WORDS_BOX.y1;
  // a tile of radius r placed straight beside tile t: its centre sits along one of the 6 edge normals of t, exactly
  // so far that the two facing edges are `gap` px apart; `lat` slides it sideways along that edge
  const FACE_MIN = 0.6; // touching edges overlap by at least 60 % of the shorter edge
  const DIRS = [0, 60, 120, 180, 240, 300].map((a) => [
    Math.cos((a * Math.PI) / 180),
    Math.sin((a * Math.PI) / 180),
  ]);
  const beside = (t, r, dir, lat, gap) => {
    const [nx, ny] = DIRS[dir],
      d = (t.r + r) * APO + gap;
    return { x: t.x + nx * d - ny * lat, y: t.y + ny * d + nx * lat, r };
  };
  const maxLat = (r, t) => Math.max(0, (r + t.r) / 2 - FACE_MIN * Math.min(r, t.r));
  // a free grid cell is moved to the exact spot (the floor grid is not drawn, so cells can sit anywhere)
  function claimCell(p, taken) {
    const c = nearestCell(p.x, p.y, (c) => !c.role && !taken.has(c) && c.h < 0.005);
    c.x = p.x;
    c.y = p.y;
    c.r0 = p.r0 || R;
    taken.add(c);
    return c;
  }

  const rand = (lo, hi) => lo + random() * (hi - lo);
  // where a point is along the flourish (t 0 at its start .. 1 at its end) and how far off its curve
  const lerp = ([a, b], t) => a + (b - a) * t;
  const alongFlourish = (x, y) => {
    let best = { t: 0, off: Infinity };
    for (let k = 0; k <= 80; k++) {
      const t = k / 80,
        u = 1 - t;
      const px = u * u * FLOURISH.from[0] + 2 * u * t * FLOURISH.bend[0] + t * t * FLOURISH.to[0];
      const py = u * u * FLOURISH.from[1] + 2 * u * t * FLOURISH.bend[1] + t * t * FLOURISH.to[1];
      const off = Math.hypot(x - px, y - py);
      if (off < best.off) best = { t, off };
    }
    return best;
  };
  // the floor: the flourish's cubes, and the left third's
  for (const c of cells) {
    if (
      heroAbove
        ? c.y - R < PHONE.fieldTop || c.y + R > FOOT
        : !openArea(c.x, c.y, R) || c.x > HERO_THIRD_X
    )
      continue;
    const { t, off } = alongFlourish(c.x, c.y),
      width = lerp(FLOURISH.width, t);
    let fade = -1;
    if (off < width && random() < lerp(FLOURISH.fill, t) * (1 - (off / width) ** 2)) fade = t;
    else if (c.x < LEFT_FIELD.x1) {
      const out = 1 - c.x / LEFT_FIELD.x1;
      if (random() < LEFT_FIELD.fill * (1 - 0.3 * out)) fade = 0.2 + 0.45 * out;
    }
    if (fade < 0) continue;
    c.base = rand(...FLOOR_H) * (1 - 0.4 * fade);
    c.r0 = FLOOR_R0 * (1 - 0.45 * fade);
    c.fade = fade;
    c.order = c.base;
  }

  // picture tiles: the big one at its slot; each medium straight beside it on a side of its own, slid a random amount
  // along that edge, all apart. And with the chosen one beside the field, a tile for it there.
  const featureCells = [];
  const slotPos = [];
  {
    const taken = new Set(),
      big = { ...FEATURE_SLOTS[0] };
    // (none on the side the chosen one is: its right beside the field, above it on a phone)
    const sides = heroAbove ? [0, 1, 2, 3] : heroBeside ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5];
    const randomLayout = () => {
      for (let attempt = 0; attempt < 400; attempt++) {
        const dirs = sides.slice().sort(() => random() - 0.5);
        const placed = [big];
        FEATURE_SLOTS.slice(1).forEach((s, k) => {
          if (placed.length !== k + 1) return;
          for (let t = 0; t < 60; t++) {
            // a side of the big one each while there are sides; then beside a medium one, outwards from the big one
            const by =
              k < dirs.length ? big : placed[1 + Math.floor(random() * (placed.length - 1))];
            const dir =
              k < dirs.length
                ? dirs[k]
                : sides.filter(
                    (d) => DIRS[d][0] * (by.x - big.x) + DIRS[d][1] * (by.y - big.y) > 0
                  )[Math.floor(random() * 3)];
            if (dir === undefined) continue;
            const m = maxLat(s.r, by);
            const p = beside(by, s.r, dir, (random() * 2 - 1) * m, EDGE_GAP);
            if (inBounds(p) && clearOfWords(p) && fits(p, placed, EDGE_GAP)) {
              placed.push(p);
              break;
            }
          }
        });
        if (placed.length === FEATURE_SLOTS.length) return placed;
      }
      return null;
    };
    const layout =
      randomLayout() ??
      FEATURE_SLOTS.map((s, k) =>
        k ? beside(big, s.r, sides[(k - 1) % sides.length], 0, EDGE_GAP) : big
      );
    FEATURE_SLOTS.forEach((s, k) => {
      const p = layout[k];
      const c = claimCell(p, taken);
      s.x = p.x;
      s.y = p.y;
      slotPos.push({ x: p.x, y: p.y, r: s.r });
      c.role = 'feature';
      c.slot = k;
      c.baseR = s.r;
      c.lift = hForRadius(s.r);
      c.order = 100 + c.lift; // picture tiles on top
      featureCells.push(c);
    });
    if (heroBeside) {
      // the chosen one's tile, beside the field from the first, shown out of its cube
      const c = claimCell({ x: HERO_TILE.x, y: HERO_TILE.y, r: 97 }, taken);
      c.role = 'feature';
      c.slot = -1;
      c.baseR = 97;
      c.lift = hForRadius(97);
      c.order = 100 + c.lift;
      c.place = { x: HERO_TILE.x, y: HERO_TILE.y, k: HERO_TILE.r / 97, big: 1 };
      c.appear = 0;
      featureCells.push(c);
    }
  }
  // which picture tile is at each place now, and which is the chosen one's, beside the field
  const cellAt = featureCells.filter((c) => c.slot >= 0);
  // (whiteField) the big tile in the middle holds the page's logo: it neither wanders nor lifts under the mouse
  if (whiteField && cellAt[0]) cellAt[0].still = true;
  // how long after the central tile starts rising the logo comes in on it, ms
  const CENTRE_LOGO_AFTER = 250;
  let heroCell = featureCells.find((c) => c.slot < 0) ?? null;

  // small white tiles: each one is put straight beside a picture tile (mostly the medium ones) with its edge almost
  // touching, at a random size and slide; it must not come close to any other tile (as on the first landing)
  function pickSmalls(avoid = new Set()) {
    const feats = slotPos.map((p) => ({ ...p }));
    const ok = (p) => inBounds(p) && clearOfWords(p);
    const out = [],
      taken = new Set([...avoid, ...cells.filter((c) => c.role === 'small')]);
    for (let tries = 0; tries < 600 && out.length < SMALL_COUNT; tries++) {
      const t =
        random() < SMALL_ON_BIG ? feats[0] : feats[1 + Math.floor(random() * (feats.length - 1))];
      const r = SMALL_R[0] + random() * (SMALL_R[1] - SMALL_R[0]);
      const p = beside(
        t,
        r,
        Math.floor(random() * 6),
        (random() * 2 - 1) * maxLat(r, t),
        SMALL_GAP
      );
      if (
        !ok(p) ||
        !fits(
          p,
          feats.filter((f) => f !== t),
          SMALL_GAP
        ) ||
        !fits(p, out, SMALL_GAP)
      )
        continue;
      out.push(p);
    }
    // the fade: round the white tiles, a few lower and smaller ones step down to the floor, outwards
    let ring = out.slice();
    for (const [r0, r1] of FADE_RINGS) {
      const next = [];
      for (const w of ring) {
        for (let t = 0, n = 0; t < 30 && n < FADE_PER; t++) {
          const r = r0 + random() * (r1 - r0);
          const p = beside(
            w,
            r,
            Math.floor(random() * 6),
            (random() * 2 - 1) * maxLat(r, w),
            SMALL_GAP
          );
          if (
            Math.hypot(p.x - feats[0].x, p.y - feats[0].y) <
            Math.hypot(w.x - feats[0].x, w.y - feats[0].y)
          )
            continue;
          if (!ok(p) || !fits(p, feats, FADE_CLEAR) || !fits(p, out, SMALL_GAP)) continue;
          out.push(p);
          next.push(p);
          n++;
        }
      }
      ring = next;
    }
    // a few tiny tiles in the spaces round the cluster, for depth, each beside a white or fade tile, outwards
    const whites = out.slice();
    for (let tries = 0, n = 0; tries < 800 && n < TINY_COUNT && whites.length; tries++) {
      const t = whites[Math.floor(random() * whites.length)];
      const r0 = TINY_R0[0] + random() * (TINY_R0[1] - TINY_R0[0]);
      const h = TINY_H[0] + random() * (TINY_H[1] - TINY_H[0]);
      const r = r0 * (1 + SCALE_PER_H * h);
      const p = beside(
        t,
        r,
        Math.floor(random() * 6),
        (random() * 2 - 1) * maxLat(r, t),
        SMALL_GAP
      );
      p.r0 = r0;
      p.h = h;
      if (!ok(p) || !fits(p, feats, FADE_CLEAR) || !fits(p, out, SMALL_GAP)) continue;
      if (
        Math.hypot(p.x - feats[0].x, p.y - feats[0].y) <
        Math.hypot(t.x - feats[0].x, t.y - feats[0].y)
      )
        continue;
      out.push(p);
      n++;
    }
    return out.map((p) => ({ c: claimCell(p, taken), r: p.r, h: p.h ?? hForRadius(p.r) }));
  }
  function applySmalls(set) {
    for (const c of cells)
      if (c.role === 'small') {
        // back down to the floor
        c.role = null;
        c.lift = 0;
        c.hoverTarget = 0;
        if (hovered === c) hovered = null; // (applySmalls only runs after the page script is done)
      }
    // (order stays as set here while the tile later sinks, so it does not pop under its neighbours on the way down)
    for (const { c, h } of set) {
      c.role = 'small';
      c.lift = h;
      c.order = h;
    }
  }

  // the example in a picture tile: `c.feature`; the one at a place, `onTile(slot)`
  const onTile = (slot) => cellAt[slot].feature;
  // A picture tile's place: its middle, how much bigger than its own size, and how far it is beside the field (0 at a
  // place in the middle .. 1 beside the field, out of its cube); on its way, along a bow, growing or shrinking evenly.
  const homeOf = (c) => c.home ?? { x: c.x, y: c.y, k: 1, big: 0 };
  const bigOf = (c) => ({ x: HERO_TILE.x, y: HERO_TILE.y, k: HERO_TILE.r / c.baseR, big: 1 });
  const slotPlace = (c, slot) => ({
    x: slotPos[slot].x,
    y: slotPos[slot].y,
    k: slotPos[slot].r / c.baseR,
    big: 0,
  });
  const moveTile = (c, now, to, ms) => {
    if (ms <= 0) {
      c.place = to;
      c.move = null;
      return;
    }
    c.move = { from: c.place ?? homeOf(c), to, start: now, ms, bow: to.big ? -BOW : BOW };
  };
  const placeOf = (c, now) => {
    const m = c.move;
    if (!m) return c.place ?? homeOf(c);
    const f = Math.min(1, Math.max(0, (now - m.start) / m.ms)),
      e = turnEase(f);
    if (f >= 1) {
      c.place = m.to;
      c.move = null;
    }
    return {
      x: m.from.x + (m.to.x - m.from.x) * e,
      y: m.from.y + (m.to.y - m.from.y) * e + m.bow * Math.sin(Math.PI * e),
      k: m.from.k * (m.to.k / m.from.k) ** e,
      big: m.from.big + (m.to.big - m.from.big) * e,
    };
  };
  const isBig = (c) => !!c.move || (c.place?.big ?? 0) > 0;
  // behind the chapters, the tiles move about on each change of chapter: each glides from where it is to a spot of
  // its own a little way off, staggered (`stir`); `shiftAt` is how far it is from its place
  const STIR = { reach: [60, 190], ms: 1400, stagger: 400 };
  const shiftAt = (c, now) => {
    const m = c.shift;
    if (!m || c.still) return [0, 0];
    const f = Math.min(1, Math.max(0, (now - m.start) / m.ms)),
      e = turnEase(f);
    return [m.from[0] + (m.to[0] - m.from[0]) * e, m.from[1] + (m.to[1] - m.from[1]) * e];
  };
  function stir() {
    const now = performance.now();
    for (const c of cells) {
      if (c.h <= 0.01) continue;
      const from = shiftAt(c, now);
      const a = random() * 2 * Math.PI,
        d = rand(...STIR.reach);
      // kept on the page, and back towards its place the further it has gone
      const tx = Math.max(-c.x + 40, Math.min(1880 - c.x, 0.4 * from[0] + d * Math.cos(a)));
      const ty = Math.max(-c.y + 60, Math.min(1010 - c.y, 0.4 * from[1] + d * Math.sin(a)));
      c.shift = { from, to: [tx, ty], start: now + random() * STIR.stagger, ms: STIR.ms };
    }
    stirredUntil = now + STIR.stagger + STIR.ms;
    kick();
  }
  let stirredUntil = 0;
  const smooth = (t, a, b) => {
    const u = Math.min(1, Math.max(0, (t - a) / (b - a)));
    return u * u * (3 - 2 * u);
  };
  // a tile drawn at a fraction of its strength: into a layer of its own, then onto the page faded
  const layer = document.createElement('canvas'),
    layerCtx = layer.getContext('2d');
  function drawFaded(alpha, x, y, r, draw) {
    if (alpha <= 0.001) return;
    if (alpha >= 0.999 || !layerCtx) {
      draw();
      return;
    }
    const reach = r + 0.8 * r + 40,
      size = Math.ceil(2 * reach * DPR);
    if (layer.width < size || layer.height < size) layer.width = layer.height = size;
    layerCtx.setTransform(1, 0, 0, 1, 0, 0);
    layerCtx.clearRect(0, 0, size, size);
    layerCtx.setTransform(DPR, 0, 0, DPR, (reach - x) * DPR, (reach - y) * DPR);
    const page = ctx;
    ctx = layerCtx;
    draw();
    ctx = page;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.drawImage(layer, 0, 0, size, size, (x - reach) * DPR, (y - reach) * DPR, size, size);
    ctx.restore();
  }
  // an example that runs to its frame's edges, faded to white towards them (`feather`), at the size it is drawn
  const featherLayer = document.createElement('canvas');
  function feathered(src, w, h) {
    const W = Math.max(1, Math.ceil(w * DPR)),
      H = Math.max(1, Math.ceil(h * DPR));
    if (featherLayer.width !== W || featherLayer.height !== H) {
      featherLayer.width = W;
      featherLayer.height = H;
    }
    const g = featherLayer.getContext('2d');
    if (!g) return src;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.drawImage(src, 0, 0, W, H);
    const r = Math.min(W, H) / 2;
    const fade = g.createRadialGradient(W / 2, H / 2, 0.72 * r, W / 2, H / 2, 1.0 * r);
    fade.addColorStop(0, 'rgba(255,255,255,0)');
    fade.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = fade;
    g.fillRect(0, 0, W, H);
    return featherLayer;
  }
  // the example itself, out of its cube: from the size it has in the cube, on its way, to its own beside the field
  function drawFree(c, at, x, y, t, alpha) {
    if (alpha <= 0.001) return;
    const index = c.feature,
      f = FEATURES[index],
      v = playback.get(index),
      src = v && v.readyState >= 2 ? v : images[index];
    if (!src) return;
    const nw = src.videoWidth || src.naturalWidth,
      nh = src.videoHeight || src.naturalHeight;
    const bounds = f.heroBounds;
    const progress = Math.min(1, Math.max(0, t));
    const sourceX = bounds ? nw * bounds.x * progress : 0;
    const sourceY = bounds ? nh * bounds.y * progress : 0;
    const sourceW = nw * (1 + ((bounds?.width ?? 1) - 1) * progress);
    const sourceH = nh * (1 + ((bounds?.height ?? 1) - 1) * progress);
    const aspect = bounds ? (nw * bounds.width) / (nh * bounds.height) : nw / nh;
    const maximumWidth =
      heroAbove && bounds ? BIG_W * bounds.width : bounds && !whiteField ? 600 : BIG_W;
    // On phones, fit the complete source rather than letting framing bounds crop its branches.
    const maximumHeight = BIG_H * (heroAbove && bounds ? bounds.height : 1);
    // (whiteField) as big as the right third lets it be, whatever the film's own size
    const full =
      Math.min(whiteField ? Infinity : f.hero * HERO_K, maximumWidth, maximumHeight * aspect) /
      (bounds ? 1.8 : 1);
    const rs = c.baseR;
    const inCube = Math.sqrt(3) * rs * at.k * f.zoom,
      inBigCube = Math.sqrt(3) * HERO_TILE.r * f.zoom;
    c.zoomStarted ??= performance.now();
    const elapsed = Math.max(0, performance.now() - c.zoomStarted);
    // (whiteField) in close from the start, held there; otherwise a slow zoom in and back out
    const zoom = !bounds
      ? 1
      : whiteField
        ? 1.8
        : reduceMotion
          ? 1
          : 1 + 0.4 * (1 - Math.cos((elapsed / 24000) * Math.PI * 2));
    const w = inCube * (full / inBigCube) ** t * (1 + (zoom - 1) * progress),
      h = (w * sourceH) / sourceW;
    ctx.save();
    ctx.globalAlpha = alpha * (c.appear ?? 1);
    ctx.globalCompositeOperation = 'multiply';
    if (whiteField && bounds) {
      // Use the framing bounds only to position/size the model. Draw the complete source
      // so fine branches outside those bounds remain visible, including over the navigation.
      const pixels = w / sourceW;
      ctx.drawImage(
        src,
        x - (sourceX + sourceW / 2) * pixels,
        y - (sourceY + sourceH / 2) * pixels,
        nw * pixels,
        nh * pixels
      );
    } else if (bounds) {
      ctx.drawImage(src, sourceX, sourceY, sourceW, sourceH, x - w / 2, y - h / 2, w, h);
    } else {
      ctx.drawImage(f.feather ? feathered(src, w, h) : src, x - w / 2, y - h / 2, w, h);
    }
    ctx.restore();
  }
  let slices = [];
  let images = [];
  let busyUntil = 0,
    started = false;
  const target = (c) =>
    started && performance.now() >= c.start ? Math.max(c.base, c.lift) + c.hover * HOVER_BOOST : 0;

  // only the picture tiles turn, in a wave from left to right; white tiles never turn
  function turnAll(now) {
    const xs = featureCells.map((c) => c.x),
      minX = Math.min(...xs),
      maxX = Math.max(...xs);
    for (const c of featureCells) {
      c.pics[1 - c.orient] = slices[c.feature];
      c.turnStart = now;
      c.turnDelay = ((c.x - minX) / Math.max(1, maxX - minX)) * FLIP_SPREAD;
    }
    busyUntil = now + FLIP_SPREAD + FLIP_DUR;
  }

  // One featured video; small tiles stay on their sharp still images.
  // (whiteField) each film stays up 8 s beside the field: its whole film, not the 3 s teaser looping
  let fullVideos = whiteField;
  const playback = createLandingPlayback(FEATURES, kick);
  let paintedIndex = -1;
  let paintedTime = -1;
  function runVideos() {
    const index = heroCell?.feature ?? initialIndex;
    const video = playback.update(
      index,
      visible && !reduceMotion && !backdrop && started,
      fullVideos
    );
    if (paintedIndex !== index && paintedIndex >= 0 && images[paintedIndex]) {
      paintSlice(slices[paintedIndex], FEATURES[paintedIndex], images[paintedIndex]);
      paintedTime = -1;
    }
    paintedIndex = index;
    if (video && slices[index] && video.readyState >= 2 && paintedTime !== video.currentTime) {
      paintSlice(slices[index], FEATURES[index], video);
      paintedTime = video.currentTime;
    }
    return Boolean(video);
  }

  // ---------- (whiteField) lines in the logo's blue, radiating from the central tile ----------
  // A tree: from the central tile out to a few tiles round it, from each of those on out to one or two further from
  // the middle, and so on; and a few lines across between tiles of it. Drawn over the tiles once they are up, one
  // after another outwards: a dot at the middle of a tile, the line running out, a dot at the middle of the other;
  // a word under the dot on each tile it reaches (placeholders for now). From the central tile the lines start at
  // its rim, clear of the logo on it.
  const LINKS = {
    // the lines and their dots hidden for now (user): the tiles they reach still come in one after another outwards,
    // each with its icon and word
    lines: false,
    colour: '#002766',
    text: '#13306f',
    width: 1.4,
    alpha: 0.85,
    dot: 3.5,
    // (and none leaving it within `side` degrees of level, where the logo reaches out to its sides)
    first: { count: 6, reach: [190, 430], spread: 45, side: 30 }, // tiles joined to the central one; degrees apart at least
    out: { reach: [120, 420], cone: 70, gain: 50, depth: 3, most: 18, two: 0.6 }, // further out: within `cone` degrees of
    // straight out, `gain` px further from the middle at least; `depth` steps out; `most` tiles in all
    across: 3, // lines across between tiles of the tree
    fieldX1: heroAbove ? PHONE.x1 : 1290, // none reaching into the films' third
    fieldY: heroAbove ? [PHONE.fieldTop, FOOT] : [100, 850], // nor up to the top bar or down to the chapters along the foot
    words: { x0: 0, x1: heroAbove ? 0 : 650, y0: 200, y1: 700 }, // nothing over the logo, the slogan and the way in
    after: 100, // Bring the capability icons in as soon as the central tile rises.
    draw: 420, // ms for a line to run out
    gap: 60, // ms between one line and those going on from where it ends
    fade: 350, // ms for a tile's icon and word to come in
    step: 120, // (lines hidden) ms between one tile's icon and word and the next one out
    icon: 30, // px
    iconUp: 14, // px the icon's middle is above the tile's
    // (lines hidden) a word only on a tile big enough for it, and well apart from the next word
    labelTile: heroAbove ? 52 : 58, // px, the tile's size at rest (middle to corner) at least
    labelApart: heroAbove ? 140 : 170, // px between the middles of two tiles with words
    labels: heroAbove ? 4 : 14, // (lines hidden) how many tiles get one
  };
  // (with the lines) the words; without them, the subjects, more than there are tiles for them: those not shown wait
  // their turn, a few tiles at a time turning over to one of them (as the information pages' tiles turn over)
  const SUBJECTS = {
    swap: 3200, // ms between one lot of tiles turning over and the next
    count: 2, // how many turn over at a time
    stagger: 180, // ms between them
    icon: 46, // px, the icon on a tile at rest
    gap: 6, // px between the icon and its word
    word: 15, // px
    centre: 2, // times bigger on the central tile
    // which way every turn goes (user: always the same way): true = the new subject comes in from the top, the old
    // one rolling down and away; false = the other way
    down: true,
  };
  const centralSubjects = [
    'Explore',
    'Build',
    'Simulate',
    'Analyze',
    'Notebooks',
    'Workflows',
    'Flywire',
    'Brain Regions',
    'Multi-Species',
    'Traces',
  ];
  let centralWaiting = [];
  let nextCentralSwap = Infinity;
  const nextCentralSubject = (current) => {
    if (!centralWaiting.length) {
      centralWaiting = centralSubjects.slice();
      for (let i = centralWaiting.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [centralWaiting[i], centralWaiting[j]] = [centralWaiting[j], centralWaiting[i]];
      }
      if (centralWaiting[0] === current) centralWaiting.push(centralWaiting.shift());
    }
    return centralWaiting[0];
  };
  let waiting = []; // subjects not on a tile now, in the order they come
  let nextSwap = Infinity;
  let subjectPool = []; // (lines hidden) the tiles a subject may turn up on: big enough, in the field, clear of the words
  const LINK_WORDS = [
    'Explore',
    'Model',
    'Brain Regions',
    'FlyWire',
    'EM Meshes',
    'Single Neuron',
    'Simulate',
    'Circuits',
    'Morphologies',
    'Ion Channels',
    'Synapses',
    'Connectome',
    'Notebooks',
    'Microcircuit',
    'Spines',
    'Virtual Labs',
  ];
  let links = null; // [{ a, b, start, fromRim }]
  let linksAt = Infinity; // when the first line starts (performance.now())
  const linkWords = new Map(); // tile -> its word
  const labelAt = new Map(); // (lines hidden) tile -> when its icon and word come in, ms after `linksAt`
  let linkFont = null;
  let subjectFont = null;
  const linkIcons = new Map(
    LANDING_SUBJECTS.map(({ word, icon }) => {
      const img = new Image();
      img.src = icon;
      return [word, img];
    })
  );
  const restR = (c) => (c.r0 || R) * (1 + SCALE_PER_H * Math.max(c.base, c.lift));
  // how far up a tile has come, 0 .. 1
  const risen = (c) => Math.min(1, Math.max(0, c.h / Math.max(0.05, Math.max(c.base, c.lift))));
  const inWords = (x, y) =>
    x > LINKS.words.x0 && x < LINKS.words.x1 && y > LINKS.words.y0 && y < LINKS.words.y1;
  const crossesWords = (p, q) => {
    for (let k = 0; k <= 20; k++)
      if (inWords(p.x + ((q.x - p.x) * k) / 20, p.y + ((q.y - p.y) * k) / 20)) return true;
    return false;
  };
  const angleOf = (p, q) => Math.atan2(q.y - p.y, q.x - p.x);
  const turn = (u, v) => {
    const d = Math.abs(u - v) % (2 * Math.PI);
    return ((d > Math.PI ? 2 * Math.PI - d : d) * 180) / Math.PI;
  };
  function makeLinks() {
    const root = cellAt[0];
    if (!root) return [];
    const centre = homeOf(root);
    const pool = cells.filter((c) => {
      if (!c.role || c.under || c === heroCell || c === root || Math.max(c.base, c.lift) <= 0.05)
        return false;
      const p = homeOf(c);
      return (
        p.x < LINKS.fieldX1 &&
        p.y > LINKS.fieldY[0] &&
        p.y < LINKS.fieldY[1] &&
        !inWords(p.x, p.y) &&
        (heroAbove || p.x - Math.max(restR(c), LINKS.labelTile) >= LINKS.words.x1)
      );
    });
    const used = new Set([root]),
      made = [];
    const fromRoot = (c) => Math.hypot(homeOf(c).x - centre.x, homeOf(c).y - centre.y);
    const join = (a, b, depth, fromRim = false) => {
      used.add(b);
      made.push({ a, b, depth, fromRim });
    };
    // round the central tile, well apart from each other
    const firsts = [];
    for (const c of pool
      .filter((c) => fromRoot(c) >= LINKS.first.reach[0] && fromRoot(c) <= LINKS.first.reach[1])
      .sort(() => random() - 0.5)) {
      if (firsts.length >= LINKS.first.count) break;
      const a = angleOf(centre, homeOf(c));
      if (firsts.some((f) => turn(angleOf(centre, homeOf(f)), a) < LINKS.first.spread)) continue;
      if (crossesWords(centre, homeOf(c))) continue;
      const level = Math.min(turn(a, 0), turn(a, Math.PI));
      if (level < LINKS.first.side) continue;
      firsts.push(c);
      join(root, c, 0, true);
    }
    // on out from each, away from the middle
    let ring = firsts;
    for (let depth = 1; depth <= LINKS.out.depth && used.size <= LINKS.out.most; depth++) {
      const next = [];
      for (const parent of ring) {
        const pp = homeOf(parent),
          outward = angleOf(centre, pp);
        const options = pool
          .filter((c) => !used.has(c))
          .filter((c) => {
            const d = Math.hypot(homeOf(c).x - pp.x, homeOf(c).y - pp.y);
            return (
              d >= LINKS.out.reach[0] &&
              d <= LINKS.out.reach[1] &&
              fromRoot(c) >= fromRoot(parent) + LINKS.out.gain &&
              turn(angleOf(pp, homeOf(c)), outward) <= LINKS.out.cone &&
              !crossesWords(pp, homeOf(c))
            );
          })
          .sort(() => random() - 0.5);
        const want = random() < LINKS.out.two ? 2 : 1;
        for (const c of options.slice(0, want)) {
          if (used.size > LINKS.out.most) break;
          join(parent, c, depth);
          next.push(c);
        }
      }
      ring = next;
    }
    // a few across, between tiles of the tree not yet joined, near each other
    const tree = [...used].filter((c) => c !== root);
    const joined = (a, b) => made.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
    const pairs = [];
    for (let i = 0; i < tree.length; i++)
      for (let j = i + 1; j < tree.length; j++) {
        const a = tree[i],
          b = tree[j],
          d = Math.hypot(homeOf(a).x - homeOf(b).x, homeOf(a).y - homeOf(b).y);
        if (
          d >= LINKS.out.reach[0] &&
          d <= 300 &&
          !joined(a, b) &&
          !crossesWords(homeOf(a), homeOf(b))
        )
          pairs.push({ a, b, d });
      }
    pairs.sort(() => random() - 0.5);
    const deepest = Math.max(0, ...made.map((l) => l.depth));
    for (const { a, b } of pairs.slice(0, LINKS.across))
      made.push({ a, b, depth: deepest + 1, fromRim: false });
    // a word for each tile reached (with the lines hidden, only on those big enough and apart), each its own
    const centralFirst = nextCentralSubject();
    const words = (
      LINKS.lines
        ? LINK_WORDS
        : LANDING_SUBJECTS.map((s) => s.word).filter((word) => word !== centralFirst)
    )
      .slice()
      .sort(() => random() - 0.5);
    const labelled = [];
    // (lines hidden) any of the field's tiles, the nearest the middle first, and so on outwards
    const reach = LINKS.lines
      ? made.slice().sort((u, v) => u.depth - v.depth)
      : pool
          .slice()
          .sort((u, v) => fromRoot(u) - fromRoot(v))
          .map((b) => ({ b }));
    for (const link of reach) {
      const c = link.b;
      if (!LINKS.lines && labelled.length >= LINKS.labels) break;
      if (linkWords.has(c) || labelled.includes(c)) continue;
      if (!LINKS.lines) {
        if (restR(c) < LINKS.labelTile) continue;
        const p = homeOf(c);
        if (
          labelled.some(
            (other) => Math.hypot(homeOf(other).x - p.x, homeOf(other).y - p.y) < LINKS.labelApart
          )
        )
          continue;
      }
      labelled.push(c);
    }
    // Fill existing blank tiles more closely so every desktop capability stays visible.
    // Keep the main arrangement and the surrounding decorative tiles intact.
    if (!heroAbove && !LINKS.lines && labelled.length < LANDING_SUBJECTS.length - 1) {
      for (const spacing of [145, 125, 105]) {
        for (const { b: c } of reach) {
          if (labelled.length >= LANDING_SUBJECTS.length - 1) break;
          if (labelled.includes(c) || restR(c) < 52) continue;
          const p = homeOf(c);
          if (
            labelled.some(
              (other) => Math.hypot(homeOf(other).x - p.x, homeOf(other).y - p.y) < spacing
            )
          )
            continue;
          labelled.push(c);
        }
        if (labelled.length >= LANDING_SUBJECTS.length - 1) break;
      }
    }
    if (!heroAbove && !LINKS.lines) {
      // Complete the compact cluster rather than making visitors wait for missing subjects.
      // Empty decorative tiles remain underneath; the overlap guard clears them around icons.
      const taken = new Set(cells.filter((c) => c.role));
      for (const radius of [60, 54, 48, 42]) {
        const candidates = [];
        for (let y = 120; y <= 810; y += 25)
          for (let x = LINKS.words.x1 + radius + 14; x <= 1210; x += 25)
            candidates.push({ x, y, r: radius });
        candidates.sort(
          (a, b) =>
            Math.hypot(a.x - centre.x, a.y - centre.y) - Math.hypot(b.x - centre.x, b.y - centre.y)
        );
        for (const p of candidates) {
          if (labelled.length >= LANDING_SUBJECTS.length - 1) break;
          const occupied = [root, ...labelled].map((c) => ({ ...homeOf(c), r: restR(c) }));
          if (!fits(p, occupied, 12)) continue;
          const c = claimCell(p, taken);
          c.role = 'small';
          c.base = 0;
          c.lift = hForRadius(radius);
          c.order = c.lift;
          c.start = 0;
          c.under = false;
          labelled.push(c);
        }
      }
    }
    if (heroAbove && !LINKS.lines) {
      // Frame the phone model on both sides, rather than putting its icons in a row below.
      root.home = { x: 600, y: 335, k: 1, big: 0 };
      const positions = [
        { x: 650, y: 110 },
        { x: 1240, y: 110 },
        { x: 650, y: 580 },
        { x: 1240, y: 580 },
      ];
      labelled.forEach((c, i) => {
        c.home = { ...positions[i], k: 1, big: 0 };
        c.still = true;
        c.iconSlot = true;
      });
      root.iconSlot = true;
    }
    // the central tile too, first, the others then on outwards from it (user)
    if (!LINKS.lines) labelled.unshift(root);
    labelled.forEach((c, i) => {
      linkWords.set(
        c,
        !LINKS.lines && c === root
          ? centralFirst
          : words[(i - (LINKS.lines ? 0 : 1)) % words.length]
      );
      labelAt.set(c, i * LINKS.step);
    });
    waiting = words.slice(labelled.length - (LINKS.lines ? 0 : 1));
    subjectPool = heroAbove
      ? labelled.filter((c) => c !== root)
      : [
          ...new Set([
            ...labelled.filter((c) => c !== root),
            ...pool.filter((c) => restR(c) >= LINKS.labelTile),
          ]),
        ];
    // one after another outwards: each line starts as the one it goes on from has run out
    const ends = new Map([[root, 0]]);
    for (const l of made.sort((u, v) => u.depth - v.depth)) {
      l.start = (ends.get(l.a) ?? (LINKS.draw + LINKS.gap) * l.depth) + random() * 120;
      const end = l.start + LINKS.draw + LINKS.gap;
      if (!ends.has(l.b) || ends.get(l.b) > end) ends.set(l.b, end);
    }
    return made;
  }
  // a subject's picture for a tile: its icon over its word, at the tile's own size at rest (it grows with the tile)
  const subjectSlices = new Map();
  function subjectSlice(c, word) {
    const key = `${cells.indexOf(c)}:${word}`;
    let slice = subjectSlices.get(key);
    if (slice) return slice;
    // not before its icon is in: the tile waits for it
    const icon = linkIcons.get(word);
    if (!icon?.complete || !icon.naturalWidth) return null;
    const r = restR(c),
      k = 2,
      z = c === cellAt[0] ? SUBJECTS.centre : 1,
      w = Math.sqrt(3) * r,
      h = 2 * r;
    slice = document.createElement('canvas');
    slice.width = Math.ceil(w * k);
    slice.height = Math.ceil(h * k);
    const g = slice.getContext('2d');
    if (!g) return null;
    g.setTransform(k, 0, 0, k, 0, 0);
    // white under it: a see-through face let the old subject show through the new one to the end of the turn,
    // then vanish at once (user)
    g.fillStyle = '#fff';
    g.fillRect(0, 0, w, h);
    subjectFont ??= getComputedStyle(canvas).fontFamily || 'Arial, sans-serif';
    const icon_ = SUBJECTS.icon * z,
      gap = SUBJECTS.gap * z,
      size = SUBJECTS.word * z;
    const top = h / 2 - (icon_ + gap + size) / 2;
    g.drawImage(icon, w / 2 - icon_ / 2, top, icon_, icon_);
    g.font = `600 ${size}px ${subjectFont}`;
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.fillStyle = LINKS.text;
    const textWidth = g.measureText(word).width;
    if (textWidth > w - 12) g.font = `600 ${size * ((w - 12) / textWidth)}px ${subjectFont}`;
    g.fillText(word, w / 2, top + icon_ + gap);
    subjectSlices.set(key, slice);
    return slice;
  }
  // turn tile c over to a subject (or, without motion, show it at once)
  // (no word: turn it over to plain white)
  function turnTo(c, word, now, delay = 0) {
    const slice = word ? subjectSlice(c, word) : null;
    if (word && !slice) return;
    c.subject = word || null;
    c.introduced = true;
    if (reduceMotion) {
      c.pics[c.orient] = slice;
      return;
    }
    // always the same way round: the turn runs from face `from` (what shows now) to the other (the new subject)
    const from = SUBJECTS.down ? 0 : 1;
    c.pics[from] = c.pics[c.orient];
    c.pics[1 - from] = slice;
    c.orient = from;
    c.turnStart = now;
    c.turnDelay = delay;
    c.turnDur = FLIP_DUR;
  }
  // (lines hidden) the subjects coming in on their tiles from the middle outwards, each tile turning over to its own
  // as it is up; then, every SUBJECTS.swap, a few tiles turning over to subjects not shown, the number shown the same
  function runSubjects(now) {
    links ??= makeLinks();
    if (now < linksAt) return linksAt < Infinity;
    const t = reduceMotion ? Infinity : now - linksAt;
    let running = false,
      allIn = true;
    for (const [c, at] of labelAt) {
      if (c.introduced) continue;
      allIn = false;
      if (t < at || (!reduceMotion && risen(c) < 0.9)) {
        running = true;
        continue;
      }
      turnTo(c, linkWords.get(c), now);
      if (c === cellAt[0] && c.introduced) {
        centralWaiting.shift();
        nextCentralSwap = now + SUBJECTS.swap;
      }
    }
    const root = cellAt[0];
    if (
      allIn &&
      !reduceMotion &&
      root?.introduced &&
      root.turnStart < 0 &&
      now >= nextCentralSwap
    ) {
      const next = nextCentralSubject(root.subject);
      const partner = subjectPool.find((c) => c.subject === next);
      if (
        subjectSlice(root, next) &&
        (!partner || (partner.turnStart < 0 && subjectSlice(partner, root.subject)))
      ) {
        const previous = root.subject;
        turnTo(root, next, now);
        if (partner) {
          // Exchange the two subjects so the desktop keeps all fifteen unique icons visible.
          turnTo(partner, previous, now);
        } else {
          const waitingIndex = waiting.indexOf(next);
          if (waitingIndex >= 0) waiting.splice(waitingIndex, 1, previous);
        }
        centralWaiting.shift();
        nextCentralSwap = now + SUBJECTS.swap;
      }
    }
    if (allIn && !reduceMotion && waiting.length) {
      if (nextSwap === Infinity) nextSwap = now + SUBJECTS.swap;
      else if (now >= nextSwap) {
        nextSwap = now + SUBJECTS.swap;
        swapSubjects(now);
      }
    }
    return running;
  }

  // a few random tiles turning over at once, as many showing a subject after as before (user): a tile with one to
  // another subject, or one going white as a white one somewhere else takes a subject up; the central tile always
  // keeps one
  function swapSubjects(now) {
    const root = cellAt[0];
    const idle = (c) => c.turnStart < 0 && risen(c) >= 0.9;
    const shown = subjectPool.filter((c) => c.subject);
    if (root?.subject) shown.push(root);
    // The centre has its own capability-only rotation, never the general subject pool.
    const apart = (c, others) => {
      const p = homeOf(c);
      return others.every(
        (o) => o === c || Math.hypot(homeOf(o).x - p.x, homeOf(o).y - p.y) >= LINKS.labelApart
      );
    };
    const pick = (list) => list[Math.floor(random() * list.length)];
    let k = 0;
    for (let n = 0; n < SUBJECTS.count; n++) {
      const on = shown.filter((c) => c !== root && idle(c));
      const hideable = on.filter((c) => c !== root);
      // white tiles clear of the others showing one (the one going white aside)
      const out = random() < 0.5 && hideable.length ? pick(hideable) : null;
      const blanks = subjectPool.filter(
        (c) =>
          !c.subject &&
          idle(c) &&
          apart(
            c,
            shown.filter((o) => o !== out)
          )
      );
      const into = out && blanks.length ? pick(blanks) : null;
      if (into && waiting[0] && subjectSlice(into, waiting[0])) {
        waiting.push(out.subject);
        turnTo(out, null, now, k * SUBJECTS.stagger);
        const next = waiting.shift();
        turnTo(into, next, now, k * SUBJECTS.stagger + SUBJECTS.stagger / 2);
        shown.splice(shown.indexOf(out), 1, into);
      } else {
        const c = pick(on);
        const next = waiting[0];
        if (!c || !next || !subjectSlice(c, next)) continue;
        waiting.shift();
        waiting.push(c.subject);
        turnTo(c, next, now, k * SUBJECTS.stagger);
      }
      k++;
    }
  }

  // where a tile's middle is now (as it wanders)
  const middleOf = (c, now) => {
    const p = c.role === 'feature' ? placeOf(c, now) : homeOf(c);
    const [dx, dy] = driftAt(c, now);
    const [sx, sy] = shiftAt(c, now);
    return [p.x + dx + sx, p.y + dy + sy];
  };
  // draws the lines as far as they have run out by `now`; true while any is still running out
  function drawLinks(now) {
    links ??= makeLinks();
    if (!links.length || now < linksAt) return now < linksAt && linksAt < Infinity;
    linkFont ??= `600 16px ${getComputedStyle(canvas).fontFamily || 'Arial, sans-serif'}`;
    const t = reduceMotion ? Infinity : now - linksAt;
    let running = false;
    const dot = (x, y) => {
      ctx.beginPath();
      ctx.arc(x, y, LINKS.dot, 0, 2 * Math.PI);
      ctx.fill();
    };
    const reached = new Map(); // tile -> how far its dot and word have come in, 0 .. 1
    // (lines hidden) one tile after another outwards, each once it is up
    if (!LINKS.lines)
      for (const [c, at] of labelAt) {
        if (!reduceMotion && risen(c) < 0.9) {
          for (const [o, oat] of labelAt) if (oat >= at) labelAt.set(o, oat + 16);
          running = true;
          break;
        }
        const k = reduceMotion ? 1 : Math.min(1, (t - at) / LINKS.fade);
        if (k < 1) running = true;
        if (k > 0) reached.set(c, k);
      }
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle = LINKS.colour;
    ctx.lineWidth = LINKS.width;
    ctx.lineCap = 'round';
    ctx.globalAlpha = LINKS.alpha;
    for (const l of LINKS.lines ? links : []) {
      const f = Math.min(1, Math.max(0, (t - l.start) / LINKS.draw));
      if (f < 1 && t >= l.start - 50) running = true;
      if (t < l.start) {
        if (t < Infinity) running = true;
        continue;
      }
      // not before both its tiles are up: it waits for them, and those going on from it with it
      if (!reduceMotion && (risen(l.a) < 0.9 || risen(l.b) < 0.9)) {
        const wait = t + 16 - l.start;
        for (const later of links) if (later.start >= l.start) later.start += wait;
        running = true;
        continue;
      }
      const e = f * f * (3 - 2 * f);
      let [ax, ay] = middleOf(l.a, now);
      const [bx, by] = middleOf(l.b, now);
      if (l.fromRim) {
        // from the central tile's rim, clear of the logo
        const r = restR(l.a) * APO * 0.94,
          d = Math.hypot(bx - ax, by - ay) || 1;
        ax += ((bx - ax) / d) * r;
        ay += ((by - ay) / d) * r;
      }
      if (LINKS.lines) {
        dot(ax, ay);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax + (bx - ax) * e, ay + (by - ay) * e);
        ctx.stroke();
      }
      if (f >= 1) {
        const k = reduceMotion ? 1 : Math.min(1, (t - l.start - LINKS.draw) / LINKS.fade);
        if (k < 1) running = true;
        reached.set(l.b, Math.max(reached.get(l.b) ?? 0, k));
      }
    }
    // the dots the lines end on, and the words under them, coming in as a line gets there
    ctx.font = linkFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const [c, k] of reached) {
      const [x, y] = middleOf(c, now);
      if (LINKS.lines) dot(x, y);
      const word = linkWords.get(c);
      if (!word || k <= 0) continue;
      ctx.save();
      ctx.globalAlpha = k * k * (3 - 2 * k);
      // its icon over the tile's middle, its word under it
      const icon = linkIcons.get(word);
      const top = LINKS.lines ? y + LINKS.dot + 7 : y + LINKS.icon / 2 - LINKS.iconUp + 6;
      if (icon?.complete && icon.naturalWidth)
        ctx.drawImage(
          icon,
          x - LINKS.icon / 2,
          y - LINKS.iconUp - LINKS.icon / 2,
          LINKS.icon,
          LINKS.icon
        );
      if (LINKS.lines) {
        // a white edge round its letters: readable over a line going on from the tile
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.strokeText(word, x, top);
      }
      ctx.fillStyle = LINKS.text;
      ctx.fillText(word, x, top);
      ctx.restore();
    }
    ctx.restore();
    return running;
  }

  // (whiteField) the film beside the field changing: the one going fades out, then the next fades in
  const FADE_OUT = 450,
    FADE_IN = 650;
  let heroFade = null; // { from, start }
  // how much of the chosen one's film shows now; a film going out drawn from `outOf` (the chosen one, as it was)
  function heroAlpha(now) {
    if (!heroFade) return 1;
    const f = (now - heroFade.start - FADE_OUT) / FADE_IN;
    if (f >= 1) {
      heroFade = null;
      return 1;
    }
    return f <= 0 ? 0 : f * f * (3 - 2 * f);
  }

  // (whiteField) the tiles lying under a picture tile, where they stand at rest: never drawn, decided once
  let underDecided = false;
  function decideUnder() {
    underDecided = true;
    const tops = featureCells.filter((f) => f !== heroCell);
    for (const c of cells) {
      if (c.role === 'feature') continue;
      const p = homeOf(c);
      c.under = tops.some((f) => Math.hypot(homeOf(f).x - p.x, homeOf(f).y - p.y) < f.baseR);
    }
  }

  let lastNow = 0;
  function render(now) {
    const dt = lastNow ? Math.min(50, now - lastNow) : 16.7;
    lastNow = now;
    const k = 1 - (1 - EASE) ** (dt / 16.7); // EASE per 60 fps frame
    // drifting tiles and playing videos keep the loop going
    const playing = runVideos(now);
    let active = playing || (started && !reduceMotion) || now < stirredUntil || !!heroFade;

    const kLift = 1 - (1 - LIFT_EASE) ** (dt / 16.7); // slower rise for the first lift from the floor
    for (const c of cells) {
      c.hover += (c.hoverTarget - c.hover) * Math.min(1, k * 1.5);
      const turning = c.turnStart >= 0;
      const tg = target(c);
      if (!c.lifted && started && now >= c.start && Math.abs(tg - c.h) < 0.01) c.lifted = true;
      // first open: a short while after a picture tile starts rising, it turns from white to its picture
      if (c.introPending && started && now >= c.start + INTRO_TURN_DELAY) {
        c.introPending = false;
        c.introTurn = true;
        c.turnStart = now;
        c.turnDelay = 0;
        c.turnDur = INTRO_FLIP_DUR;
      }
      if (c.move) active = true;
      if (c.appearTween) {
        const f = Math.min(1, Math.max(0, (now - c.appearTween.start) / c.appearTween.ms));
        c.appear = f * f * (3 - 2 * f);
        if (f >= 1) c.appearTween = null;
        active = true;
      }
      if (c.introTurn) {
        // first turn: the height is tied to the turn, rising from the floor to full size as the cube rotates
        const f = Math.min(1, Math.max(0, (now - c.turnStart) / c.turnDur));
        c.h = tg * turnEase(f);
      } else if (!turning) {
        // height holds while turning (as on index.html)
        c.h += (tg - c.h) * (reduceMotion ? 1 : c.lifted ? k : kLift);
      }
      // shine position = how far the tile is through its current move (0 at the start, 1 when there), so the
      // band always sweeps forward once, for any tile size and for going up or down
      // (the goal uses the hover *target*: the eased hover would move the goal a little every frame)
      const goal =
        started && now >= c.start ? Math.max(c.base, c.lift) + c.hoverTarget * HOVER_BOOST : 0;
      if (Math.abs(goal - (c.moveTo ?? 0)) > 1e-4) {
        // a move caused only by the mouse (resting height unchanged) gets the softer hover shine
        c.hoverMove = c.lastLift === c.lift && c.lastHover !== c.hoverTarget;
        c.moveFrom = c.h;
        c.moveTo = goal;
        c.lastLift = c.lift;
        c.lastHover = c.hoverTarget;
      }
      const span = (c.moveTo ?? 0) - (c.moveFrom ?? 0);
      c.shineX = Math.abs(span) > 1e-3 ? Math.min(1, Math.max(0, (c.h - c.moveFrom) / span)) : 1;
      const speed = (Math.abs(c.h - c.prevH) * 16.7) / dt;
      c.prevH = c.h;
      const tgt = Math.min(1, Math.max(0, (speed - 0.001) * MOTION_GAIN));
      // shine strength follows the speed with a soft attack (no sudden jumps) and a slow release
      c.motion = reduceMotion
        ? 0
        : tgt > c.motion
          ? c.motion + (tgt - c.motion) * (1 - (1 - MOTION_ATTACK) ** (dt / 16.7))
          : c.motion * MOTION_DECAY ** (dt / 16.7);
      if (
        turning ||
        c.motion > 0.02 ||
        Math.abs(target(c) - c.h) > 0.0005 ||
        Math.abs(c.hoverTarget - c.hover) > 0.002 ||
        (started && now < c.start)
      )
        active = true;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // fixed stacking order (as on index.html): by each tile's resting height, set when it is placed, so hover,
    // growing and shrinking never change which tile lies on top
    // (a tile on its way to or from the big cube, or in it, over all the rest)
    // (whiteField) the bigger a tile is now, the higher it stands, so the more on top: a tile grown under the mouse
    // goes over its smaller neighbours (the film beside the field over everything)
    const sizeNow = (c) =>
      isBig(c) ? Infinity : radiusOf(c) * (c.role === 'feature' ? placeOf(c, now).k : 1);
    const drawn = cells
      .filter((c) => c.h > 0.01 || c.turnStart >= 0)
      .sort((a, b) =>
        whiteField
          ? sizeNow(a) - sizeNow(b) || (a.order || 0) - (b.order || 0)
          : (isBig(a) ? 300 : a.order || 0) - (isBig(b) ? 300 : b.order || 0)
      );
    if (whiteField && started && !underDecided) decideUnder();
    if (whiteField && started && !LINKS.lines && runSubjects(now)) active = true;
    const geometry = drawn.map((c) => {
      const at = c.role === 'feature' ? placeOf(c, now) : homeOf(c);
      const [dx, dy] = driftAt(c, now);
      const [sx, sy] = shiftAt(c, now);
      return { c, x: at.x + dx + sx, y: at.y + dy + sy, r: radiusOf(c) * at.k };
    });
    const phoneIcons = heroAbove ? geometry.filter((tile) => tile.c.iconSlot) : [];
    for (const tile of geometry) {
      tile.c.displayRadius = tile.r;
      if (
        heroAbove &&
        whiteField &&
        !tile.c.iconSlot &&
        tile.c !== heroCell &&
        phoneIcons.some((icon) => fitRadius(tile.x, tile.y, icon, 12) < tile.r)
      ) {
        tile.c.displayRadius = 0;
        continue;
      }
      if (whiteField && !heroAbove && (tile.c.subject || linkWords.has(tile.c))) {
        const c = tile.c;
        const f =
          c.turnStart < 0
            ? 0
            : Math.min(1, Math.max(0, (now - c.turnStart - c.turnDelay) / (c.turnDur || FLIP_DUR)));
        const p = c.turnStart < 0 ? c.orient : c.orient === 0 ? turnEase(f) : 1 - turnEase(f);
        tile.c.displayRadius = Math.min(
          tile.c.displayRadius,
          Math.max(0, (tile.x - LINKS.words.x1) / footprintAt(p)[0])
        );
      }
      // (whiteField) as laid out, not as they wander and grow: a tile does not come and go on its own
      if (whiteField) {
        if (tile.c.under) tile.c.displayRadius = 0;
        continue;
      }
      if (tile.c.role === 'feature') continue;
      for (const other of geometry) {
        if (tile === other) continue;
        const distance = Math.hypot(tile.x - other.x, tile.y - other.y);
        // Keeping both centres beyond the other's circumradius bounds overlap to half a face.
        if (other.c.role === 'feature' && distance < other.r) {
          tile.c.displayRadius = 0;
          break;
        }
        tile.c.displayRadius = Math.min(tile.c.displayRadius, distance);
      }
    }
    if (whiteField) {
      const tiles = geometry.filter((tile) => tile.c !== heroCell && tile.c.displayRadius > 0);
      const radii = limitTileOverlap(
        tiles.map((tile) => ({
          x: tile.x,
          y: tile.y,
          r: tile.c.displayRadius,
          priority: tile.c === cellAt[0] ? 3 : tile.c.subject || linkWords.has(tile.c) ? 2 : 0,
          supports: (() => {
            const c = tile.c;
            const f =
              c.turnStart < 0
                ? 0
                : Math.min(
                    1,
                    Math.max(0, (now - c.turnStart - c.turnDelay) / (c.turnDur || FLIP_DUR))
                  );
            const p = c.turnStart < 0 ? c.orient : c.orient === 0 ? turnEase(f) : 1 - turnEase(f);
            return footprintAt(p);
          })(),
        }))
      );
      tiles.forEach((tile, index) => {
        const icon = tile.c.subject || linkWords.has(tile.c);
        // Preserve the original empty tile proportions instead of turning them into tiny fragments.
        tile.c.displayRadius = icon
          ? radii[index]
          : radii[index] >= tile.c.displayRadius - 0.01
            ? tile.c.displayRadius
            : 0;
      });
    }
    for (const c of drawn) {
      let p = c.orient;
      if (c.turnStart >= 0) {
        const f = (now - c.turnStart - c.turnDelay) / (c.turnDur || FLIP_DUR);
        if (f >= 1) {
          c.orient = 1 - c.orient;
          c.turnStart = -1;
          p = c.orient;
          c.introTurn = false;
          c.turnDur = 0;
        } else p = c.orient === 0 ? (f <= 0 ? 0 : turnEase(f)) : 1 - (f <= 0 ? 0 : turnEase(f));
      }
      if (c.h <= 0.01 || c.displayRadius <= 0.01) continue;
      const rs = c.role === 'feature' ? c.baseR : radiusOf(c);
      const at = c.role === 'feature' ? placeOf(c, now) : homeOf(c);
      const [dx, dy] = driftAt(c, now);
      const [sx, sy] = shiftAt(c, now);
      const ox = dx + sx,
        oy = dy + sy;
      const draw = () =>
        drawTile(
          at.x + ox,
          at.y + oy,
          c.displayRadius,
          rs * at.k,
          p,
          c.pics[0],
          c.pics[1],
          Math.min(1.2, c.h),
          c.shineX ?? 1,
          c.motion * (c.hoverMove ? HOVER_SHINE : 1),
          c.role === 'feature' ? SHADE_PICTURE : SHADE_WHITE,
          // lighter along the flourish, as it fades out
          1 - 0.45 * (c.fade || 0),
          whiteField && !(at.big > 0) ? tileShadowAlpha(c.displayRadius) : 0
        );
      // on its way to the ring's middle its cube melts away from round the example, which is left there on its own
      const t = c.role === 'feature' && heroBeside ? at.big : 0;
      if (t <= 0.001) draw();
      else {
        const free = smooth(t, 0.15, 0.85);
        drawFaded(1 - free, at.x + ox, at.y + oy, radiusOf(c) * at.k, draw);
        if (c === heroCell && heroFade) {
          const out = 1 - Math.min(1, Math.max(0, (now - heroFade.start) / FADE_OUT));
          if (out > 0) drawFree(heroFade.outOf, at, at.x + ox, at.y + oy, t, free * out * out);
        }
        drawFree(c, at, at.x + ox, at.y + oy, t, free * (c === heroCell ? heroAlpha(now) : 1));
      }
    }
    // over the tiles, once they are up, the lines radiating from the central tile
    if (whiteField && started && LINKS.lines && drawLinks(now)) active = true;
    return active;
  }
  let looping = false;
  function loop(now) {
    if (disposed || !visible) {
      looping = false;
      return;
    }
    // 30 fps is enough for this slow artwork; avoid redrawing every 60/120 Hz display tick.
    if (lastNow && now - lastNow < 1000 / 30 - 1) {
      requestFrame(loop);
      return;
    }
    const active = render(now);
    if (active) requestFrame(loop);
    else {
      looping = false;
      lastNow = 0;
    }
  }
  function kick() {
    if (!disposed && visible && !looping) {
      looping = true;
      requestFrame(loop);
    }
  }

  function showFeature(index) {
    if (!disposed) onSelect(index);
  }

  // ---------- hover: every raised tile (big, medium, white) lifts a little under the mouse ----------
  // the tile under the pointer is found on the hexagon itself (highest tile wins where they overlap)
  const insideHex = (c, x, y) => {
    const at = c.role === 'feature' ? (c.place ?? homeOf(c)) : homeOf(c);
    const r = c.displayRadius ?? radiusOf(c) * at.k,
      dx = Math.abs(x - at.x),
      dy = Math.abs(y - at.y);
    return dx <= r * APO && dy + dx / Math.sqrt(3) <= r;
  };
  let hovered = null;
  function setHover(c) {
    if (c === hovered) return;
    if (hovered) hovered.hoverTarget = 0;
    hovered = c;
    if (c) c.hoverTarget = 1;
    kick();
  }
  const pointerMove = (e) => {
    const rect = canvas.getBoundingClientRect(),
      s = rect.width / 1920;
    const x = (e.clientX - rect.left) / s,
      y = (e.clientY - rect.top) / s;
    let hit = null;
    for (const c of cells)
      if (
        c.role &&
        !c.still &&
        c.h > 0.05 &&
        !isBig(c) &&
        insideHex(c, x, y) &&
        (!hit || c.h > hit.h)
      )
        hit = c;
    setHover(hit);
  };
  const pointerLeave = () => setHover(null);
  // Behind the chapters (the backdrop), as the first landing's chapter tiles did: every tile near the pointer lifts, the
  // nearer the more, easing off over BACKDROP_HOVER.radius; the pointer is the window's, the chapters being over it.
  const BACKDROP_HOVER = { radius: 260, boost: 0.9 };
  const backdropMove = (e) => {
    if (!visible || reduceMotion) return;
    const rect = canvas.getBoundingClientRect(),
      s = rect.width / 1920;
    const x = (e.clientX - rect.left) / s,
      y = (e.clientY - rect.top) / s;
    for (const c of cells) {
      if (c.h <= 0.01 && c.hoverTarget === 0) continue;
      const at = homeOf(c);
      const d = Math.hypot(at.x - x, at.y - y);
      const k = d < BACKDROP_HOVER.radius ? 1 - d / BACKDROP_HOVER.radius : 0;
      c.hoverTarget = (k * k * (3 - 2 * k) * BACKDROP_HOVER.boost) / HOVER_BOOST;
    }
    kick();
  };
  const backdropLeave = (e) => {
    if (e.relatedTarget) return;
    for (const c of cells) c.hoverTarget = 0;
    kick();
  };
  if (backdrop) {
    window.addEventListener('pointermove', backdropMove, { passive: true });
    window.addEventListener('pointerout', backdropLeave);
  }
  stage.addEventListener('pointermove', pointerMove);
  stage.addEventListener('pointerleave', pointerLeave);

  // ---------- the picture tiles are buttons: all of them with the chosen one beside, else all but the big one ----------
  const pickSlots =
    backdrop || whiteField
      ? []
      : FEATURE_SLOTS.map((_, slot) => slot).filter((slot) => heroBeside || slot > 0);
  const picks = pickSlots.map((slot) => {
    const c = slotPos[slot],
      d = c.r * 1.6;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    Object.assign(b.style, {
      left: c.x - d / 2 + 'px',
      top: c.y - d / 2 + 'px',
      width: d + 'px',
      height: d + 'px',
    });
    b.addEventListener('click', () => {
      onInteraction();
      fullVideos = true;
      choose(slot);
    });
    $('picks').appendChild(b);
    return b;
  });
  function updatePickLabels() {
    picks.forEach((b, k) =>
      b.setAttribute('aria-label', `Show ${FEATURES[onTile(pickSlots[k])].label}`)
    );
  }

  // the small white tiles sink to the floor right away; once they are down, a new set rises elsewhere
  function reshuffleSmalls() {
    const oldSmalls = new Set(cells.filter((c) => c.role === 'small'));
    applySmalls([]);
    later(
      () => {
        applySmalls(pickSmalls(oldSmalls));
        kick();
      },
      reduceMotion ? 0 : FLIP_DUR
    );
  }

  // with the chosen one beside the field: the clicked tile moves over and grows, out of its cube, into the chosen one's
  // place, as the one there shrinks back into a cube at the clicked one's place
  function fly(slot, now) {
    const tile = cellAt[slot],
      back = heroCell;
    if (!back) return;
    const ms = reduceMotion ? 0 : flightMs;
    tile.zoomStarted = now + ms;
    moveTile(tile, now, bigOf(tile), ms);
    back.home = slotPlace(back, slot);
    moveTile(back, now, back.home, ms);
    tile.home = null;
    cellAt[slot] = back;
    heroCell = tile;
    // On the click, the ones that stay where they are turn over as the first landing's did, in a wave from left to
    // right, each to the example of the next of them, so the centre's changes too (user); the one coming back lands in
    // the clicked one's place.
    // (none for now: TURN_ON_PICK, user)
    const still = TURN_ON_PICK ? cellAt.filter((c, k) => k !== slot) : [];
    if (still.length > 1) {
      const examples = still.map((c) => c.feature);
      still.forEach((c, k) => {
        c.feature = examples[(k + 1) % examples.length];
      });
    }
    const xs = still.map((c) => homeOf(c).x),
      minX = Math.min(...xs),
      maxX = Math.max(...xs);
    for (const c of still) {
      if (reduceMotion) {
        c.pics[c.orient] = slices[c.feature];
        continue;
      }
      c.pics[1 - c.orient] = slices[c.feature];
      c.turnStart = now;
      c.turnDelay = ((homeOf(c).x - minX) / Math.max(1, maxX - minX)) * FLIP_SPREAD;
      c.turnDur = FLIP_DUR;
    }
    updatePickLabels();
    busyUntil =
      now + (reduceMotion ? 0 : Math.max(ms, TURN_ON_PICK ? FLIP_SPREAD + FLIP_DUR : 0)) + 100;
    reshuffleSmalls();
    showFeature(tile.feature);
    kick();
  }

  // clicked medium tile -> its feature goes to the big tile, the big one's feature goes to the clicked tile
  function choose(slot) {
    const now = performance.now();
    if (now < busyUntil || !slices.length) return;
    if (heroBeside) {
      fly(slot, now);
      return;
    }
    [cellAt[0].feature, cellAt[slot].feature] = [cellAt[slot].feature, cellAt[0].feature];
    if (reduceMotion) {
      featureCells.forEach((c) => {
        c.pics[c.orient] = slices[c.feature];
      });
    } else {
      turnAll(now);
    }
    reshuffleSmalls();
    later(
      () => showFeature(cellAt[0].feature, true),
      reduceMotion ? 0 : FLIP_SPREAD * 0.4 + FLIP_DUR * 0.4
    );
    updatePickLabels();
    kick();
  }

  // ---------- start ----------
  // `initialIndex` is the chosen one on opening; the others follow in their usual order
  {
    const m = initialIndex;
    if (heroCell) heroCell.feature = m;
    cellAt.forEach((c, slot) => {
      c.feature = (m + slot + (heroCell ? 1 : 0)) % FEATURES.length;
    });
    updatePickLabels();
  }
  // the backdrop: the arrangement as it stands, white, from the first frame (the same draws of the seed as below)
  if (backdrop) {
    applySmalls(pickSmalls());
    const now = performance.now();
    for (const c of cells) {
      c.start = now;
      c.h = Math.max(c.base, c.lift);
      c.lifted = true;
    }
    if (heroCell) heroCell.lift = heroCell.h = 0;
    started = true;
    kick();
    onReady();
  }
  // The white tiles need no pictures: they rise in their sweep from `introAt`, the pictures in or not. The picture
  // tiles and the chosen one wait for the pictures (Infinity until then), as a picture tile turns to its picture
  // while it rises.
  let introBegin = 0;
  if (!backdrop) {
    applySmalls(pickSmalls());
    const now = performance.now();
    introBegin = reduceMotion
      ? now
      : Math.max(now - INTRO_LEAD, (introAt ?? now + INTRO_AFTER) - INTRO_LEAD);
    const shown = cells.filter((c) => c.role || c.base > 0),
      left = Math.min(...shown.map((c) => c.x)),
      span = Math.max(1, Math.max(...shown.map((c) => c.x)) - left);
    const pictures = new Set(cellAt);
    for (const c of cells)
      c.start = pictures.has(c)
        ? Infinity
        : reduceMotion
          ? now
          : introBegin + ((c.x - left) / span) * INTRO_SWEEP + random() * INTRO_JITTER;
    if (heroCell) heroCell.start = Infinity;
    // those whose turn has come already: as high as they would have risen by now (as the frames' first lift does)
    for (const c of cells)
      if (c.start < now) {
        c.h = c.prevH =
          Math.max(c.base, c.lift) * (1 - (1 - LIFT_EASE) ** ((now - c.start) / 16.7));
      }
    started = true;
    kick();
  }
  const loaded = (backdrop ? [] : FEATURES).map(
    (f) =>
      new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = () => rej(new Error('picture failed to load'));
        img.src = f.img;
      })
  );
  Promise.all(loaded)
    .then((imgs) => {
      if (disposed || backdrop) return;
      images = imgs;
      slices = FEATURES.map((f, i) => makeSlice(f, imgs[i]));
      // picture tiles start white and turn to their first picture while they rise (same turn as a click)
      featureCells.forEach((c) => {
        if (whiteField && c !== heroCell) return; // white: no picture to turn to
        if (c === heroCell || reduceMotion) c.pics[0] = slices[c.feature];
        else {
          c.pics[0] = null;
          c.pics[1] = slices[c.feature];
          c.introPending = true;
        }
      });
      // In order (user): the words (on the page), then the white tiles in a sweep from left to right (rising
      // already), then the chosen one beside the field, then the picture tiles in a quicker sweep of their own,
      // rising and turning to their pictures, then the way in. Pictures in late, the chosen one comes at once.
      const now = performance.now();
      const heroAt = reduceMotion ? now : Math.max(now, introBegin + HERO_AFTER);
      const px = cellAt.map((c) => homeOf(c).x),
        pLeft = Math.min(...px),
        pSpan = Math.max(1, Math.max(...px) - pLeft);
      for (const c of cellAt)
        c.start = reduceMotion
          ? now
          : heroAt +
            (PICTURES_AFTER - HERO_AFTER) +
            ((homeOf(c).x - pLeft) / pSpan) * PICTURES_SWEEP;
      if (heroCell) heroCell.start = heroAt;
      // (whiteField) the logo comes in with the central tile, as it rises
      if (whiteField && cellAt[0]) {
        if (reduceMotion) {
          onCentreIn();
          linksAt = now;
        } else {
          const at = Math.max(0, cellAt[0].start - now) + CENTRE_LOGO_AFTER;
          later(onCentreIn, at);
          linksAt = now + at + LINKS.after;
          later(kick, at + LINKS.after);
        }
      }
      if (!reduceMotion) {
        if (heroCell)
          later(() => {
            if (heroCell) heroCell.appearTween = { start: performance.now(), ms: 900 };
            kick();
          }, heroAt - now);
        // the way in, and the chapters along the foot, at the end of it all, exactly as the last picture tile turns
        // over to its picture (half-way through its turn; user)
        const lastTurn =
          Math.max(...cellAt.map((c) => c.start)) - now + INTRO_TURN_DELAY + INTRO_FLIP_DUR * 0.5;
        later(onShowChosen, lastTurn);
      } else {
        if (heroCell) heroCell.appear = 1;
        onShowChosen();
      }
      // no clicks until every white tile is up and every picture tile has finished its first turn
      busyUntil =
        Math.max(
          introBegin + INTRO_SWEEP + INTRO_JITTER,
          Math.max(...cellAt.map((c) => c.start)) + INTRO_TURN_DELAY + INTRO_FLIP_DUR
        ) + 100;
      started = true;
      kick();

      showFeature(heroCell ? heroCell.feature : cellAt[0].feature);
      onReady();
    })
    .catch((error) => {
      if (disposed) return;
      // the tiles waiting on their pictures rise white
      for (const c of cells) if (c.start === Infinity) c.start = performance.now();
      if (whiteField) onCentreIn();
      onError(error);
    });

  return {
    selectFeature(index) {
      if (heroCell?.feature === index) return;
      // (whiteField) no tile holds a film: the one beside the field changes over to it
      if (whiteField) return this.show(index);
      const slot = cellAt.findIndex((cell) => cell.feature === index);
      if (slot >= 0) choose(slot);
    },
    /** (whiteField) show film `i` beside the field: the one there fades out and it fades in. */
    show(i) {
      if (!whiteField || !heroCell || !(i >= 0 && i < FEATURES.length) || i === heroCell.feature)
        return;
      const now = performance.now();
      if (!reduceMotion)
        heroFade = {
          from: heroCell.feature,
          start: now,
          // the one going, as it was: its own film and zoom
          outOf: Object.assign(Object.create(heroCell), {
            feature: heroCell.feature,
            zoomStarted: heroCell.zoomStarted,
          }),
        };
      heroCell.feature = i;
      heroCell.pics[0] = slices[i] ?? null;
      heroCell.zoomStarted = now + (reduceMotion ? 0 : FADE_OUT);
      showFeature(i);
      kick();
    },
    // (behind the chapters) the tiles move about
    stir() {
      if (!reduceMotion) stir();
    },
    // the white tiles raised now, where they are, for another renderer of the same seed to raise the same
    smallsNow() {
      return cells.flatMap((c, i) =>
        c.role === 'small' ? [{ i, x: c.x, y: c.y, r0: c.r0, lift: c.lift, order: c.order }] : []
      );
    },
    // (the backdrop) raise those, at once, in place of its own
    setSmalls(list) {
      for (const c of cells)
        if (c.role === 'small') {
          c.role = null;
          c.lift = 0;
          c.h = c.base;
        }
      for (const s of list) {
        const c = cells[s.i];
        if (!c || c.role) continue;
        Object.assign(c, {
          x: s.x,
          y: s.y,
          r0: s.r0,
          lift: s.lift,
          order: s.order,
          role: 'small',
          h: s.lift,
        });
        c.lifted = true;
      }
      kick();
    },
    setVisible(value) {
      visible = value;
      if (!visible) {
        cancelAnimationFrame(frameId);
        looping = false;
        lastNow = 0;
        playback.update(-1, false);
      } else kick();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameId);
      timers.forEach((timer) => clearTimeout(timer));
      playback.dispose();
      stage.removeEventListener('pointermove', pointerMove);
      stage.removeEventListener('pointerleave', pointerLeave);
      window.removeEventListener('pointermove', backdropMove);
      window.removeEventListener('pointerout', backdropLeave);
      picksContainer.replaceChildren();
    },
  };
}
