/**
 * Canvas artwork adapted from LandingPage_V1; application UI stays in React.
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLDivElement} picksContainer
 * @param {{ initialIndex?: number, reduced?: boolean, textInField?: boolean, heroBeside?: boolean,
 * heroAbove?: boolean, phoneStageH?: number,
 * flightMs?: number, seed?: number, backdrop?: boolean, introAt?: number, onShowChosen?: () => void, onSelect?: (index: number) => void,
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
    // when (performance.now() clock) the first white tiles are to show: as the page's logo and words start coming in
    introAt,
    // with the chosen one beside the field: told when the opening is far enough on for it to show there
    onShowChosen = () => {},
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
  // ---- features ----
  // zoom = picture width relative to the tile (the subjects have white margins); hero = width on the right
  const FEATURES = [
    {
      label: 'Simulate whole brains',
      img: '/static/landing-v1/fly-brain.jpg',
      // a turning loop: the tile shows its frames as it plays, the picture until then
      video: '/static/landing-v1/fly-brain.mp4',
      // small enough that the whole brain and nerve cord sit inside the hexagon, seen from any side
      zoom: 0.68,
      hero: 700,
      alt: "The male fly's brain and nerve cord, lit as its model's neurons fire",
    },
    {
      label: 'Simulate activity',
      img: '/static/landing-v1/microcircuit.jpg',
      // a cortical column's activity, from the user's Vid4 (cropped to the column, its white made pure)
      video: '/static/landing-v1/microcircuit.mp4',
      zoom: 0.7,
      hero: 640,
      alt: 'Simulated cortical microcircuit, its neurons firing',
    },
    {
      label: 'Explore data',
      img: '/static/landing-v1/explore.png',
      zoom: 1.35,
      hero: 760,
      alt: 'Reconstructed fly neurons',
    },
    {
      label: 'Build models',
      img: '/static/landing-v1/build.png',
      zoom: 1.75,
      hero: 780,
      alt: 'Whole-brain model',
    },
    {
      label: 'Virtual labs',
      img: '/static/landing-v1/virtual-labs.png',
      zoom: 1.45,
      hero: 760,
      alt: 'Brain atlas',
    },
    {
      label: 'Skeletonize meshes',
      img: '/static/landing-v1/spiny-neuron.jpg',
      // the learn branch's spiny view: a MICrONS cell's EM mesh as a veil, its spines by path distance from the soma
      video: '/static/landing-v1/spiny-neuron.mp4',
      // in close on its soma and spines in a cube: the whole cell is too fine to read at a cube's size
      zoom: 1.5,
      hero: 700,
      alt: "A neuron's EM mesh, its spines coloured by their distance from the soma",
    },
    {
      label: 'Skeletonize morphologies and extract spines',
      img: '/static/landing-v1/dendrite-ride.jpg?v=3',
      // the learn branch's fly-through down the cell's spiniest dendrite, its mesh opaque in the fly model's blue, its
      // sections' spines each a colour of their own, there and back (a loop with no jump), stepped at half the ride's pace
      video: '/static/landing-v1/dendrite-ride.mp4?v=3',
      // it fills its frame to the edges: a white fade round them
      feather: true,
      zoom: 1.15,
      hero: 760,
      alt: 'Riding down a dendrite past its spines, coloured by their distance from the soma',
    },
  ];

  // TEMPORARY (user): every example the blue fly brain, as the first one is, its names kept; all but the blue ride
  // along a dendrite, which keeps its own cube (user)
  const ALL_FLY = true;
  const KEEP_OWN = new Set(['Skeletonize morphologies and extract spines']);
  if (ALL_FLY) {
    const fly = FEATURES[0];
    FEATURES.forEach((f, i) => {
      if (i && !KEEP_OWN.has(f.label))
        Object.assign(f, {
          img: fly.img,
          video: fly.video,
          zoom: fly.zoom,
          hero: fly.hero,
          alt: fly.alt,
        });
    });
  }

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
  const STAGE_H = heroAbove ? Math.max(1080, phoneStageH) : 1080,
    FOOT = STAGE_H - 40;
  const PHONE = { x0: 450, x1: 1410, fieldTop: FOOT - 440, big: 112, medium: 78 };
  // the chosen one's box on a phone: from the top down to its name, which is over the field's top
  const PHONE_HERO_H = PHONE.fieldTop - 120;
  const FEATURE_SLOTS = [
    heroAbove ? { x: 930, y: FOOT - 240, r: PHONE.big } : { x: 960, y: 540, r: 174 },
    ...Array.from({ length: Math.max(1, FEATURES.length - (heroBeside ? 2 : 1)) }, () => ({
      x: 0,
      y: 0,
      r: heroAbove ? PHONE.medium : 97,
    })),
  ];
  // where the chosen one goes, in the right third, its tile growing as if to a cube this big as the cube melts away
  // from round it; and how far a moving tile bows off its way (none: a straight path, user: the arc "makes the
  // animation look weird"; it was 90)
  const HERO_TILE = heroAbove
      ? { x: 930, y: 10 + PHONE_HERO_H / 2, r: (210 * PHONE_HERO_H) / 480 }
      : { x: 1590, y: 540, r: 330 },
    BOW = 0;
  // the chosen one itself, out of its cube: as wide as the example says (smaller in step on a phone), within this box
  const BIG_W = heroAbove ? 960 : 720,
    BIG_H = heroAbove ? PHONE_HERO_H : 820,
    HERO_K = HERO_TILE.r / 330;
  // ---- small white tiles round them, a new set on every pick, as on the first landing: each grown until its straight
  // edge almost touches a picture tile; a fade of lower, smaller ones round them; a few tiny ones for depth ----
  // (smaller in step with the picture tiles on a phone)
  const SMALL_K = heroAbove ? PHONE.medium / 97 : 1;
  const SMALL_COUNT = 8,
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
  const DPR = Math.min(2, window.devicePixelRatio || 1);
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
  const shadowSprites = SH_LEVELS.map((b) => {
    const pad = Math.ceil(b * 3),
      size = 2 * (SH_R + pad);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.filter = `blur(${b}px)`;
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 3;
      k
        ? g.lineTo(size / 2 + SH_R * Math.cos(a), size / 2 + SH_R * Math.sin(a))
        : g.moveTo(size / 2 + SH_R * Math.cos(a), size / 2 + SH_R * Math.sin(a));
    }
    g.closePath();
    g.fillStyle = 'rgb(70, 80, 100)';
    g.fill();
    return { c, size, b };
  });
  function drawShadow(x, y, r, sigma, alpha) {
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
      ctx.drawImage(s.c, x - d / 2, y - d / 2, d, d);
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

  // one tile: cube at (x, y) with outline radius r (slot radius rs for the picture), turn position p (0..1),
  // pictures pic0 / pic1 on the faces seen in view 0 / view 1 (null = white), lift height h and height shine
  function drawTile(x, y, r, rs, p, pic0, pic1, h, shineX, shineAmt, shade, shadowK = 1) {
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
    if (reduceMotion || (!c.role && !c.stray)) return [0, 0];
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
    if (!m) return [0, 0];
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
      v = videos[index],
      src = v && v.readyState >= 2 ? v : images[index];
    if (!src) return;
    const nw = src.videoWidth || src.naturalWidth,
      nh = src.videoHeight || src.naturalHeight;
    const full = Math.min(f.hero * HERO_K, BIG_W, (BIG_H * nw) / nh);
    const rs = c.baseR;
    const inCube = Math.sqrt(3) * rs * at.k * f.zoom,
      inBigCube = Math.sqrt(3) * HERO_TILE.r * f.zoom;
    const w = inCube * (full / inBigCube) ** t,
      h = (w * nh) / nw;
    ctx.save();
    ctx.globalAlpha = alpha * (c.appear ?? 1);
    // its white goes, as the page's pictures' does
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(f.feather ? feathered(src, w, h) : src, x - w / 2, y - h / 2, w, h);
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

  // ---------- video features: played only while a tile shows them, their frames painted into the slice ----------
  // Every copy of a video on the page keeps to one clock (the page's time, round its length), so the one in a tile
  // and the one beside the field pick up where each other left off.
  const videos = FEATURES.map((f) => {
    if (!f.video || reduceMotion || backdrop) return null;
    const v = document.createElement('video');
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.defaultPlaybackRate = v.playbackRate = f.rate ?? 1;
    v.src = f.video;
    v.addEventListener('playing', () => keepTime(v));
    return v;
  });
  const keepTime = (v) => {
    if (!v.duration) return;
    v.playbackRate = v.defaultPlaybackRate;
    const want = ((performance.now() / 1000) * v.playbackRate) % v.duration,
      off = Math.abs(v.currentTime - want);
    if (off > 0.2 && off < v.duration - 0.2) v.currentTime = want;
  };
  const lastSync = new Map(),
    lastFrame = new Map();
  function runVideos(now) {
    let playing = false;
    videos.forEach((v, i) => {
      if (!v) return;
      const shown = visible && slices[i] && featureCells.some((c) => c.pics.includes(slices[i]));
      if (!shown) {
        if (!v.paused) v.pause();
        return;
      }
      playing = true;
      if (v.paused) v.play().catch(() => {});
      if ((lastSync.get(v) ?? -Infinity) + 2000 < now) {
        keepTime(v);
        lastSync.set(v, now);
      }
      if (v.readyState >= 2 && lastFrame.get(v) !== v.currentTime) {
        paintSlice(slices[i], FEATURES[i], v);
        lastFrame.set(v, v.currentTime);
      }
    });
    return playing;
  }

  let lastNow = 0;
  function render(now) {
    const dt = lastNow ? Math.min(50, now - lastNow) : 16.7;
    lastNow = now;
    const k = 1 - (1 - EASE) ** (dt / 16.7); // EASE per 60 fps frame
    // drifting tiles and playing videos keep the loop going
    const playing = runVideos(now);
    let active = playing || (started && !reduceMotion) || now < stirredUntil;

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
    const drawn = cells
      .filter((c) => c.h > 0.01 || c.turnStart >= 0)
      .sort((a, b) => (isBig(a) ? 300 : a.order || 0) - (isBig(b) ? 300 : b.order || 0));
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
      if (c.h <= 0.01) continue;
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
          radiusOf(c) * at.k,
          rs * at.k,
          p,
          c.pics[0],
          c.pics[1],
          Math.min(1.2, c.h),
          c.shineX ?? 1,
          c.motion * (c.hoverMove ? HOVER_SHINE : 1),
          c.role === 'feature' ? SHADE_PICTURE : SHADE_WHITE,
          // lighter along the flourish, as it fades out
          1 - 0.45 * (c.fade || 0)
        );
      // on its way to the ring's middle its cube melts away from round the example, which is left there on its own
      const t = c.role === 'feature' && heroBeside ? at.big : 0;
      if (t <= 0.001) draw();
      else {
        const free = smooth(t, 0.15, 0.85);
        drawFaded(1 - free, at.x + ox, at.y + oy, radiusOf(c) * at.k, draw);
        drawFree(c, at, at.x + ox, at.y + oy, t, free);
      }
    }
    return active;
  }
  let looping = false;
  function loop(now) {
    if (disposed || !visible) {
      looping = false;
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
    const r = radiusOf(c) * at.k,
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
      if (c.role && c.h > 0.05 && !isBig(c) && insideHex(c, x, y) && (!hit || c.h > hit.h)) hit = c;
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
  const pickSlots = backdrop
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
      onError(error);
    });

  return {
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
        videos.forEach((v) => v?.pause());
      } else kick();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameId);
      timers.forEach((timer) => clearTimeout(timer));
      videos.forEach((v) => {
        if (!v) return;
        v.pause();
        v.removeAttribute('src');
        v.load();
      });
      stage.removeEventListener('pointermove', pointerMove);
      stage.removeEventListener('pointerleave', pointerLeave);
      window.removeEventListener('pointermove', backdropMove);
      window.removeEventListener('pointerout', backdropLeave);
      picksContainer.replaceChildren();
    },
  };
}
