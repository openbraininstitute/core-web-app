/**
 * Canvas artwork adapted from LandingPage_V1; application UI stays in React.
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLDivElement} picksContainer
 * @param {{ initialIndex?: number, reduced?: boolean, onSelect?: (index: number) => void,
 * onReady?: () => void, onInteraction?: () => void, onError?: (error: Error) => void }} options
 */
export function createLandingTileRenderer(
  canvas,
  picksContainer,
  {
    initialIndex = 0,
    reduced = false,
    onSelect = () => {},
    onReady = () => {},
    onInteraction = () => {},
    onError = () => {},
  } = {}
) {
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
      label: 'Simulate activity',
      img: '/static/landing-v1/simulate.png',
      zoom: 2.3,
      hero: 900,
      alt: 'Simulated cortical microcircuit',
    },
    {
      label: 'Explore data',
      img: '/static/landing-v1/explore.png',
      zoom: 1.35,
      hero: 560,
      alt: 'Reconstructed fly neurons',
    },
    {
      label: 'Build models',
      img: '/static/landing-v1/build.png',
      zoom: 1.75,
      hero: 700,
      alt: 'Whole-brain model',
    },
    {
      label: 'Virtual labs',
      img: '/static/landing-v1/virtual-labs.png',
      zoom: 1.45,
      hero: 580,
      alt: 'Brain atlas',
    },
  ];

  // ---- hex grid (same as index.html): pointy-top, circumradius R; a tile lifted to height h is R * (1 + 0.7 h) ----
  const R = 55,
    SCALE_PER_H = 0.7;
  const colW = Math.sqrt(3) * R,
    rowH = 1.5 * R;
  const hForRadius = (r) => (r / R - 1) / SCALE_PER_H;

  // ---- picture tiles: where they should be (snapped to the nearest grid cell) and how big ----
  const FEATURE_SLOTS = [
    { x: 420, y: 529, r: 174 }, // big
    { x: 264, y: 334, r: 97 },
    { x: 332, y: 761, r: 99 },
    { x: 668, y: 851, r: 97 }, // medium
  ];
  // ---- small white tiles scattered around them; a new set is picked on every turn ----
  // each one is grown until its straight edge almost touches a picture tile; SMALL_R = allowed radius range
  const SMALL_COUNT = 8,
    SMALL_R = [65, 84],
    SMALL_GAP = 6,
    SMALL_ON_BIG = 0.2; // 20 % beside the big tile
  // medium tiles sit straight beside the big tile, EDGE_GAP px between the facing edges
  const EDGE_GAP = 6;
  // a new random side and slide for every medium tile on every page load (false = fixed slots)
  const RANDOM_MEDIUMS = true,
    MED_SPACING = 0;
  // fade-out around the white tiles: per ring the radius range (lower = smaller), up to FADE_PER per tile;
  // fade tiles keep FADE_CLEAR px away from the picture tiles so the fade only shows around the white ones
  const FADE_RINGS = [
      [58, 63],
      [55.8, 57.5],
    ],
    FADE_PER = 2,
    FADE_CLEAR = 30;
  // tiny tiles beside the white / fade tiles, for depth: how many, floor size, lift height
  const TINY_COUNT = 7,
    TINY_R0 = [22, 30],
    TINY_H = [0.15, 0.4],
    TINY_MAX_X = 700;
  const TINY_SHADOW = 0.35; // tiny tiles cast a much lighter shadow, so they stay in the background
  // start: every tile begins at a random moment within LIFT_SPREAD ms and rises with LIFT_EASE per frame
  const LIFT_EASE = 0.06;
  // first open: each picture tile turns from white to its picture WHILE it grows from the floor - its size follows
  // the turn, so it reaches full size exactly as the turn ends; INTRO_FLIP_DUR = length of that turn + growth
  const INTRO_TURN_DELAY = 0,
    INTRO_FLIP_DUR = 1100;
  // cube face shading while turning, only on the picture tiles (strength as on index.html)
  const FACE_SHADE = 0.28;
  const SHADE_PICTURE = 0.5,
    SHADE_WHITE = 0.1; // share of FACE_SHADE on picture tiles / white tiles
  // shine while a tile grows or shrinks under the mouse (1 = same as the lift from the floor)
  const HOVER_SHINE = 0.7;
  const FACE_MIN = 0.6; // touching edges overlap by at least 60 % of the shorter edge

  // ---- motion / look (same values as index.html where they exist) ----
  const EASE = 0.12; // height follows its target by 12 % per frame
  const LIFT_SPREAD = 600; // tiles start at random moments within this many ms
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
  const cv = canvas,
    ctx = cv.getContext('2d');
  if (!ctx) throw new Error('Canvas rendering is unavailable');
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  cv.width = 1920 * DPR;
  cv.height = 1080 * DPR;

  // ---------- cube maths (as in the WebGL shader) ----------
  const YAW = Math.PI / 4,
    E0 = Math.atan(1 / Math.SQRT2),
    E1 = Math.PI - E0;
  const LIGHT = (() => {
    const l = [-0.35, 0.75, 0.55],
      m = Math.hypot(...l);
    return l.map((v) => v / m);
  })();
  function rotv(v, e) {
    const c = Math.cos(YAW),
      s = Math.sin(YAW);
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
  const SLICE_R = FEATURE_SLOTS[0].r,
    SLICE_K = 2;

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
    const w = Math.sqrt(3) * SLICE_R,
      h = 2 * SLICE_R;
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * SLICE_K);
    c.height = Math.ceil(h * SLICE_K);
    const g = c.getContext('2d');
    g.scale(SLICE_K, SLICE_K);
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
      ih = (iw * img.naturalHeight) / img.naturalWidth;
    g.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
    return c;
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
    if (h > 0.004) {
      const k = Math.sqrt(r / R);
      const sigma = (4 + h * 28) * 0.5 * Math.min(k, 2.4);
      drawShadow(x - 8 * h * k, y + 14 * h * k, r, sigma, Math.min(0.28, h * 0.3) * 1.1 * shadowK);
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
      if (shade) {
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
      // cube face shading, always on for the picture tiles (at rest it is drawn above, with the picture)
      if (shade && !atRest) {
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
  for (let row = 1; row * rowH < 1080 - R; row++) {
    for (let col = 1; col * colW < 1000; col++) {
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
      });
    }
  }
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
    { x0: 0, x1: 1920, y0: 0, y1: 120 },
    { x0: 640, x1: 1100, y0: 250, y1: 640 },
    { x0: 0, x1: 1920, y0: 1010, y1: 1080 },
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

  // a tile of radius r placed straight beside tile t: its centre sits along one of the 6 edge normals of t, exactly
  // so far that the two facing edges are `gap` px apart; `lat` slides it sideways along that edge
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
  // fits = does not come closer than `gap` px to any of the tiles in `others`
  const fits = (p, others, gap) => others.every((o) => fitRadius(p.x, p.y, o, gap) >= p.r - 0.01);
  const inBounds = (p) =>
    p.x - p.r > 40 && p.y - p.r > 40 && p.y + p.r < 1040 && openArea(p.x, p.y, p.r);
  // a free grid cell is moved to the exact spot (the floor grid is not drawn, so cells can sit anywhere)
  function claimCell(p, taken) {
    const c = nearestCell(p.x, p.y, (c) => !c.role && !taken.has(c) && c.h < 0.005);
    c.x = p.x;
    c.y = p.y;
    c.r0 = p.r0 || R;
    taken.add(c);
    return c;
  }

  // picture tiles: the big one stays at its slot; each medium goes straight beside the big tile, on the side
  // closest to where its slot is, slid along the big tile's edge as far as still keeps the edges facing
  const featureCells = [];
  {
    const taken = new Set(),
      big = { ...FEATURE_SLOTS[0] };
    // fixed layout (the slots), used only if no random layout fits
    const fixedLayout = () => {
      const placed = [big];
      for (const s of FEATURE_SLOTS.slice(1)) {
        const dx = s.x - big.x,
          dy = s.y - big.y;
        const dir = DIRS.reduce(
          (b, [nx, ny], i) => (dx * nx + dy * ny > dx * DIRS[b][0] + dy * DIRS[b][1] ? i : b),
          0
        );
        const [nx, ny] = DIRS[dir],
          m = maxLat(s.r, big);
        placed.push(beside(big, s.r, dir, Math.max(-m, Math.min(m, -dx * ny + dy * nx)), EDGE_GAP));
      }
      return placed;
    };
    // random layout on every load: each medium goes on a random side of the big tile, slid a random amount
    // along its edge (the edges always face each other), and must not come close to another medium
    const randomLayout = () => {
      for (let attempt = 0; attempt < 300; attempt++) {
        const placed = [big];
        for (const s of FEATURE_SLOTS.slice(1)) {
          for (let t = 0; t < 40; t++) {
            const m = maxLat(s.r, big);
            const p = beside(
              big,
              s.r,
              Math.floor(Math.random() * 6),
              (Math.random() * 2 - 1) * m,
              EDGE_GAP
            );
            if (inBounds(p) && fits(p, placed.slice(1), EDGE_GAP + MED_SPACING)) {
              placed.push(p);
              break;
            }
          }
        }
        if (placed.length === FEATURE_SLOTS.length) return placed;
      }
      return null;
    };
    const layout = (RANDOM_MEDIUMS && randomLayout()) || fixedLayout();
    FEATURE_SLOTS.forEach((s, k) => {
      const p = layout[k];
      const c = claimCell(p, taken);
      s.r = p.r; // the picture tile's real size from now on
      c.role = 'feature';
      c.slot = k;
      c.lift = hForRadius(s.r);
      c.order = 100 + c.lift; // picture tiles on top
      featureCells.push(c);
    });
  }

  // all other cells stay flat on the floor: only the picture tiles and a few small white tiles are raised

  // small white tiles: each one is put straight beside a picture tile (mostly the medium ones) with its edge
  // almost touching, at a random size and slide; it must not come close to any other tile
  function pickSmalls(avoid = new Set()) {
    const feats = featureCells.map((f) => ({ x: f.x, y: f.y, r: FEATURE_SLOTS[f.slot].r }));
    const out = [],
      taken = new Set([...avoid, ...cells.filter((c) => c.role === 'small')]);
    for (let tries = 0; tries < 600 && out.length < SMALL_COUNT; tries++) {
      const t = Math.random() < SMALL_ON_BIG ? feats[0] : feats[1 + Math.floor(Math.random() * 3)];
      const r = SMALL_R[0] + Math.random() * (SMALL_R[1] - SMALL_R[0]);
      const m = maxLat(r, t);
      const p = beside(t, r, Math.floor(Math.random() * 6), (Math.random() * 2 - 1) * m, SMALL_GAP);
      if (
        !inBounds(p) ||
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
    // fade-out: around the white tiles (only there), a few lower and smaller tiles step down to the floor,
    // each ring lower than the one before; they only grow outwards, away from the big tile
    let ring = out.slice();
    for (const [r0, r1] of FADE_RINGS) {
      const next = [];
      for (const w of ring) {
        for (let t = 0, n = 0; t < 30 && n < FADE_PER; t++) {
          const r = r0 + Math.random() * (r1 - r0);
          const p = beside(
            w,
            r,
            Math.floor(Math.random() * 6),
            (Math.random() * 2 - 1) * maxLat(r, w),
            SMALL_GAP
          );
          if (
            Math.hypot(p.x - feats[0].x, p.y - feats[0].y) <
            Math.hypot(w.x - feats[0].x, w.y - feats[0].y)
          )
            continue;
          if (!inBounds(p) || !fits(p, feats, FADE_CLEAR) || !fits(p, out, SMALL_GAP)) continue;
          out.push(p);
          next.push(p);
          n++;
        }
      }
      ring = next;
    }
    // a few tiny tiles scattered in the empty spaces around the cluster, for a sense of depth
    // each one sits straight beside a white or fade tile (edges facing, SMALL_GAP apart), on the outside,
    // and stays left of TINY_MAX_X so none land on the label line or under the call to action
    const whites = out.slice();
    for (let tries = 0, n = 0; tries < 800 && n < TINY_COUNT && whites.length; tries++) {
      const t = whites[Math.floor(Math.random() * whites.length)];
      const r0 = TINY_R0[0] + Math.random() * (TINY_R0[1] - TINY_R0[0]);
      const h = TINY_H[0] + Math.random() * (TINY_H[1] - TINY_H[0]);
      const r = r0 * (1 + SCALE_PER_H * h);
      const p = beside(
        t,
        r,
        Math.floor(Math.random() * 6),
        (Math.random() * 2 - 1) * maxLat(r, t),
        SMALL_GAP
      );
      p.r0 = r0;
      p.h = h;
      if (
        p.x + p.r > TINY_MAX_X ||
        !inBounds(p) ||
        !fits(p, feats, FADE_CLEAR) ||
        !fits(p, out, SMALL_GAP)
      )
        continue;
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

  let order = []; // order[slot] = feature shown on picture tile 0..3 (0 = big)
  let slices = [];
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
      c.pics[1 - c.orient] = slices[order[c.slot]];
      c.turnStart = now;
      c.turnDelay = ((c.x - minX) / Math.max(1, maxX - minX)) * FLIP_SPREAD;
    }
    busyUntil = now + FLIP_SPREAD + FLIP_DUR;
  }

  let lastNow = 0;
  function render(now) {
    const dt = lastNow ? Math.min(50, now - lastNow) : 16.7;
    lastNow = now;
    const k = 1 - (1 - EASE) ** (dt / 16.7); // EASE per 60 fps frame
    let active = false;

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
    const drawn = cells
      .filter((c) => c.h > 0.01 || c.turnStart >= 0)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
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
      const rs = c.role === 'feature' ? FEATURE_SLOTS[c.slot].r : radiusOf(c);
      drawTile(
        c.x,
        c.y,
        radiusOf(c),
        rs,
        p,
        c.pics[0],
        c.pics[1],
        Math.min(1.2, c.h),
        c.shineX ?? 1,
        c.motion * (c.hoverMove ? HOVER_SHINE : 1),
        c.role === 'feature' ? SHADE_PICTURE : SHADE_WHITE,
        (c.r0 || R) < R ? TINY_SHADOW : 1
      );
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
    const r = radiusOf(c),
      dx = Math.abs(x - c.x),
      dy = Math.abs(y - c.y);
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
      if (c.role && c.h > 0.05 && insideHex(c, x, y) && (!hit || c.h > hit.h)) hit = c;
    setHover(hit);
  };
  const pointerLeave = () => setHover(null);
  stage.addEventListener('pointermove', pointerMove);
  stage.addEventListener('pointerleave', pointerLeave);

  // ---------- the three medium tiles are buttons ----------
  const picks = [1, 2, 3].map((slot) => {
    const c = featureCells[slot],
      d = FEATURE_SLOTS[slot].r * 1.6;
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
    picks.forEach((b, k) => b.setAttribute('aria-label', `Show ${FEATURES[order[k + 1]].label}`));
  }

  // clicked medium tile -> its feature goes to the big tile, the big one's feature goes to the clicked tile
  function choose(slot) {
    const now = performance.now();
    if (now < busyUntil || !slices.length) return;
    [order[0], order[slot]] = [order[slot], order[0]];
    const oldSmalls = new Set(cells.filter((c) => c.role === 'small'));
    if (reduceMotion) {
      featureCells.forEach((c) => {
        c.pics[c.orient] = slices[order[c.slot]];
      });
    } else {
      turnAll(now);
    }
    // the small white tiles sink to the floor right away; once they are down, a new set rises elsewhere
    applySmalls([]);
    later(
      () => {
        applySmalls(pickSmalls(oldSmalls));
        kick();
      },
      reduceMotion ? 0 : FLIP_DUR
    );
    later(() => showFeature(order[0], true), reduceMotion ? 0 : FLIP_SPREAD * 0.4 + FLIP_DUR * 0.4);
    updatePickLabels();
    kick();
  }

  // ---------- start ----------
  // a random feature is the big one on every visit; the others follow in their usual order
  {
    const m = initialIndex;
    order = FEATURES.map((_, i) => (m + i) % FEATURES.length);

    updatePickLabels();
  }
  const loaded = FEATURES.map(
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
      if (disposed) return;
      slices = FEATURES.map((f, i) => makeSlice(f, imgs[i]));
      // picture tiles start white and turn to their first picture while they rise (same turn as a click)
      featureCells.forEach((c) => {
        if (reduceMotion) c.pics[0] = slices[order[c.slot]];
        else {
          c.pics[0] = null;
          c.pics[1] = slices[order[c.slot]];
          c.introPending = true;
        }
      });
      applySmalls(pickSmalls());

      // tiles lift up from the floor
      const now = performance.now();
      // random order, all starting close together so they rise at the same time rather than one after another
      for (const c of cells) c.start = now + (reduceMotion ? 0 : 150 + Math.random() * LIFT_SPREAD);
      // no clicks until every picture tile has finished its first turn
      busyUntil = now + 150 + LIFT_SPREAD + INTRO_TURN_DELAY + INTRO_FLIP_DUR + 100;
      started = true;
      kick();

      showFeature(order[0]);
      onReady();
    })
    .catch((error) => {
      if (!disposed) onError(error);
    });

  return {
    setVisible(value) {
      visible = value;
      if (!visible) {
        cancelAnimationFrame(frameId);
        looping = false;
        lastNow = 0;
      } else kick();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameId);
      timers.forEach((timer) => clearTimeout(timer));
      stage.removeEventListener('pointermove', pointerMove);
      stage.removeEventListener('pointerleave', pointerLeave);
      picksContainer.replaceChildren();
    },
  };
}
