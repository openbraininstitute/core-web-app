'use client';

/**
 * Calcium-based long-term plasticity (Chindemi et al. 2022 / Graupner & Brunel
 * 2012), driven by a spike-pairing protocol under different extracellular
 * calcium conditions.
 *
 * Panel 1: the calcium trace with its two thresholds, plus the efficacy ρ over
 * the protocol and its consolidation.
 * Panel 2: expected plasticity as a function of the pairing interval, for the
 * chosen calcium concentration and for the other condition.
 */

import { useDeferredValue, useMemo, useState } from 'react';

import { useCanvasFrame } from '@/features/learn/components/basics/useCanvasFrame';
import Slider from '@/features/learn/components/ui/Slider';
import { FONT, fillPanel, MONO } from '@/features/learn/lib/basics/soma';
import {
  averageProtocol,
  CA_CONDITIONS,
  DEFAULT_CA_PARAMS,
  defaultDts,
  efficacy,
  outcomeOf,
  releaseProbability,
  runProtocol,
  stdpCurve,
} from '@/features/learn/lib/synapse/calciumPlasticity';

const P = DEFAULT_CA_PARAMS;
const DTS = defaultDts(100, 10);

export default function CalciumPlasticityWidget() {
  const [caMm, setCaMm] = useState(2);
  const [dtPairMs, setDtPairMs] = useState(14);
  const [nPairings, setNPairings] = useState(60);
  const [freqHz, setFreqHz] = useState(5);
  const [rho0, setRho0] = useState(0.5);
  const [seed, setSeed] = useState(1);

  const params = useMemo(() => ({ ...P, rho0 }), [rho0]);

  // one stochastic trial, with a consolidation trace to show bistability
  const trial = useMemo(
    () =>
      runProtocol(params, {
        dtPairMs,
        nPairings,
        freqHz,
        caMm,
        seed,
        relaxMs: 400_000,
      }),
    [params, dtPairMs, nPairings, freqHz, caMm, seed]
  );

  const averaged = useMemo(
    () => averageProtocol(params, { dtPairMs, nPairings, freqHz, caMm }, 12),
    [params, dtPairMs, nPairings, freqHz, caMm]
  );

  // the curves are the expensive part, so let them lag behind the sliders
  const curveKey = useDeferredValue(`${rho0}|${nPairings}|${freqHz}|${caMm}`);
  const curves = useMemo(() => {
    const [r0, n, f, ca] = curveKey.split('|').map(Number);
    const p = { ...P, rho0: r0 };
    const trials = n > 40 ? 4 : 6;
    const other = ca <= 1.6 ? 2 : 1.2;
    return {
      caMm: ca,
      otherCa: other,
      main: stdpCurve(p, { nPairings: n, freqHz: f, caMm: ca }, DTS, trials),
      other: stdpCurve(p, { nPairings: n, freqHz: f, caMm: other }, DTS, trials),
    };
  }, [curveKey]);

  const u = releaseProbability(caMm, params);
  const uRefProb = releaseProbability(P.caRefMm, params);
  const outcome = outcomeOf(trial, params);

  const traceRef = useCanvasFrame((ctx, w, h) =>
    drawTrace(ctx, w, h, trial, params, { freqHz, dtPairMs })
  );
  const curveRef = useCanvasFrame((ctx, w, h) =>
    drawCurve(ctx, w, h, curves, dtPairMs, averaged.meanDRho)
  );

  const condition = CA_CONDITIONS.find((c) => Math.abs(c.caMm - caMm) < 0.001);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="relative min-h-[330px] overflow-hidden rounded-xl border border-slate-800">
          <canvas ref={traceRef} className="absolute inset-0 h-full w-full" />
        </div>

        <aside className="flex flex-col gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
            <h4 className="mb-1.5 text-[10px] tracking-widest text-slate-500 uppercase">
              extracellular calcium
            </h4>
            <div className="flex gap-1.5">
              {CA_CONDITIONS.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCaMm(c.caMm)}
                  aria-pressed={condition?.id === c.id}
                  className={`flex-1 rounded border px-2 py-1 text-[11px] font-medium ${
                    condition?.id === c.id
                      ? 'border-sky-400/70 bg-sky-400/20 text-sky-100'
                      : 'border-slate-700 text-slate-400 hover:bg-slate-700/50'
                  }`}
                  title={c.note}
                >
                  {c.label}
                  <span className="block font-mono text-[10px] text-slate-400">{c.caMm} mM</span>
                </button>
              ))}
            </div>
            <div className="mt-2">
              <Slider
                label="[Ca²⁺] outside"
                value={caMm}
                min={0.8}
                max={3}
                step={0.05}
                display={`${caMm.toFixed(2)} mM`}
                onChange={setCaMm}
                accent="accent-sky-400"
              />
            </div>
            <dl className="mt-1 font-mono text-[11px]">
              <Row label="release prob. U" value={u.toFixed(3)} strong />
              <Row label="…relative to 2 mM" value={`${((u / uRefProb) * 100).toFixed(0)} %`} />
              <Row label="influx per event" value={`${(caMm / P.caRefMm).toFixed(2)}×`} />
            </dl>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
            <h4 className="mb-1 text-[10px] tracking-widest text-slate-500 uppercase">protocol</h4>
            <Slider
              label="pairing interval Δt (post − pre)"
              value={dtPairMs}
              min={-100}
              max={100}
              step={2}
              unit=" ms"
              onChange={setDtPairMs}
              accent="accent-violet-400"
            />
            <Slider
              label="pairings"
              value={nPairings}
              min={5}
              max={100}
              step={5}
              onChange={setNPairings}
            />
            <Slider
              label="pairing frequency"
              value={freqHz}
              min={0.5}
              max={40}
              step={0.5}
              unit=" Hz"
              onChange={setFreqHz}
            />
            <Slider
              label="starting efficacy ρ₀"
              value={rho0}
              min={0}
              max={1}
              step={0.05}
              display={rho0.toFixed(2)}
              onChange={setRho0}
              accent="accent-emerald-400"
            />
            <div className="mt-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => setSeed((s) => s + 1)}
                className="flex-1 rounded border border-sky-500/40 bg-sky-500/10 py-1 text-[11px] text-sky-200 hover:bg-sky-500/20"
              >
                new trial
              </button>
              <button
                type="button"
                onClick={() => {
                  setCaMm(2);
                  setDtPairMs(14);
                  setNPairings(60);
                  setFreqHz(5);
                  setRho0(0.5);
                  setSeed(1);
                }}
                className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700/50"
              >
                ⟲
              </button>
            </div>
          </div>

          <dl className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 font-mono text-[11px]">
            <Row label="releases" value={`${trial.releasedAt.length}/${nPairings}`} />
            <Row label="peak calcium" value={trial.peakCa.toFixed(2)} />
            <Row label="time above θd" value={`${trial.msAboveD.toFixed(0)} ms`} />
            <Row label="time above θp" value={`${trial.msAboveP.toFixed(0)} ms`} />
            <Row label="Δρ this trial" value={`${signed(trial.rhoAfterProtocol - rho0)}`} strong />
            <Row label="Δρ mean of 12" value={signed(averaged.meanDRho)} />
            <Row
              label="trials potentiated"
              value={`${(averaged.fractionPotentiated * 100).toFixed(0)} %`}
            />
            <Row label="efficacy after" value={`${efficacy(trial.rhoFinal, params).toFixed(2)}×`} />
            <div className="mt-1.5 border-t border-slate-800 pt-1.5">
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] ${
                  outcome === 'potentiated'
                    ? 'bg-emerald-400/20 text-emerald-200'
                    : outcome === 'depressed'
                      ? 'bg-rose-400/20 text-rose-200'
                      : 'bg-slate-700/50 text-slate-300'
                }`}
              >
                {outcome}
              </span>
            </div>
          </dl>
        </aside>
      </div>

      <canvas ref={curveRef} className="h-[260px] w-full rounded-xl border border-slate-800" />
      <p className="text-[11px] leading-relaxed text-slate-500">
        θd = {P.thetaD} and θp = {P.thetaP} in units of the calcium trace; τ<sub>Ca</sub> ={' '}
        {P.tauCaMs} ms; presynaptic contribution delayed by {P.delayPreMs} ms. The plasticity time
        constant is slow ({(P.tauRhoMs / 1000).toFixed(0)} s), so the panel also shows the
        consolidation that follows the protocol.
      </p>
    </div>
  );
}

const signed = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(3)}`;

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className={strong ? 'text-sky-300' : 'text-slate-200'}>{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// drawing
// ---------------------------------------------------------------------------

type Trial = ReturnType<typeof runProtocol>;
type Params = typeof DEFAULT_CA_PARAMS;

function drawTrace(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  trial: Trial,
  p: Params,
  o: { freqHz: number; dtPairMs: number }
) {
  fillPanel(ctx, w, h);
  const padL = 44;
  const padR = 14;
  const pw = Math.max(20, w - padL - padR);

  // ---- top: calcium, zoomed to the first few pairings ----
  const caTop = 26;
  const caH = Math.max(60, h * 0.48);
  const isi = 1000 / o.freqHz;
  const winMs = Math.min(trial.protocolMs, Math.max(220, 3.2 * isi + Math.abs(o.dtPairMs) + 80));
  const t0 = Math.max(0, trial.preTimes[0] - 60);
  const t1 = t0 + winMs;
  const caMax = Math.max(p.thetaP * 1.35, trial.peakCa * 1.1);
  const xOf = (t: number) => padL + ((t - t0) / winMs) * pw;
  const yOf = (c: number) => caTop + caH - (Math.min(c, caMax) / caMax) * caH;

  // threshold bands
  ctx.fillStyle = 'rgba(56,189,248,0.07)';
  ctx.fillRect(padL, yOf(p.thetaP), pw, yOf(p.thetaD) - yOf(p.thetaP));
  ctx.fillStyle = 'rgba(52,211,153,0.07)';
  ctx.fillRect(padL, caTop, pw, yOf(p.thetaP) - caTop);

  ctx.font = `10px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const [v, label, color] of [
    [p.thetaP, 'θp potentiation', '#34d399'],
    [p.thetaD, 'θd depression', '#38bdf8'],
  ] as [number, string, string][]) {
    const y = yOf(v);
    ctx.strokeStyle = color;
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + pw, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.fillText(label, padL + 6, y - 7);
    ctx.textAlign = 'right';
    ctx.fillText(v.toFixed(1), padL - 6, y);
  }
  ctx.fillStyle = 'rgba(148,163,184,0.75)';
  ctx.fillText('0', padL - 6, yOf(0));

  // calcium trace
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  let started = false;
  for (let i = 0; i < trial.t.length; i++) {
    const t = trial.t[i];
    if (t < t0) continue;
    if (t > t1) break;
    const x = xOf(t);
    const y = yOf(trial.ca[i]);
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // spike markers
  const released = new Set(trial.releasedAt);
  ctx.lineWidth = 1.6;
  for (const t of trial.preTimes) {
    if (t < t0 || t > t1) continue;
    const ok = released.has(t);
    ctx.strokeStyle = ok ? '#fbbf24' : 'rgba(148,163,184,0.45)';
    ctx.beginPath();
    ctx.moveTo(xOf(t), caTop + caH + 4);
    ctx.lineTo(xOf(t), caTop + caH + 14);
    ctx.stroke();
    if (!ok) {
      ctx.beginPath();
      ctx.arc(xOf(t), caTop + caH + 19, 2.4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  for (const t of trial.postTimes) {
    if (t < t0 || t > t1) continue;
    ctx.strokeStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(xOf(t), caTop + caH + 16);
    ctx.lineTo(xOf(t), caTop + caH + 26);
    ctx.stroke();
  }
  ctx.font = `9px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(251,191,36,0.9)';
  ctx.fillText('pre', padL - 6, caTop + caH + 10);
  ctx.fillStyle = '#f472b6';
  ctx.fillText('post', padL - 6, caTop + caH + 22);

  ctx.textAlign = 'left';
  ctx.font = `10px ${FONT}`;
  ctx.fillStyle = 'rgba(148,163,184,0.8)';
  ctx.fillText('post-synaptic calcium (first pairings)', padL, 14);
  ctx.textAlign = 'right';
  ctx.fillText(`Δt = ${o.dtPairMs >= 0 ? '+' : ''}${o.dtPairMs} ms`, padL + pw, 14);

  // ---- bottom: efficacy over the protocol, then consolidation ----
  const rTop = caTop + caH + 44;
  const rH = Math.max(40, h - rTop - 26);
  const protoW = pw * 0.68;
  const relaxW = pw - protoW - 10;
  const rx = (t: number) => padL + (t / trial.protocolMs) * protoW;
  const ry = (r: number) => rTop + rH - r * rH;

  ctx.strokeStyle = 'rgba(148,163,184,0.15)';
  ctx.lineWidth = 1;
  for (const v of [0, 0.5, 1]) {
    const y = ry(v);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + pw, y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(148,163,184,0.75)';
    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(v.toFixed(1), padL - 6, y);
  }
  ctx.strokeStyle = 'rgba(148,163,184,0.35)';
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(padL, ry(0.5));
  ctx.lineTo(padL + pw, ry(0.5));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = '#a78bfa';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let i = 0; i < trial.rho.length; i += 2) {
    const x = rx(trial.t[i]);
    const y = ry(trial.rho[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // consolidation segment
  const cx0 = padL + protoW + 10;
  ctx.strokeStyle = 'rgba(148,163,184,0.25)';
  ctx.beginPath();
  ctx.moveTo(cx0 - 5, rTop);
  ctx.lineTo(cx0 - 5, rTop + rH);
  ctx.stroke();
  ctx.strokeStyle = '#c4b5fd';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  const n = trial.relaxRho.length;
  for (let i = 0; i < n; i++) {
    const x = cx0 + (i / Math.max(1, n - 1)) * relaxW;
    const y = ry(trial.relaxRho[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.font = `10px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(148,163,184,0.8)';
  ctx.fillText('efficacy ρ', padL, rTop - 8);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(148,163,184,0.6)';
  ctx.fillText(
    `protocol · ${(trial.protocolMs / 1000).toFixed(1)} s`,
    padL + protoW / 2,
    rTop + rH + 12
  );
  ctx.fillText(
    `consolidation · ${(trial.relaxMs / 60000).toFixed(0)} min`,
    cx0 + relaxW / 2,
    rTop + rH + 12
  );
}

type Curves = {
  caMm: number;
  otherCa: number;
  main: { dtMs: number; dRho: number }[];
  other: { dtMs: number; dRho: number }[];
};

function drawCurve(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  curves: Curves,
  dtNow: number,
  meanDRho: number
) {
  fillPanel(ctx, w, h);
  const padL = 62;
  const padR = 150;
  const padT = 26;
  const padB = 34;
  const pw = Math.max(20, w - padL - padR);
  const ph = Math.max(20, h - padT - padB);

  const all = [...curves.main, ...curves.other].map((c) => c.dRho);
  const maxAbs = Math.max(0.1, ...all.map(Math.abs));
  const xOf = (dt: number) => padL + ((dt + 100) / 200) * pw;
  const yOf = (d: number) => padT + ph / 2 - (d / (maxAbs * 1.15)) * (ph / 2);

  // axes
  ctx.strokeStyle = 'rgba(148,163,184,0.15)';
  ctx.lineWidth = 1;
  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = 'rgba(148,163,184,0.75)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const d of [-maxAbs, -maxAbs / 2, 0, maxAbs / 2, maxAbs]) {
    const y = yOf(d);
    ctx.strokeStyle = d === 0 ? 'rgba(148,163,184,0.4)' : 'rgba(148,163,184,0.12)';
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + pw, y);
    ctx.stroke();
    ctx.fillText(d.toFixed(2), padL - 6, y);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const dt of [-100, -50, 0, 50, 100]) {
    const x = xOf(dt);
    ctx.strokeStyle = dt === 0 ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.12)';
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + ph);
    ctx.stroke();
    ctx.fillStyle = 'rgba(148,163,184,0.75)';
    ctx.fillText(`${dt > 0 ? '+' : ''}${dt}`, x, padT + ph + 8);
  }
  ctx.textAlign = 'left';
  ctx.font = `10px ${FONT}`;
  ctx.fillStyle = 'rgba(148,163,184,0.8)';
  ctx.fillText('pairing interval Δt (ms) — positive: pre before post', padL, padT + ph + 22);
  ctx.save();
  ctx.translate(14, padT + ph / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('Δρ over the protocol', 0, 0);
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(52,211,153,0.85)';
  ctx.fillText('potentiation', padL + 6, padT + 4);
  ctx.fillStyle = 'rgba(248,113,113,0.85)';
  ctx.fillText('depression', padL + 6, padT + ph - 16);

  // the other calcium condition, faint
  ctx.strokeStyle = 'rgba(148,163,184,0.45)';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  curves.other.forEach((c, i) =>
    i ? ctx.lineTo(xOf(c.dtMs), yOf(c.dRho)) : ctx.moveTo(xOf(c.dtMs), yOf(c.dRho))
  );
  ctx.stroke();
  ctx.setLineDash([]);

  // current condition
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  curves.main.forEach((c, i) =>
    i ? ctx.lineTo(xOf(c.dtMs), yOf(c.dRho)) : ctx.moveTo(xOf(c.dtMs), yOf(c.dRho))
  );
  ctx.stroke();
  ctx.fillStyle = '#38bdf8';
  for (const c of curves.main) {
    ctx.beginPath();
    ctx.arc(xOf(c.dtMs), yOf(c.dRho), 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // marker for the interval currently selected
  ctx.strokeStyle = 'rgba(167,139,250,0.9)';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(xOf(dtNow), padT);
  ctx.lineTo(xOf(dtNow), padT + ph);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#c4b5fd';
  ctx.beginPath();
  ctx.arc(xOf(dtNow), yOf(meanDRho), 4, 0, Math.PI * 2);
  ctx.fill();

  // legend
  const lx = padL + pw + 16;
  let ly = padT + 8;
  const legend: [string, string, boolean][] = [
    [`${curves.caMm.toFixed(2)} mM Ca²⁺`, '#38bdf8', false],
    [`${curves.otherCa.toFixed(2)} mM Ca²⁺`, 'rgba(148,163,184,0.7)', true],
    ['current Δt', '#c4b5fd', false],
  ];
  ctx.font = `10px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const [label, color, dashed] of legend) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (dashed) ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + 16, ly);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(label, lx + 22, ly);
    ly += 16;
  }
  ctx.fillStyle = 'rgba(148,163,184,0.65)';
  ctx.font = `9px ${FONT}`;
  ctx.fillText('mean of several release', lx, ly + 8);
  ctx.fillText('lotteries per interval', lx, ly + 20);
}
