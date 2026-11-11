'use client';

/**
 * Widget: a neuron collecting excitatory and inhibitory input.
 *
 * The soma is a leaky integrate-and-fire unit — deliberately the simplest model
 * that captures "inputs add up, and if they add up enough the cell spikes and
 * passes a signal on". Hodgkin–Huxley channels come later.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import Slider from '@/features/learn/components/ui/Slider';
import { DEFAULT_LIF, Lif, poissonEvents } from '@/features/learn/lib/basics/lif';
import {
  buildMorphology,
  drawMorphology,
  fitMorphology,
} from '@/features/learn/lib/basics/morphologies';
import { FONT, fillPanel, MONO } from '@/features/learn/lib/basics/soma';

import { useCanvasFrame } from './useCanvasFrame';

const EPSP = 8; // mV per excitatory input
const IPSP = -8; // mV per inhibitory input
const TRAVEL_MS = 60; // simulated time for an input to reach the soma
const AXON_MS = 60; // simulated time for an output spike to run the length of the axon
const TRACE_MS = 700;
const DT = 0.25; // ms

/** Playback speed as a fraction of real time. */
const SPEEDS = [0.02, 0.05, 0.1, 0.2, 0.5, 1] as const;
const speedLabel = (s: number) => (s === 1 ? 'real time' : `1/${Math.round(1 / s)} real time`);

interface Dot {
  synapse: number;
  born: number;
  excitatory: boolean;
}

export default function ExcitationWidget() {
  const [eRate, setERate] = useState(150);
  const [iRate, setIRate] = useState(30);
  const [speedIdx, setSpeedIdx] = useState(2); // 1/10 real time
  const [running, setRunning] = useState(true);
  const [stats, setStats] = useState({ v: DEFAULT_LIF.vRest, spikes: 0, rate: 0 });

  const morph = useMemo(() => buildMorphology('pyramidal'), []);

  /** Synapses: distant tips are excitatory, tips nearest the soma inhibitory. */
  const synapses = useMemo(() => {
    const withDist = morph.tips.map((t, i) => ({
      ...t,
      i,
      d: Math.hypot(t.x - morph.soma.x, t.y - morph.soma.y),
    }));
    withDist.sort((a, b) => b.d - a.d);
    const exc = withDist.filter((_, k) => k % 4 === 0).slice(0, 12);
    const inh = withDist
      .slice(-14)
      .filter((_, k) => k % 3 === 0)
      .slice(0, 5);
    return [
      ...exc.map((t) => ({ x: t.x, y: t.y, excitatory: true })),
      ...inh.map((t) => ({ x: t.x, y: t.y, excitatory: false })),
    ];
  }, [morph]);

  const st = useRef({
    lif: new Lif(),
    dots: [] as Dot[],
    flash: new Float32Array(synapses.length),
    trace: [] as { t: number; v: number }[],
    /** Leftover simulated time from the previous frame. */
    acc: 0,
    rnd: Math.random,
  });
  const cfg = useRef({ eRate, iRate, running, speed: SPEEDS[speedIdx] });
  useEffect(() => {
    cfg.current = { eRate, iRate, running, speed: SPEEDS[speedIdx] };
  }, [eRate, iRate, running, speedIdx]);

  const reset = () => {
    const s = st.current;
    s.lif.reset();
    s.dots = [];
    s.trace = [];
    s.flash.fill(0);
    s.acc = 0;
    setStats({ v: DEFAULT_LIF.vRest, spikes: 0, rate: 0 });
  };

  const lastNow = useRef(0);
  const frames = useRef(0);

  const canvasRef = useCanvasFrame((ctx, w, h, now) => {
    const s = st.current;
    const c = cfg.current;
    const excCount = synapses.filter((x) => x.excitatory).length;
    const inhCount = synapses.length - excCount;

    // ---- advance in slowed-down simulated time ----
    const dtWall = lastNow.current ? Math.min(50, now - lastNow.current) : 16;
    lastNow.current = now;
    let simMs = 0;
    if (c.running) {
      simMs = dtWall * c.speed;
      // keep the leftover so slow playback stays accurate instead of rounding
      // every frame up to a whole step
      s.acc += simMs;
      while (s.acc >= DT) {
        s.acc -= DT;
        const t = s.lif.t;
        // new input events, spread over the synapses
        synapses.forEach((syn, idx) => {
          const rate = syn.excitatory ? c.eRate / excCount : c.iRate / inhCount;
          const n = poissonEvents(rate, DT, s.rnd);
          for (let e = 0; e < n; e++)
            s.dots.push({ synapse: idx, born: t, excitatory: syn.excitatory });
        });
        // inputs that have arrived
        for (let d = s.dots.length - 1; d >= 0; d--) {
          if (t - s.dots[d].born >= TRAVEL_MS) {
            const dot = s.dots[d];
            s.lif.input(dot.excitatory ? EPSP : IPSP);
            s.flash[dot.synapse] = 1;
            s.dots.splice(d, 1);
          }
        }
        if (s.dots.length > 400) s.dots.splice(0, s.dots.length - 400);
        s.lif.step(DT);
        s.trace.push({ t: s.lif.t, v: s.lif.v });
      }
      while (s.trace.length && s.trace[0].t < s.lif.t - TRACE_MS) s.trace.shift();
      for (let i = 0; i < s.flash.length; i++) s.flash[i] = Math.max(0, s.flash[i] - simMs / 70);
    }

    const spikes = s.lif.spikes;
    const sinceSpike = s.lif.t - (spikes[spikes.length - 1] ?? -1e9);
    const activity = sinceSpike < 12 ? 1 - sinceSpike / 12 : 0;

    // ---- draw ----
    fillPanel(ctx, w, h);
    const traceH = 78;
    const cellBox = { x: 0, y: 4, w: w, h: h - traceH - 10 };
    const f = fitMorphology(morph, cellBox, 26);
    drawMorphology(ctx, morph, f, { activity });

    // synapses
    synapses.forEach((syn, idx) => {
      const x = f.tx(syn.x);
      const y = f.ty(syn.y);
      const fl = st.current.flash[idx];
      const col = syn.excitatory ? '#34d399' : '#f87171';
      ctx.beginPath();
      ctx.arc(x, y, 3 + fl * 3, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.45 + fl * 0.55;
      if (fl > 0.05) {
        ctx.shadowColor = col;
        ctx.shadowBlur = 14 * fl;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    });

    // travelling inputs
    for (const d of s.dots) {
      const syn = synapses[d.synapse];
      const p = Math.min(1, (s.lif.t - d.born) / TRAVEL_MS);
      const outAngle = Math.atan2(syn.y - morph.soma.y, syn.x - morph.soma.x);
      const dist = (1 - p) * 46;
      const x = f.tx(syn.x) + Math.cos(outAngle) * dist;
      const y = f.ty(syn.y) + Math.sin(outAngle) * dist;
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = d.excitatory ? 'rgba(52,211,153,0.9)' : 'rgba(248,113,113,0.9)';
      ctx.fill();
    }

    // output spikes running down the axon — every one still on its way, not
    // just the latest, so a burst shows as a train of pulses
    const pts = morph.axon;
    for (let k = spikes.length - 1; k >= 0; k--) {
      const since = s.lif.t - spikes[k];
      if (since >= AXON_MS) break; // the rest are older still, and have arrived
      const p = since / AXON_MS;
      const seg = Math.min(pts.length - 2, Math.floor(p * (pts.length - 1)));
      const local = p * (pts.length - 1) - seg;
      const x = f.tx(pts[seg].x + (pts[seg + 1].x - pts[seg].x) * local);
      const y = f.ty(pts[seg].y + (pts[seg + 1].y - pts[seg].y) * local);
      ctx.save();
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(x, y, 4.4, 0, Math.PI * 2);
      ctx.fillStyle = '#fde68a';
      ctx.fill();
      ctx.restore();
    }

    // legend
    ctx.font = `10px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#34d399';
    ctx.fillText('● excitatory input', 12, 16);
    ctx.fillStyle = '#f87171';
    ctx.fillText('● inhibitory input', 12, 32);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('● output spike', 12, 48);
    ctx.fillStyle = 'rgba(148,163,184,0.75)';
    ctx.fillText(`${speedLabel(c.speed)} · t = ${(s.lif.t / 1000).toFixed(2)} s`, 12, 66);

    // ---- voltage trace ----
    const ty = h - traceH;
    const padL = 42;
    const pw = w - padL - 12;
    const vLo = -85;
    const vHi = -44;
    const yOf = (v: number) => ty + ((vHi - v) / (vHi - vLo)) * (traceH - 22);
    const xOf = (t: number) => padL + ((t - (s.lif.t - TRACE_MS)) / TRACE_MS) * pw;

    ctx.strokeStyle = 'rgba(148,163,184,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, ty - 6);
    ctx.lineTo(padL + pw, ty - 6);
    ctx.stroke();

    ctx.font = `9px ${MONO}`;
    ctx.textAlign = 'right';
    for (const [v, label] of [
      [DEFAULT_LIF.vThresh, 'threshold'],
      [DEFAULT_LIF.vRest, 'rest'],
    ] as [number, string][]) {
      const y = yOf(v);
      ctx.strokeStyle =
        v === DEFAULT_LIF.vThresh ? 'rgba(248,113,113,0.4)' : 'rgba(148,163,184,0.3)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + pw, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(148,163,184,0.75)';
      ctx.fillText(label, padL - 5, y + 3);
    }

    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    let started = false;
    for (const pt of s.trace) {
      const x = xOf(pt.t);
      const y = yOf(Math.max(vLo, Math.min(vHi, pt.v)));
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // spike ticks
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.4;
    for (const t of s.lif.spikes) {
      if (t < s.lif.t - TRACE_MS) continue;
      const x = xOf(t);
      ctx.beginPath();
      ctx.moveTo(x, ty - 2);
      ctx.lineTo(x, ty + 6);
      ctx.stroke();
    }

    if (++frames.current % 6 === 0) {
      setStats({ v: s.lif.v, spikes: s.lif.spikeCount, rate: s.lif.rateHz() });
    }
  });

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
      <canvas ref={canvasRef} className="h-[360px] w-full rounded-xl border border-slate-800" />
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
          <Slider
            label="excitatory input"
            value={eRate}
            min={0}
            max={400}
            step={10}
            unit=" Hz"
            onChange={setERate}
            accent="accent-emerald-400"
          />
          <Slider
            label="inhibitory input"
            value={iRate}
            min={0}
            max={400}
            step={10}
            unit=" Hz"
            onChange={setIRate}
            accent="accent-rose-400"
          />
          <Slider
            label="speed"
            value={speedIdx}
            min={0}
            max={SPEEDS.length - 1}
            step={1}
            display={speedLabel(SPEEDS[speedIdx])}
            onChange={setSpeedIdx}
            accent="accent-sky-400"
          />
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              className="flex-1 rounded border border-slate-700 py-1 text-[11px] text-slate-300 hover:bg-slate-700/50"
            >
              {running ? '❚❚ pause' : '▶ run'}
            </button>
            <button
              type="button"
              onClick={reset}
              className="flex-1 rounded border border-slate-700 py-1 text-[11px] text-slate-300 hover:bg-slate-700/50"
            >
              ⟲ reset
            </button>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 font-mono text-[11px]">
          <Row label="membrane" value={`${stats.v.toFixed(1)} mV`} />
          <Row label="spikes sent" value={String(stats.spikes)} strong />
          <Row label="rate" value={`${stats.rate.toFixed(0)} Hz`} />
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
            Inputs add up and leak away. Cross the threshold and the cell fires, sending its own
            signal down the axon to the next neurons.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5">
      <span className="text-slate-500">{label}</span>
      <span className={strong ? 'text-sky-300' : 'text-slate-200'}>{value}</span>
    </div>
  );
}
