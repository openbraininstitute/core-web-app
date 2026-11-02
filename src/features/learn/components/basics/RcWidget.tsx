'use client';

/**
 * Widget 4 — charging the soma takes time.
 *
 * A passive soma (no voltage-gated channels yet) is driven with a current step
 * from a pipette. The voltage does not jump; it charges along an exponential
 * with τ = R·C, and settles at I·R.
 */

import { useEffect, useRef, useState } from 'react';

import Slider from '@/features/learn/components/ui/Slider';
import { drawSoma, FONT, fillPanel, MONO } from '@/features/learn/lib/basics/soma';
import { capacitance, sphereAreaCm2, tauMs } from '@/features/learn/lib/biophysics/membrane';

import { useCanvasFrame } from './useCanvasFrame';

const V_REST = -70;
const WINDOW_MS = 60;
const DT = 0.01; // ms
const SAMPLES = Math.round(WINDOW_MS / DT);

export default function RcWidget() {
  const [iNa, setINa] = useState(0.1);
  const [rMohm, setRMohm] = useState(150);
  const [diamUm, setDiamUm] = useState(20);
  const [durMs, setDurMs] = useState(20);
  const [running, setRunning] = useState(true);

  const cPf = capacitance(sphereAreaCm2(diamUm)) * 1e12;
  const tau = tauMs(rMohm, cPf);
  const steady = iNa * rMohm;

  // simulation state kept out of React
  const st = useRef({
    t: 0,
    v: V_REST,
    vBuf: new Float32Array(SAMPLES),
    iBuf: new Float32Array(SAMPLES),
    tBuf: new Float32Array(SAMPLES),
    head: 0,
    count: 0,
    pulseEnd: -1,
    hold: false,
    stimT: [] as number[],
  });
  const cfg = useRef({ iNa, rMohm, cPf, durMs, running });
  useEffect(() => {
    cfg.current = { iNa, rMohm, cPf, durMs, running };
  }, [iNa, rMohm, cPf, durMs, running]);

  const inject = () => {
    const s = st.current;
    s.pulseEnd = s.t + cfg.current.durMs;
    s.stimT.push(s.t);
    if (s.stimT.length > 40) s.stimT.shift();
  };
  const reset = () => {
    const s = st.current;
    s.t = 0;
    s.v = V_REST;
    s.head = 0;
    s.count = 0;
    s.pulseEnd = -1;
    s.hold = false;
    s.stimT = [];
    setHold(false);
  };
  const [hold, setHold] = useState(false);
  useEffect(() => {
    st.current.hold = hold;
  }, [hold]);

  const lastNow = useRef(0);

  const canvasRef = useCanvasFrame((ctx, w, h, now) => {
    const s = st.current;
    const c = cfg.current;

    // --- advance the passive membrane: C dV/dt = I - (V - V_rest)/R ---
    const dtWall = lastNow.current ? Math.min(60, now - lastNow.current) : 16;
    lastNow.current = now;
    if (c.running) {
      const simMs = Math.min(12, (dtWall / 1000) * 60); // 60 simulated ms per real second
      const steps = Math.max(1, Math.round(simMs / DT));
      for (let k = 0; k < steps; k++) {
        const i = (s.hold ? c.iNa : 0) + (s.t < s.pulseEnd ? c.iNa : 0);
        // nA / pF -> mV/ms  (1 nA / 1 pF = 1000 mV/ms)
        const dv = ((i - (s.v - V_REST) / c.rMohm) / c.cPf) * 1000;
        s.v += dv * DT;
        s.t += DT;
        s.vBuf[s.head] = s.v;
        s.iBuf[s.head] = i;
        s.tBuf[s.head] = s.t;
        s.head = (s.head + 1) % SAMPLES;
        if (s.count < SAMPLES) s.count++;
      }
    }

    // --- draw ---
    fillPanel(ctx, w, h);
    const somaW = Math.min(200, w * 0.28);
    const L = { cx: somaW / 2 + 16, cy: h / 2, r: Math.min(h / 2 - 34, somaW / 2 - 14) };
    drawSoma(ctx, L, s.v, { labels: false });

    // pipette
    const iNow = (s.hold ? c.iNa : 0) + (s.t < s.pulseEnd ? c.iNa : 0);
    const tipX = L.cx - L.r * 0.5;
    const tipY = L.cy - L.r * 0.5;
    ctx.strokeStyle = iNow !== 0 ? '#fbbf24' : 'rgba(148,163,184,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(L.cx - L.r - 14, L.cy - L.r - 14);
    ctx.stroke();
    if (iNow !== 0) {
      ctx.save();
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.restore();
    }
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = iNow !== 0 ? '#fde68a' : 'rgba(148,163,184,0.8)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${iNow.toFixed(2)} nA`, L.cx, h - 14);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `600 13px ${MONO}`;
    ctx.fillText(`${s.v.toFixed(1)} mV`, L.cx, L.cy);

    // --- the trace ---
    const padL = somaW + 58;
    const padR = 16;
    const padT = 18;
    const padB = 30;
    const pw = Math.max(20, w - padL - padR);
    const ph = Math.max(20, h - padT - padB);
    const vLo = Math.min(V_REST - 12, V_REST + Math.min(0, steady) - 8);
    const vHi = Math.max(V_REST + 14, V_REST + Math.max(0, steady) + 10);
    const tMax = Math.max(s.t, WINDOW_MS);
    const tMin = tMax - WINDOW_MS;
    const xOf = (t: number) => padL + ((t - tMin) / WINDOW_MS) * pw;
    const yOf = (v: number) => padT + ((vHi - v) / (vHi - vLo)) * ph;

    // axes
    ctx.strokeStyle = 'rgba(148,163,184,0.12)';
    ctx.fillStyle = 'rgba(148,163,184,0.7)';
    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'right';
    for (const v of niceTicks(vLo, vHi)) {
      const y = Math.round(yOf(v)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + pw, y);
      ctx.stroke();
      ctx.fillText(`${v}`, padL - 6, y + 3);
    }
    ctx.textAlign = 'center';
    for (let t = Math.ceil(tMin / 10) * 10; t <= tMax; t += 10) {
      const x = Math.round(xOf(t)) + 0.5;
      ctx.strokeStyle = 'rgba(148,163,184,0.1)';
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + ph);
      ctx.stroke();
      ctx.fillStyle = 'rgba(148,163,184,0.7)';
      ctx.fillText(`${t.toFixed(0)}`, x, padT + ph + 12);
    }
    ctx.textAlign = 'left';
    ctx.fillText('time (ms)', padL, padT + ph + 24);

    // rest and steady-state guides
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.beginPath();
    ctx.moveTo(padL, yOf(V_REST));
    ctx.lineTo(padL + pw, yOf(V_REST));
    ctx.stroke();
    if (Math.abs(steady) > 0.01) {
      ctx.strokeStyle = 'rgba(251,191,36,0.5)';
      ctx.beginPath();
      ctx.moveTo(padL, yOf(V_REST + steady));
      ctx.lineTo(padL + pw, yOf(V_REST + steady));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(251,191,36,0.9)';
      ctx.textAlign = 'right';
      ctx.fillText(`I·R = ${steady.toFixed(1)} mV`, padL + pw - 4, yOf(V_REST + steady) - 7);
      // 63 % of the way there, i.e. one time constant
      ctx.strokeStyle = 'rgba(56,189,248,0.4)';
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(padL, yOf(V_REST + 0.632 * steady));
      ctx.lineTo(padL + pw, yOf(V_REST + 0.632 * steady));
      ctx.stroke();
      ctx.fillStyle = 'rgba(56,189,248,0.8)';
      ctx.textAlign = 'left';
      ctx.fillText('63 % after one τ', padL + 4, yOf(V_REST + 0.632 * steady) - 7);
    }
    ctx.setLineDash([]);

    // stimulus markers
    ctx.fillStyle = 'rgba(251,191,36,0.85)';
    for (const t of s.stimT) {
      if (t < tMin) continue;
      const x = xOf(t);
      ctx.beginPath();
      ctx.moveTo(x - 4, padT + ph);
      ctx.lineTo(x + 4, padT + ph);
      ctx.lineTo(x, padT + ph - 7);
      ctx.closePath();
      ctx.fill();
    }

    // voltage trace
    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, padT - 2, pw, ph + 4);
    ctx.clip();
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    let started = false;
    const start = (s.head - s.count + SAMPLES) % SAMPLES;
    for (let k = 0; k < s.count; k++) {
      const idx = (start + k) % SAMPLES;
      const t = s.tBuf[idx];
      if (t < tMin) continue;
      const x = xOf(t);
      const y = yOf(s.vBuf[idx]);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else ctx.lineTo(x, y);
    }
    if (!started) {
      ctx.moveTo(padL, yOf(V_REST));
      ctx.lineTo(xOf(s.t), yOf(s.v));
    }
    ctx.stroke();
    ctx.restore();

    ctx.font = `10px ${FONT}`;
    ctx.fillStyle = 'rgba(148,163,184,0.85)';
    ctx.textAlign = 'left';
    ctx.fillText(`τ = R·C = ${tau.toFixed(2)} ms`, padL, padT - 6);
  });

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
      <canvas ref={canvasRef} className="h-[320px] w-full rounded-xl border border-slate-800" />
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
          <Slider
            label="injected current"
            value={iNa}
            min={-0.3}
            max={0.5}
            step={0.01}
            unit=" nA"
            onChange={setINa}
            accent="accent-amber-400"
          />
          <Slider
            label="pulse duration"
            value={durMs}
            min={1}
            max={40}
            step={1}
            unit=" ms"
            onChange={setDurMs}
          />
          <Slider
            label="membrane resistance"
            value={rMohm}
            min={20}
            max={400}
            step={5}
            unit=" MΩ"
            onChange={setRMohm}
            accent="accent-emerald-400"
          />
          <Slider
            label="soma diameter"
            value={diamUm}
            min={8}
            max={40}
            step={1}
            unit=" µm"
            onChange={setDiamUm}
            accent="accent-violet-400"
          />
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={inject}
              className="flex-1 rounded border border-amber-500/40 bg-amber-500/10 py-1 text-[11px] font-medium text-amber-200 hover:bg-amber-500/20"
            >
              Inject
            </button>
            <button
              type="button"
              onClick={() => setHold((v) => !v)}
              aria-pressed={hold}
              className={`flex-1 rounded border py-1 text-[11px] font-medium ${
                hold
                  ? 'border-amber-400/70 bg-amber-400/25 text-amber-100'
                  : 'border-slate-700 text-slate-400 hover:bg-slate-700/50'
              }`}
            >
              Hold
            </button>
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700/50"
            >
              {running ? '❚❚' : '▶'}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700/50"
            >
              ⟲
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 font-mono text-[11px]">
          <Row label="capacitance" value={`${cPf.toFixed(1)} pF`} />
          <Row label="τ = R·C" value={`${tau.toFixed(2)} ms`} strong />
          <Row label="steady state I·R" value={`${steady.toFixed(1)} mV`} />
          <Row label="V rest" value={`${V_REST} mV`} />
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
            A bigger soma has more membrane, so more capacitance and a slower response — but the
            steady-state voltage only depends on I·R.
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

/** Three or four round numbers spanning the range. */
function niceTicks(lo: number, hi: number): number[] {
  const span = hi - lo;
  const step = span > 80 ? 20 : span > 40 ? 10 : 5;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v);
  return out;
}
