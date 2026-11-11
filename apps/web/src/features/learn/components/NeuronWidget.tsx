'use client';

/**
 * Interactive explorer for a 20-compartment Hodgkin-Huxley neuron.
 *
 * The simulation lives in a ref (never in React state) and is advanced from a
 * single requestAnimationFrame loop that also redraws both canvases. React
 * state drives the controls and a throttled read-out only.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import Slider from '@/features/learn/components/ui/Slider';
import {
  AMP_MAX,
  AMP_MIN,
  COMPARTMENTS,
  ELECTRODES,
  SECTION_COLOR,
  SOMA,
  TARGETS,
  TERMINAL,
} from '@/features/learn/lib/neuron/morphology';
import { drawNeuron, drawTraces, pickAt } from '@/features/learn/lib/neuron/render';
import { NeuronSim } from '@/features/learn/lib/neuron/sim';

/** Simulated milliseconds per second of wall-clock time. */
const SPEEDS = [2, 5, 10, 25, 60] as const;
const TRACE_WINDOW_MS = 60;
const MAX_TRACES = 6;

interface Stats {
  t: number;
  vSoma: number;
  somaSpikes: number;
  outputSpikes: number;
  rate: number;
  delivered: number[];
}

const EMPTY_STATS: Stats = {
  t: 0,
  vSoma: -65,
  somaSpikes: 0,
  outputSpikes: 0,
  rate: 0,
  delivered: TARGETS.map(() => 0),
};

export default function NeuronWidget() {
  const simRef = useRef<NeuronSim | null>(null);
  const neuronCanvas = useRef<HTMLCanvasElement | null>(null);
  const traceCanvas = useRef<HTMLCanvasElement | null>(null);

  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState<number>(10);
  const [pulseDur, setPulseDur] = useState(2);
  const [amps, setAmps] = useState<number[]>(ELECTRODES.map((e) => e.defaultAmp));
  const [holds, setHolds] = useState<boolean[]>(ELECTRODES.map(() => false));
  const [naBlock, setNaBlock] = useState(0);
  const [kBlock, setKBlock] = useState(0);
  const [selected, setSelected] = useState<number[]>([SOMA, 5, TERMINAL]);
  const [hoverComp, setHoverComp] = useState<number | null>(null);
  const [hoverElectrode, setHoverElectrode] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [showLabels, setShowLabels] = useState(true);

  if (simRef.current === null) simRef.current = new NeuronSim();

  // Mirror of the controls, read by the animation loop and event handlers.
  const ui = useRef({
    running,
    speed,
    amps,
    holds,
    selected,
    hoverComp,
    hoverElectrode,
    showLabels,
    pulseDur,
  });
  useEffect(() => {
    ui.current = {
      running,
      speed,
      amps,
      holds,
      selected,
      hoverComp,
      hoverElectrode,
      showLabels,
      pulseDur,
    };
  }, [running, speed, amps, holds, selected, hoverComp, hoverElectrode, showLabels, pulseDur]);

  // Push holding currents and channel blockers into the model.
  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;
    ELECTRODES.forEach((e, i) => sim.setHold(e.comp, holds[i] ? amps[i] : 0));
  }, [amps, holds]);

  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;
    sim.naBlock = naBlock / 100;
    sim.kBlock = kBlock / 100;
  }, [naBlock, kBlock]);

  const fire = useCallback((idx: number) => {
    const sim = simRef.current;
    if (!sim) return;
    sim.pulse(ELECTRODES[idx].comp, ui.current.amps[idx], ui.current.pulseDur);
  }, []);

  /** Toggle run/pause. Writes the mirror straight away so the animation loop
   * stops on the very next frame instead of one render later. */
  const toggleRunning = useCallback(() => {
    const next = !ui.current.running;
    ui.current.running = next;
    setRunning(next);
  }, []);

  const reset = useCallback(() => {
    simRef.current?.reset();
    setStats(EMPTY_STATS);
  }, []);

  // --- animation loop ---------------------------------------------------
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let statFrame = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const sim = simRef.current;
      if (!sim) return;
      const dtWall = Math.min(80, now - last);
      last = now;

      if (ui.current.running) {
        // Cap the work per frame so a throttled tab cannot stall the UI.
        sim.advance(Math.min(20, (dtWall / 1000) * ui.current.speed));
      }

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const nc = neuronCanvas.current;
      if (nc) {
        const { w, h } = fitCanvas(nc, dpr);
        const ctx = nc.getContext('2d');
        if (ctx)
          drawNeuron(ctx, w, h, dpr, {
            sim,
            amps: ui.current.amps,
            holds: ui.current.holds,
            hoverComp: ui.current.hoverComp,
            hoverElectrode: ui.current.hoverElectrode,
            selected: ui.current.selected,
            showLabels: ui.current.showLabels,
            wallClock: now,
          });
      }
      const tc = traceCanvas.current;
      if (tc) {
        const { w, h } = fitCanvas(tc, dpr);
        const ctx = tc.getContext('2d');
        if (ctx)
          drawTraces(ctx, w, h, dpr, {
            sim,
            comps: ui.current.selected,
            windowMs: TRACE_WINDOW_MS,
          });
      }

      if (++statFrame % 6 === 0) {
        setStats({
          t: sim.t,
          vSoma: sim.v[SOMA],
          somaSpikes: sim.somaSpikeCount,
          outputSpikes: sim.outputSpikeCount,
          rate: sim.lastRateHz(),
          delivered: TARGETS.map(
            (tg) =>
              sim.spikes.filter((s) => s.source === 'terminal' && s.t + tg.delay <= sim.t).length
          ),
        });
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // --- keyboard ---------------------------------------------------------
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (ev.code === 'Space') {
        ev.preventDefault();
        toggleRunning();
        return;
      }
      if (ev.key === 'r' || ev.key === 'R') {
        reset();
        return;
      }
      const idx = ELECTRODES.findIndex((e) => e.key === ev.key);
      if (idx >= 0) {
        ev.preventDefault();
        fire(idx);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fire, reset, toggleRunning]);

  // --- canvas interaction ----------------------------------------------
  const onCanvasMove = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = ev.currentTarget.getBoundingClientRect();
    const hit = pickAt(ev.clientX - rect.left, ev.clientY - rect.top, rect.width, rect.height);
    setHoverComp(hit?.kind === 'comp' ? hit.index : null);
    setHoverElectrode(hit?.kind === 'electrode' ? hit.index : null);
  };

  const toggleHold = (idx: number) => setHolds((h) => h.map((v, i) => (i === idx ? !v : v)));

  const toggleTrace = (comp: number) =>
    setSelected((sel) => {
      if (sel.includes(comp)) return sel.length > 1 ? sel.filter((c) => c !== comp) : sel;
      const next = [...sel, comp];
      return next.length > MAX_TRACES ? next.slice(next.length - MAX_TRACES) : next;
    });

  const onCanvasClick = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = ev.currentTarget.getBoundingClientRect();
    const hit = pickAt(ev.clientX - rect.left, ev.clientY - rect.top, rect.width, rect.height);
    if (!hit) return;
    if (hit.kind === 'electrode') {
      if (ev.shiftKey) toggleHold(hit.index);
      else fire(hit.index);
    } else {
      toggleTrace(hit.index);
    }
  };

  const setAmp = (idx: number, value: number) =>
    setAmps((a) => a.map((v, i) => (i === idx ? value : v)));

  // --- presets ----------------------------------------------------------
  const applyPreset = (name: 'single' | 'train' | 'dendritic' | 'ttx' | 'tea' | 'hyper') => {
    const sim = simRef.current;
    if (!sim) return;
    sim.reset();
    setStats(EMPTY_STATS);
    setHolds(ELECTRODES.map(() => false));
    setNaBlock(0);
    setKBlock(0);
    sim.naBlock = 0;
    sim.kBlock = 0;
    setRunning(true);
    ui.current.running = true;
    const defaults = ELECTRODES.map((e) => e.defaultAmp);

    switch (name) {
      case 'single': {
        defaults[0] = 0.4;
        setAmps(defaults);
        setSelected([SOMA, 14, TERMINAL]);
        setPulseDur(2);
        sim.pulse(ELECTRODES[0].comp, 0.4, 2);
        break;
      }
      case 'train': {
        defaults[0] = 0.35;
        setAmps(defaults);
        setHolds(ELECTRODES.map((_, i) => i === 0));
        setSelected([SOMA, TERMINAL]);
        break;
      }
      case 'dendritic': {
        setAmps(ELECTRODES.map(() => 0.3));
        setSelected([5, 3, SOMA, TERMINAL]);
        setPulseDur(6);
        sim.pulse(ELECTRODES[1].comp, 0.3, 6);
        sim.pulse(ELECTRODES[3].comp, 0.3, 6);
        break;
      }
      case 'ttx': {
        defaults[0] = 1;
        setAmps(defaults);
        setNaBlock(100);
        sim.naBlock = 1;
        setSelected([SOMA, 14, TERMINAL]);
        setPulseDur(6);
        sim.pulse(ELECTRODES[0].comp, 1, 6);
        break;
      }
      case 'tea': {
        defaults[0] = 0.4;
        setAmps(defaults);
        setKBlock(85);
        sim.kBlock = 0.85;
        setSelected([SOMA, TERMINAL]);
        setPulseDur(2);
        sim.pulse(ELECTRODES[0].comp, 0.4, 2);
        break;
      }
      case 'hyper': {
        defaults[0] = -0.3;
        setAmps(defaults);
        setHolds(ELECTRODES.map((_, i) => i === 0));
        setSelected([SOMA, 1, TERMINAL]);
        break;
      }
    }
  };

  const slowdown = Math.round(1000 / speed);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* ---------------- neuron ---------------- */}
        <div className="flex min-h-[560px] flex-col gap-2">
          <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-800 bg-(--screen)">
            <canvas
              ref={neuronCanvas}
              className="absolute inset-0 h-full w-full cursor-pointer"
              onMouseMove={onCanvasMove}
              onMouseLeave={() => {
                setHoverComp(null);
                setHoverElectrode(null);
              }}
              onClick={onCanvasClick}
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-end p-3">
              <div className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-900/80 p-1.5 backdrop-blur">
                <button
                  type="button"
                  onClick={toggleRunning}
                  className="rounded px-2.5 py-1 text-xs font-medium text-slate-100 hover:bg-slate-700/70"
                  title="Play / pause (space)"
                >
                  {running ? '❚❚ Pause' : '▶ Run'}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700/70"
                  title="Reset to rest (r)"
                >
                  ⟲ Reset
                </button>
                <span className="mx-1 h-4 w-px bg-slate-700" />
                {SPEEDS.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`rounded px-1.5 py-1 font-mono text-[11px] ${
                      speed === s
                        ? 'bg-sky-500/25 text-sky-200'
                        : 'text-slate-400 hover:bg-slate-700/60'
                    }`}
                    title={`${s} simulated ms per real second (1/${Math.round(1000 / s)} speed)`}
                  >
                    {s}
                  </button>
                ))}
                <span className="pr-1 text-[10px] text-slate-500">ms/s</span>
              </div>
            </div>
          </div>

          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] text-slate-500">
            <span>
              <b className="text-slate-300">Click a pipette</b> to inject a pulse
            </span>
            <span>
              <b className="text-slate-300">Shift-click</b> to hold it on
            </span>
            <span>
              <b className="text-slate-300">Click a compartment</b> to plot it
            </span>
            <span className="font-mono">keys 1–5 · space · r</span>
          </p>
        </div>

        {/* ---------------- controls ---------------- */}
        <aside className="flex flex-col gap-3">
          <Panel title="Electrodes" hint="current injected into one compartment">
            <div className="flex flex-col divide-y divide-slate-800">
              {ELECTRODES.map((e, i) => (
                <div key={e.id} className="py-2 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex items-baseline gap-1.5">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: SECTION_COLOR[COMPARTMENTS[e.comp].type] }}
                      />
                      <span className="font-mono text-xs text-slate-200">{e.id}</span>
                      <span className="text-[11px] text-slate-500">{e.label}</span>
                    </span>
                    <span className="font-mono text-[11px] text-amber-300">
                      {amps[i] >= 0 ? '+' : ''}
                      {amps[i].toFixed(2)} nA
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="range"
                      min={AMP_MIN}
                      max={AMP_MAX}
                      step={0.05}
                      value={amps[i]}
                      onChange={(ev) => setAmp(i, Number(ev.target.value))}
                      className="flex-1 accent-amber-400"
                      aria-label={`${e.id} (${e.label}) amplitude in nanoamps`}
                    />
                    <button
                      type="button"
                      onClick={() => fire(i)}
                      className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-200 hover:bg-amber-500/20"
                      title={`Inject a ${pulseDur} ms pulse (key ${e.key})`}
                    >
                      Inject
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleHold(i)}
                      aria-pressed={holds[i]}
                      className={`rounded border px-2 py-0.5 text-[11px] font-medium ${
                        holds[i]
                          ? 'border-amber-400/70 bg-amber-400/25 text-amber-100'
                          : 'border-slate-700 text-slate-400 hover:bg-slate-700/50'
                      }`}
                      title="Keep this current switched on"
                    >
                      Hold
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <Slider
                label="Pulse duration"
                value={pulseDur}
                min={0.5}
                max={20}
                step={0.5}
                unit=" ms"
                onChange={setPulseDur}
              />
            </div>
          </Panel>

          <Panel title="Ion channels" hint="classic Hodgkin–Huxley Na⁺ / K⁺ / leak">
            <Slider
              label="Na⁺ block (TTX)"
              value={naBlock}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={setNaBlock}
              accent="accent-rose-400"
            />
            <Slider
              label="K⁺ block (TEA)"
              value={kBlock}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={setKBlock}
              accent="accent-emerald-400"
            />
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Blocking Na⁺ abolishes the spike; blocking K⁺ broadens it and slows repolarisation.
              Channel density is graded — the axon initial segment is the most excitable region, the
              dendrites are only weakly active.
            </p>
          </Panel>

          <Panel title="Output" hint="spikes leaving the axon terminal">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-xs">
              <Stat label="t" value={`${stats.t.toFixed(1)} ms`} />
              <Stat label="V soma" value={`${stats.vSoma.toFixed(1)} mV`} />
              <Stat label="soma spikes" value={String(stats.somaSpikes)} />
              <Stat label="output" value={String(stats.outputSpikes)} />
              <Stat label="rate" value={`${stats.rate.toFixed(0)} Hz`} />
              <Stat label="slow-mo" value={`1/${slowdown}`} />
            </dl>
            <div className="mt-2 flex flex-col gap-1">
              {TARGETS.map((tg, i) => (
                <div key={tg.id} className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-pink-400" />
                    {tg.id}
                    <span className="text-slate-600">· {tg.delay.toFixed(1)} ms delay</span>
                  </span>
                  <span className="font-mono text-pink-300">{stats.delivered[i] ?? 0}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Try this">
            <div className="flex flex-wrap gap-1.5">
              <Preset onClick={() => applyPreset('single')}>Single spike</Preset>
              <Preset onClick={() => applyPreset('train')}>Spike train</Preset>
              <Preset onClick={() => applyPreset('dendritic')}>Dendritic input</Preset>
              <Preset onClick={() => applyPreset('ttx')}>TTX (no Na⁺)</Preset>
              <Preset onClick={() => applyPreset('tea')}>Block K⁺</Preset>
              <Preset onClick={() => applyPreset('hyper')}>Hyperpolarise</Preset>
            </div>
            <label className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(ev) => setShowLabels(ev.target.checked)}
                className="accent-sky-400"
              />
              show anatomical labels
            </label>
          </Panel>
        </aside>
      </div>

      {/* ---------------- traces ---------------- */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-(--screen)">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
          <h3 className="text-xs font-medium tracking-wide text-slate-300 uppercase">
            Membrane potential · last {TRACE_WINDOW_MS} ms
          </h3>
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-[10px] text-slate-500">compartment</span>
            {COMPARTMENTS.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => toggleTrace(c.id)}
                aria-pressed={selected.includes(c.id)}
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                  selected.includes(c.id) ? 'bg-slate-700/80' : 'text-slate-500 hover:bg-slate-800'
                }`}
                style={selected.includes(c.id) ? { color: SECTION_COLOR[c.type] } : undefined}
                title={`${c.label} (#${c.id})`}
              >
                {c.id}
              </button>
            ))}
          </div>
        </div>
        <canvas ref={traceCanvas} className="block h-[260px] w-full" />
      </div>
    </div>
  );
}

/** Resize the backing store to match the CSS box; returns the CSS size. */
function fitCanvas(canvas: HTMLCanvasElement, dpr: number) {
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  return { w, h };
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <h3 className="text-xs font-medium tracking-wide text-slate-300 uppercase">{title}</h3>
      {hint && <p className="mt-0.5 mb-2 text-[11px] text-slate-500">{hint}</p>}
      <div className={hint ? '' : 'mt-2'}>{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className="text-slate-200">{value}</dd>
    </div>
  );
}

function Preset({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300 hover:border-sky-500/60 hover:bg-sky-500/10 hover:text-sky-200"
    >
      {children}
    </button>
  );
}
