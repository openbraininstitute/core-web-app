/**
 * Canvas rendering for the neuron widget: the 2D cell with its electrodes and
 * post-synaptic partners, plus the scrolling voltage traces.
 *
 * All neuron drawing happens in model space (see morphology.ts); the canvas
 * transform maps that space into the available pixels, so hit-testing just uses
 * the inverse of the same transform.
 */

import { raised, screen, screenTop } from '@/features/learn/lib/theme';

import { excitation, V_MAX, V_MIN, voltageColor } from './colormap';
import {
  COMPARTMENTS,
  type Compartment,
  ELECTRODES,
  SECTION_COLOR,
  SOMA,
  TARGETS,
  TERMINAL,
  VIEW,
} from './morphology';
import { type NeuronSim, SPIKE_THRESHOLD, V_REST } from './sim';

const FONT = 'ui-sans-serif, -apple-system, Segoe UI, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

export interface Transform {
  s: number;
  ox: number;
  oy: number;
  toModel(px: number, py: number): [number, number];
}

export function makeTransform(cssW: number, cssH: number): Transform {
  const vw = VIEW.x1 - VIEW.x0;
  const vh = VIEW.y1 - VIEW.y0;
  // Capped so that on very large canvases the diagram (and the text drawn in
  // model units) grows to a comfortable size rather than filling everything.
  const s = Math.min(cssW / vw, cssH / vh, 1.55);
  const ox = (cssW - s * vw) / 2 - VIEW.x0 * s;
  const oy = (cssH - s * vh) / 2 - VIEW.y0 * s;
  return {
    s,
    ox,
    oy,
    toModel: (px, py) => [(px - ox) / s, (py - oy) / s],
  };
}

/** How brightly a compartment should glow, 0..1. */
const glowOf = (v: number) => excitation(v);

const norm = ([x, y]: [number, number]): [number, number] => {
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
};

/** Outer (connector) end of an electrode pipette, in model space. */
export function electrodeAnchor(idx: number): [number, number] {
  const e = ELECTRODES[idx];
  const c = COMPARTMENTS[e.comp];
  const [dx, dy] = norm(e.dir);
  return [c.x + dx * 92, c.y + dy * 92];
}

function electrodeTip(idx: number): [number, number] {
  const e = ELECTRODES[idx];
  const c = COMPARTMENTS[e.comp];
  const [dx, dy] = norm(e.dir);
  return [c.x + dx * (c.r + 1), c.y + dy * (c.r + 1)];
}

export type Pick = { kind: 'electrode'; index: number } | { kind: 'comp'; index: number } | null;

/** What is under the cursor, given CSS pixel coordinates on the canvas. */
export function pickAt(px: number, py: number, cssW: number, cssH: number): Pick {
  const t = makeTransform(cssW, cssH);
  const [x, y] = t.toModel(px, py);

  // Connector knobs first, then compartment bodies, then pipette shafts: a
  // shaft always starts right next to its compartment, so the compartment has
  // to win there or it could never be selected.
  for (let i = 0; i < ELECTRODES.length; i++) {
    const [ax, ay] = electrodeAnchor(i);
    if (Math.hypot(x - ax, y - ay) < 20) return { kind: 'electrode', index: i };
  }
  for (const c of COMPARTMENTS) {
    if (Math.hypot(x - c.x, y - c.y) < Math.max(c.r + 4, 10)) return { kind: 'comp', index: c.id };
  }
  for (let i = 0; i < ELECTRODES.length; i++) {
    const [ax, ay] = electrodeAnchor(i);
    const [tx, ty] = electrodeTip(i);
    if (distToSegment(x, y, tx, ty, ax, ay) < 9) return { kind: 'electrode', index: i };
  }
  return null;
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export interface NeuronViewOpts {
  sim: NeuronSim;
  /** Amplitude currently dialled in on each electrode, nA. */
  amps: number[];
  /** Whether each electrode is holding its current on. */
  holds: boolean[];
  hoverComp: number | null;
  hoverElectrode: number | null;
  /** Compartments plotted in the trace panel (highlighted in the drawing). */
  selected: number[];
  showLabels: boolean;
  /** performance.now(), used only for cosmetic animation. */
  wallClock: number;
}

export function drawNeuron(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  dpr: number,
  o: NeuronViewOpts
) {
  const { sim } = o;
  const t = makeTransform(cssW, cssH);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  const bg = ctx.createLinearGradient(0, 0, 0, cssH);
  bg.addColorStop(0, screenTop());
  bg.addColorStop(1, screen());
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cssW, cssH);

  ctx.setTransform(dpr * t.s, 0, 0, dpr * t.s, dpr * t.ox, dpr * t.oy);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // The visible region in model coordinates. It is at least VIEW, but usually
  // wider or taller because the scale is uniform — HUD elements are anchored to
  // it so they sit in the canvas corners instead of floating over the cell.
  const visible = {
    x0: -t.ox / t.s,
    y0: -t.oy / t.s,
    x1: (cssW - t.ox) / t.s,
    y1: (cssH - t.oy) / t.s,
  };

  drawGrid(ctx, visible);
  drawSynapses(ctx, o);
  drawSegments(ctx, o);
  drawNodes(ctx, o);
  drawElectrodes(ctx, o);
  if (o.showLabels) drawLabels(ctx);
  drawHud(ctx, sim, visible);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function drawGrid(ctx: CanvasRenderingContext2D, r: Rect) {
  ctx.save();
  ctx.strokeStyle = 'rgba(148,163,184,0.055)';
  ctx.lineWidth = 1;
  for (let x = Math.ceil(r.x0 / 50) * 50; x < r.x1; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, r.y0);
    ctx.lineTo(x, r.y1);
    ctx.stroke();
  }
  for (let y = Math.ceil(r.y0 / 50) * 50; y < r.y1; y += 50) {
    ctx.beginPath();
    ctx.moveTo(r.x0, y);
    ctx.lineTo(r.x1, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** Neurite segments, coloured by the membrane potential at each end. */
function drawSegments(ctx: CanvasRenderingContext2D, o: NeuronViewOpts) {
  const v = o.sim.v;
  for (const c of COMPARTMENTS) {
    if (c.parent < 0) continue;
    const p = COMPARTMENTS[c.parent];
    const w = Math.max(2.5, (c.r + p.r) * 0.45);
    const g = ctx.createLinearGradient(p.x, p.y, c.x, c.y);
    g.addColorStop(0, voltageColor(v[p.id]));
    g.addColorStop(1, voltageColor(v[c.id]));

    const exc = Math.max(glowOf(v[c.id]), glowOf(v[p.id]));
    ctx.save();
    if (exc > 0.05) {
      ctx.shadowColor = voltageColor(Math.max(v[c.id], v[p.id]), 0.9);
      ctx.shadowBlur = 26 * exc;
    }
    // dark casing so thin neurites stay visible against the background
    ctx.strokeStyle = 'rgba(2,6,16,0.9)';
    ctx.lineWidth = w + 2.4;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();

    ctx.strokeStyle = g;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();
    ctx.restore();
  }
}

function drawNodes(ctx: CanvasRenderingContext2D, o: NeuronViewOpts) {
  const v = o.sim.v;
  const selected = new Set(o.selected);
  for (const c of COMPARTMENTS) {
    const exc = glowOf(v[c.id]);
    ctx.save();
    if (exc > 0.05) {
      ctx.shadowColor = voltageColor(v[c.id], 0.95);
      ctx.shadowBlur = 34 * exc;
    }
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fillStyle = voltageColor(v[c.id]);
    ctx.fill();
    ctx.restore();

    ctx.lineWidth = 1.2;
    ctx.strokeStyle = screen(0.85);
    ctx.stroke();

    if (selected.has(c.id)) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r + 5, 0, Math.PI * 2);
      ctx.strokeStyle = SECTION_COLOR[c.type];
      ctx.lineWidth = 1.8;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (o.hoverComp === c.id) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r + 9, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(226,232,240,0.75)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      tooltip(ctx, c, v[c.id]);
    }
  }

  // compartment index inside the soma and the terminal
  ctx.fillStyle = screen(0.8);
  ctx.font = `600 11px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const soma = COMPARTMENTS[SOMA];
  ctx.fillText('0', soma.x, soma.y);
}

function tooltip(ctx: CanvasRenderingContext2D, c: Compartment, v: number) {
  const lines = [`${c.label}  (#${c.id})`, `${v.toFixed(1)} mV`, `d ${c.diam} µm · L ${c.len} µm`];
  ctx.font = `11px ${FONT}`;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 14;
  const h = lines.length * 14 + 10;
  let x = c.x + c.r + 10;
  let y = c.y - h / 2;
  if (x + w > VIEW.x1) x = c.x - c.r - 10 - w;
  y = Math.max(VIEW.y0 + 2, Math.min(VIEW.y1 - h - 2, y));

  ctx.fillStyle = screen(0.94);
  ctx.strokeStyle = 'rgba(148,163,184,0.35)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 5);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => {
    ctx.fillStyle = i === 0 ? '#e2e8f0' : '#94a3b8';
    ctx.font = i === 0 ? `600 11px ${FONT}` : `11px ${MONO}`;
    ctx.fillText(l, x + 7, y + 5 + i * 14);
  });
}

function drawElectrodes(ctx: CanvasRenderingContext2D, o: NeuronViewOpts) {
  ELECTRODES.forEach((e, i) => {
    const c = COMPARTMENTS[e.comp];
    const [tx, ty] = electrodeTip(i);
    const [ax, ay] = electrodeAnchor(i);
    const [dx, dy] = norm(e.dir);
    const [nx, ny] = [-dy, dx];
    const cur = o.sim.currentAt(e.comp);
    const flowing = Math.abs(cur) > 1e-6;
    const hovered = o.hoverElectrode === i;
    const accent = cur < 0 ? '#60a5fa' : '#fbbf24';

    // glass pipette
    ctx.beginPath();
    ctx.moveTo(tx + nx * 2.6, ty + ny * 2.6);
    ctx.lineTo(ax + nx * 9, ay + ny * 9);
    ctx.lineTo(ax - nx * 9, ay - ny * 9);
    ctx.lineTo(tx - nx * 2.6, ty - ny * 2.6);
    ctx.closePath();
    ctx.fillStyle = flowing ? 'rgba(251,191,36,0.10)' : 'rgba(226,232,240,0.07)';
    ctx.fill();
    ctx.strokeStyle = hovered
      ? 'rgba(226,232,240,0.85)'
      : flowing
        ? accent
        : 'rgba(148,163,184,0.45)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // current flowing towards the cell
    if (flowing) {
      ctx.save();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.2;
      ctx.setLineDash([5, 9]);
      const phase = (o.wallClock / 26) % 14;
      ctx.lineDashOffset = cur < 0 ? phase : -phase;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowColor = accent;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(tx, ty, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.restore();
    }

    // connector knob
    ctx.beginPath();
    ctx.arc(ax, ay, 13, 0, Math.PI * 2);
    ctx.fillStyle = flowing ? 'rgba(251,191,36,0.22)' : raised(0.95);
    ctx.fill();
    ctx.strokeStyle = hovered ? '#e2e8f0' : flowing ? accent : 'rgba(148,163,184,0.6)';
    ctx.lineWidth = hovered ? 2 : 1.4;
    ctx.stroke();

    ctx.fillStyle = flowing ? '#fde68a' : '#cbd5e1';
    ctx.font = `600 11px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e.id, ax, ay);

    // amplitude / hold label just outside the knob
    const lx = ax + dx * 20;
    const ly = ay + dy * 20;
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = o.holds[i] ? accent : 'rgba(148,163,184,0.9)';
    ctx.textAlign = dx > 0.3 ? 'left' : dx < -0.3 ? 'right' : 'center';
    ctx.textBaseline = dy > 0.3 ? 'top' : dy < -0.3 ? 'bottom' : 'middle';
    ctx.fillText(
      `${o.amps[i] >= 0 ? '+' : ''}${o.amps[i].toFixed(2)} nA${o.holds[i] ? ' ⟲' : ''}`,
      lx,
      ly
    );
    void c;
  });
}

/** Axon terminal -> post-synaptic partners, with spikes travelling along. */
function drawSynapses(ctx: CanvasRenderingContext2D, o: NeuronViewOpts) {
  const { sim } = o;
  const term = COMPARTMENTS[TERMINAL];
  const recent = sim.spikes.filter((s) => s.source === 'terminal').slice(-24);

  TARGETS.forEach((tg) => {
    // connection
    ctx.beginPath();
    ctx.moveTo(term.x, term.y);
    ctx.quadraticCurveTo(tg.cx, tg.cy, tg.x - 14, tg.y);
    ctx.strokeStyle = 'rgba(148,163,184,0.28)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([2, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // flash after the spike arrives
    let flash = 0;
    for (const s of recent) {
      const since = sim.t - s.t - tg.delay;
      if (since >= 0 && since < 6) flash = Math.max(flash, 1 - since / 6);
    }
    drawTargetNeuron(ctx, tg.x, tg.y, flash);

    // travelling spikes
    for (const s of recent) {
      const p = (sim.t - s.t) / tg.delay;
      if (p < 0 || p > 1) continue;
      const [px, py] = quad(term.x, term.y, tg.cx, tg.cy, tg.x - 14, tg.y, p);
      ctx.save();
      ctx.shadowColor = '#f472b6';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(px, py, 4.6, 0, Math.PI * 2);
      ctx.fillStyle = '#fbcfe8';
      ctx.fill();
      ctx.restore();
    }
  });
}

function drawTargetNeuron(ctx: CanvasRenderingContext2D, x: number, y: number, flash: number) {
  ctx.save();
  // dendrites + axon stub
  ctx.strokeStyle =
    flash > 0 ? `rgba(244,114,182,${0.45 + 0.5 * flash})` : 'rgba(100,116,139,0.55)';
  ctx.lineWidth = 2;
  for (const [ax, ay] of [
    [-16, -14],
    [14, -16],
    [18, 12],
    [-14, 16],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + ax, y + ay);
    ctx.stroke();
  }
  if (flash > 0) {
    ctx.shadowColor = '#f472b6';
    ctx.shadowBlur = 26 * flash;
  }
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fillStyle = flash > 0 ? `rgba(244,114,182,${0.35 + 0.6 * flash})` : 'rgba(51,65,85,0.9)';
  ctx.fill();
  ctx.strokeStyle = flash > 0 ? '#f9a8d4' : 'rgba(148,163,184,0.6)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

function quad(
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  t: number
): [number, number] {
  const u = 1 - t;
  return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1];
}

function drawLabels(ctx: CanvasRenderingContext2D) {
  const labels: [string, number, number, CanvasTextAlign][] = [
    ['apical dendrites', 0, -212, 'center'],
    ['basal dendrites', -152, 18, 'center'],
    ['soma', 26, -16, 'left'],
    ['axon', -22, 124, 'right'],
    ['terminal', -22, 212, 'right'],
    ['post-synaptic neurons', 190, 322, 'center'],
  ];
  ctx.font = `500 11px ${FONT}`;
  ctx.fillStyle = 'rgba(148,163,184,0.7)';
  ctx.textBaseline = 'middle';
  for (const [text, x, y, align] of labels) {
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
  }
}

/** Clock, model summary and the colour scale, anchored to the canvas corners. */
function drawHud(ctx: CanvasRenderingContext2D, sim: NeuronSim, r: Rect) {
  const x = r.x0 + 14;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `600 13px ${MONO}`;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`t = ${sim.t.toFixed(1)} ms`, x, r.y0 + 12);
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = 'rgba(148,163,184,0.85)';
  ctx.fillText('20 compartments', x, r.y0 + 32);
  ctx.fillText(`V rest ${V_REST} mV`, x, r.y0 + 47);

  const w = 150;
  const h = 9;
  const y = r.y1 - 34;
  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = 'rgba(148,163,184,0.85)';
  ctx.fillText('membrane potential (mV)', x, y - 15);

  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  for (let i = 0; i <= 10; i++) {
    g.addColorStop(i / 10, voltageColor(V_MIN + ((V_MAX - V_MIN) * i) / 10));
  }
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(148,163,184,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = 'rgba(148,163,184,0.85)';
  ctx.fillText(`${V_MIN}`, x, y + h + 3);
  ctx.textAlign = 'right';
  ctx.fillText(`+${V_MAX}`, x + w, y + h + 3);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// Voltage traces
// ---------------------------------------------------------------------------

export interface TraceViewOpts {
  sim: NeuronSim;
  comps: number[];
  windowMs: number;
}

export function drawTraces(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  dpr: number,
  o: TraceViewOpts
) {
  const { sim, comps, windowMs } = o;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.fillStyle = screen();
  ctx.fillRect(0, 0, cssW, cssH);

  const padL = 46;
  const padR = 148;
  const padT = 22; // spike raster rows live here
  const padB = 26;
  const plotW = Math.max(10, cssW - padL - padR);
  const plotH = Math.max(10, cssH - padT - padB);
  const vLo = -95;
  const vHi = 55;

  const tMax = Math.max(sim.t, windowMs);
  const tMin = tMax - windowMs;
  const xOf = (t: number) => padL + ((t - tMin) / windowMs) * plotW;
  const yOf = (v: number) => padT + ((vHi - v) / (vHi - vLo)) * plotH;

  // grid + axes
  ctx.strokeStyle = 'rgba(148,163,184,0.12)';
  ctx.fillStyle = 'rgba(148,163,184,0.75)';
  ctx.lineWidth = 1;
  ctx.font = `10px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const v of [40, 0, -40, -80]) {
    const y = Math.round(yOf(v)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.strokeStyle = v === 0 ? 'rgba(148,163,184,0.25)' : 'rgba(148,163,184,0.1)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(148,163,184,0.75)';
    ctx.fillText(`${v > 0 ? '+' : ''}${v}`, padL - 6, y);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const tickStep = windowMs <= 30 ? 5 : windowMs <= 80 ? 10 : 20;
  for (let tt = Math.ceil(tMin / tickStep) * tickStep; tt <= tMax; tt += tickStep) {
    const x = Math.round(xOf(tt)) + 0.5;
    ctx.strokeStyle = 'rgba(148,163,184,0.1)';
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + plotH);
    ctx.stroke();
    ctx.fillStyle = 'rgba(148,163,184,0.7)';
    ctx.fillText(`${tt.toFixed(0)}`, x, padT + plotH + 6);
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(148,163,184,0.7)';
  ctx.fillText('time (ms)', padL, padT + plotH + 6 + 12);
  ctx.save();
  ctx.translate(12, padT + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('membrane potential (mV)', 0, 0);
  ctx.restore();

  // threshold marker
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(248,113,113,0.35)';
  ctx.beginPath();
  ctx.moveTo(padL, yOf(SPIKE_THRESHOLD));
  ctx.lineTo(padL + plotW, yOf(SPIKE_THRESHOLD));
  ctx.stroke();
  ctx.setLineDash([]);

  // stimulus markers
  ctx.fillStyle = 'rgba(251,191,36,0.85)';
  for (const s of sim.stims) {
    if (s.t < tMin) continue;
    const x = xOf(s.t);
    ctx.beginPath();
    ctx.moveTo(x - 4, padT + plotH);
    ctx.lineTo(x + 4, padT + plotH);
    ctx.lineTo(x, padT + plotH - 7);
    ctx.closePath();
    ctx.fill();
  }

  // traces
  ctx.save();
  ctx.beginPath();
  ctx.rect(padL, padT - 2, plotW, plotH + 4);
  ctx.clip();
  for (const c of comps) {
    const col = SECTION_COLOR[COMPARTMENTS[c].type];
    ctx.strokeStyle = col;
    ctx.lineWidth = c === SOMA ? 1.9 : 1.4;
    ctx.beginPath();
    let started = false;
    let lastX = padL;
    let lastY = yOf(V_REST);
    for (let k = 0; k < sim.traceCount; k++) {
      const idx = sim.traceIndex(k);
      const tt = sim.traceT[idx];
      if (tt < tMin) continue;
      const x = xOf(tt);
      const y = yOf(sim.traceV[c][idx]);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
      lastX = x;
      lastY = y;
    }
    if (!started) {
      ctx.moveTo(padL, yOf(V_REST));
      lastX = padL;
      lastY = yOf(V_REST);
    }
    ctx.stroke();

    // live marker + label
    ctx.beginPath();
    ctx.arc(lastX, lastY, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
  }
  ctx.restore();

  // right-hand legend: one row per plotted compartment
  ctx.font = `11px ${MONO}`;
  ctx.textBaseline = 'middle';
  comps.forEach((c, i) => {
    const y = padT + 8 + i * 17;
    const col = SECTION_COLOR[COMPARTMENTS[c].type];
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padL + plotW + 8, y);
    ctx.lineTo(padL + plotW + 20, y);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(COMPARTMENTS[c].label, padL + plotW + 25, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(148,163,184,0.85)';
    ctx.fillText(`${sim.v[c].toFixed(0)} mV`, cssW - 6, y);
  });

  // spike rasters along the top, labelled in the right-hand gutter
  const rows: [string, string, 'soma' | 'terminal', number][] = [
    ['soma spike', '#f8fafc', 'soma', 5],
    ['output spike', '#f472b6', 'terminal', 13],
  ];
  ctx.textBaseline = 'middle';
  ctx.font = `9px ${MONO}`;
  rows.forEach(([label, color, src, y]) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(148,163,184,0.6)';
    ctx.fillText(label, padL + plotW + 25, y + 3);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(padL + plotW + 14, y);
    ctx.lineTo(padL + plotW + 14, y + 7);
    ctx.stroke();
    for (const s of sim.spikes) {
      if (s.source !== src || s.t < tMin) continue;
      const x = xOf(s.t);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 7);
      ctx.stroke();
    }
  });

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
