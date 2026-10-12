/**
 * Procedural 2D neuron morphologies for the introductory figures.
 *
 * These are cartoons, not reconstructions: a seeded recursive branching rule
 * with per-type parameters, enough to show that neurons come in very different
 * shapes. Coordinates are in arbitrary units with the soma at the origin and
 * +y pointing down (screen convention), so dendrites going "up" are negative.
 */

export type MorphKind = 'pyramidal' | 'interneuron' | 'purkinje';
export type SegKind = 'apical' | 'basal' | 'axon' | 'ais';

interface MorphSeg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Line width in morphology units. */
  w: number;
  kind: SegKind;
}

export interface Morphology {
  kind: MorphKind;
  label: string;
  region: string;
  soma: { x: number; y: number; r: number };
  segs: MorphSeg[];
  /** Dendritic terminal points, used to place synapses. */
  tips: { x: number; y: number }[];
  /** Centre of the axon initial segment. */
  ais: { x: number; y: number };
  /** Polyline of the axon, soma end first. */
  axon: { x: number; y: number }[];
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface BranchParams {
  spread: number;
  jitter: number;
  lenDecay: number;
  wDecay: number;
  trifurcate: number;
}

function branch(
  out: MorphSeg[],
  tips: { x: number; y: number }[],
  x: number,
  y: number,
  ang: number,
  len: number,
  w: number,
  depth: number,
  p: BranchParams,
  rnd: () => number,
  kind: SegKind
) {
  const x2 = x + Math.cos(ang) * len;
  const y2 = y + Math.sin(ang) * len;
  out.push({ x1: x, y1: y, x2, y2, w, kind });
  if (depth <= 0) {
    tips.push({ x: x2, y: y2 });
    return;
  }
  const n = rnd() < p.trifurcate ? 3 : 2;
  for (let i = 0; i < n; i++) {
    const offset = p.spread * (i - (n - 1) / 2) + (rnd() - 0.5) * p.jitter;
    branch(
      out,
      tips,
      x2,
      y2,
      ang + offset,
      len * p.lenDecay * (0.85 + 0.3 * rnd()),
      Math.max(0.5, w * p.wDecay),
      depth - 1,
      p,
      rnd,
      kind
    );
  }
}

/** Straight-ish axon leaving the soma, with the initial segment marked. */
function makeAxon(
  out: MorphSeg[],
  from: { x: number; y: number },
  ang: number,
  rnd: () => number,
  somaR: number
) {
  const pts: { x: number; y: number }[] = [{ x: from.x, y: from.y }];
  let x = from.x + Math.cos(ang) * somaR;
  let y = from.y + Math.sin(ang) * somaR;
  let a = ang;
  const lens = [26, 34, 38, 40, 42, 44];
  lens.forEach((len, i) => {
    const nx = x + Math.cos(a) * len;
    const ny = y + Math.sin(a) * len;
    out.push({
      x1: x,
      y1: y,
      x2: nx,
      y2: ny,
      w: i === 0 ? 2.6 : 1.6,
      kind: i === 0 ? 'ais' : 'axon',
    });
    pts.push({ x: nx, y: ny });
    x = nx;
    y = ny;
    a += (rnd() - 0.5) * 0.28;
  });
  const first = out.find((s) => s.kind === 'ais')!;
  return { pts, ais: { x: (first.x1 + first.x2) / 2, y: (first.y1 + first.y2) / 2 } };
}

export function buildMorphology(kind: MorphKind, seed = 3): Morphology {
  const rnd = mulberry32(seed);
  const segs: MorphSeg[] = [];
  const tips: { x: number; y: number }[] = [];
  const somaR = kind === 'purkinje' ? 11 : kind === 'pyramidal' ? 10 : 9;
  const soma = { x: 0, y: 0, r: somaR };

  if (kind === 'pyramidal') {
    // apical trunk upwards, tuft at the top
    branch(
      segs,
      tips,
      0,
      -somaR,
      -Math.PI / 2,
      52,
      4.4,
      4,
      { spread: 0.52, jitter: 0.3, lenDecay: 0.76, wDecay: 0.7, trifurcate: 0.15 },
      rnd,
      'apical'
    );
    // basal skirt
    for (const a of [2.35, 2.85, 3.45, 3.95]) {
      branch(
        segs,
        tips,
        0,
        somaR * 0.3,
        a,
        30,
        2.8,
        3,
        { spread: 0.6, jitter: 0.35, lenDecay: 0.74, wDecay: 0.72, trifurcate: 0.1 },
        rnd,
        'basal'
      );
    }
  } else if (kind === 'interneuron') {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2 + 0.25;
      if (Math.abs(a - Math.PI / 2) < 0.3) continue; // leave room for the axon
      branch(
        segs,
        tips,
        0,
        0,
        a,
        34,
        2.6,
        3,
        { spread: 0.72, jitter: 0.45, lenDecay: 0.72, wDecay: 0.7, trifurcate: 0.25 },
        rnd,
        'basal'
      );
    }
  } else {
    // Purkinje: one thick trunk fanning into a dense planar tree
    branch(
      segs,
      tips,
      0,
      -somaR,
      -Math.PI / 2,
      34,
      5.4,
      6,
      { spread: 0.44, jitter: 0.18, lenDecay: 0.84, wDecay: 0.78, trifurcate: 0.05 },
      rnd,
      'apical'
    );
  }

  const axonAngle = kind === 'interneuron' ? Math.PI / 2 + 0.35 : Math.PI / 2;
  const { pts, ais } = makeAxon(segs, soma, axonAngle, rnd, somaR);

  let x0 = -somaR;
  let y0 = -somaR;
  let x1 = somaR;
  let y1 = somaR;
  for (const s of segs) {
    x0 = Math.min(x0, s.x1, s.x2);
    y0 = Math.min(y0, s.y1, s.y2);
    x1 = Math.max(x1, s.x1, s.x2);
    y1 = Math.max(y1, s.y1, s.y2);
  }

  const labels: Record<MorphKind, { label: string; region: string }> = {
    pyramidal: { label: 'pyramidal cell', region: 'cortex' },
    interneuron: { label: 'interneuron', region: 'cortex' },
    purkinje: { label: 'Purkinje cell', region: 'cerebellum' },
  };

  return { kind, ...labels[kind], soma, segs, tips, ais, axon: pts, bbox: { x0, y0, x1, y1 } };
}

interface Fit {
  s: number;
  ox: number;
  oy: number;
  tx: (x: number) => number;
  ty: (y: number) => number;
}

/** Uniform fit of a morphology into a pixel box. */
export function fitMorphology(
  m: Morphology,
  box: { x: number; y: number; w: number; h: number },
  pad = 8
): Fit {
  const mw = m.bbox.x1 - m.bbox.x0;
  const mh = m.bbox.y1 - m.bbox.y0;
  const s = Math.min((box.w - pad * 2) / mw, (box.h - pad * 2) / mh);
  const ox = box.x + (box.w - s * mw) / 2 - m.bbox.x0 * s;
  const oy = box.y + (box.h - s * mh) / 2 - m.bbox.y0 * s;
  return { s, ox, oy, tx: (x) => ox + x * s, ty: (y) => oy + y * s };
}

const SEG_COLORS: Record<SegKind, string> = {
  apical: '#7dd3fc',
  basal: '#c4b5fd',
  axon: '#fbbf24',
  ais: '#fb923c',
};

interface DrawMorphOpts {
  /** 0 = at rest, 1 = spiking; brightens the soma and axon. */
  activity?: number;
  highlightAis?: boolean;
  dim?: boolean;
  somaColor?: string;
}

export function drawMorphology(
  ctx: CanvasRenderingContext2D,
  m: Morphology,
  f: Fit,
  o: DrawMorphOpts = {}
) {
  const activity = o.activity ?? 0;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const s of m.segs) {
    const isAxonal = s.kind === 'axon' || s.kind === 'ais';
    ctx.strokeStyle = o.dim ? 'rgba(100,116,139,0.5)' : SEG_COLORS[s.kind];
    ctx.globalAlpha = o.dim ? 0.6 : isAxonal ? 0.95 : 0.8;
    ctx.lineWidth = Math.max(0.8, s.w * f.s * 0.55);
    if (activity > 0.02 && isAxonal) {
      ctx.shadowColor = SEG_COLORS.axon;
      ctx.shadowBlur = 16 * activity;
    }
    ctx.beginPath();
    ctx.moveTo(f.tx(s.x1), f.ty(s.y1));
    ctx.lineTo(f.tx(s.x2), f.ty(s.y2));
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;

  if (o.highlightAis) {
    const ais = m.segs.find((s) => s.kind === 'ais');
    if (ais) {
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = Math.max(3, ais.w * f.s * 0.9);
      ctx.shadowColor = '#fb923c';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(f.tx(ais.x1), f.ty(ais.y1));
      ctx.lineTo(f.tx(ais.x2), f.ty(ais.y2));
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  // soma
  const r = Math.max(4, m.soma.r * f.s);
  if (activity > 0.02) {
    ctx.shadowColor = '#fca5a5';
    ctx.shadowBlur = 30 * activity;
  }
  ctx.beginPath();
  ctx.arc(f.tx(m.soma.x), f.ty(m.soma.y), r, 0, Math.PI * 2);
  ctx.fillStyle = o.somaColor ?? (o.dim ? 'rgba(100,116,139,0.7)' : '#e2e8f0');
  ctx.fill();
  ctx.shadowBlur = 0;
}
