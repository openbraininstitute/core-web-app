'use client';

/**
 * Tsodyks–Markram synapse with stochastic vesicular release.
 *
 * Three panels: the terminal itself (release sites, facilitation and available
 * resources), the time course of one trial (presynaptic spikes, synaptic
 * conductance, post-synaptic voltage), and the classic amplitude-versus-spike
 * plot accumulated over trials with the deterministic prediction on top.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import Slider from '@/features/learn/components/ui/Slider';
import { FONT, fillPanel, MONO, roundRect } from '@/features/learn/lib/basics/soma';
import {
  cv,
  PassiveSoma,
  PRESETS,
  type SynapseKind,
  type TmParams,
  TmSynapse,
  tmDeterministic,
  trainIntervals,
} from '@/features/learn/lib/synapse/tsodyksMarkram';

const DT = 0.25; // ms
const TRACE_MS = 1400;
const TRACE_STRIDE = 4; // sample every 1 ms
const MAX_TRIALS = 30;
const SPEEDS = [0.05, 0.1, 0.25, 0.5, 1] as const;
const speedLabel = (s: number) => (s === 1 ? 'real time' : `1/${Math.round(1 / s)} real time`);

const SOMA_CFG = { vRestMv: -70, rInMohm: 150, cPf: 120 };

interface Sample {
  t: number;
  g: number;
  v: number;
}

export default function TsodyksMarkramWidget() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];
  const [params, setParams] = useState<TmParams>(PRESETS[0].params);
  const [holdNa, setHoldNa] = useState(PRESETS[0].holdNa);
  const [freqHz, setFreqHz] = useState(20);
  const [nSpikes, setNSpikes] = useState(8);
  const [recoveryMs, setRecoveryMs] = useState(600);
  const [speedIdx, setSpeedIdx] = useState(2);
  const [autoRepeat, setAutoRepeat] = useState(true);
  const [showMean, setShowMean] = useState(true);
  const [stats, setStats] = useState({
    u: 0,
    avail: 1,
    lastAmp: 0,
    lastReleased: 0,
    trials: 0,
    failures: 0,
    spikes: 0,
    cv1: 0,
    v: SOMA_CFG.vRestMv,
  });

  const synRef = useRef<TmSynapse | null>(null);
  const somaRef = useRef<PassiveSoma | null>(null);
  if (synRef.current === null) synRef.current = new TmSynapse(PRESETS[0].params);
  if (somaRef.current === null) somaRef.current = new PassiveSoma(SOMA_CFG);

  const terminalCanvas = useRef<HTMLCanvasElement | null>(null);
  const traceCanvas = useRef<HTMLCanvasElement | null>(null);
  const statsCanvas = useRef<HTMLCanvasElement | null>(null);

  const st = useRef({
    t: 0,
    /** Absolute simulated times of the spikes in the current trial. */
    schedule: [] as number[],
    next: 0,
    trialAmps: [] as number[],
    trials: [] as number[][],
    trialStart: 0,
    nextTrialAt: 300,
    raster: [] as number[],
    trace: [] as Sample[],
    sampleTick: 0,
    lastSpikeAt: -1e9,
    flash: [] as { site: number; at: number }[],
    failures: 0,
    spikes: 0,
    firstAmps: [] as number[],
  });

  const cfg = useRef({
    params,
    holdNa,
    freqHz,
    nSpikes,
    recoveryMs,
    speed: SPEEDS[speedIdx],
    autoRepeat,
    showMean,
    preset,
  });
  useEffect(() => {
    cfg.current = {
      params,
      holdNa,
      freqHz,
      nSpikes,
      recoveryMs,
      speed: SPEEDS[speedIdx],
      autoRepeat,
      showMean,
      preset,
    };
  }, [params, holdNa, freqHz, nSpikes, recoveryMs, speedIdx, autoRepeat, showMean, preset]);

  // keep the model's parameters in step with the controls
  useEffect(() => {
    const syn = synRef.current!;
    syn.params = { ...params };
    if (syn.sites.length !== params.nSites) syn.setSiteCount(params.nSites);
  }, [params]);

  const clearStats = useCallback(() => {
    const s = st.current;
    s.trials = [];
    s.trialAmps = [];
    s.failures = 0;
    s.spikes = 0;
    s.firstAmps = [];
  }, []);

  const startTrial = useCallback(() => {
    const s = st.current;
    const c = cfg.current;
    const isi = 1000 / c.freqHz;
    const times = Array.from({ length: c.nSpikes }, (_, i) => s.t + 60 + i * isi);
    if (c.recoveryMs > 0) times.push(times[times.length - 1] + c.recoveryMs);
    s.schedule = times;
    s.next = 0;
    s.trialAmps = [];
    s.trialStart = s.t;
    synRef.current!.reset();
    somaRef.current!.v = SOMA_CFG.vRestMv;
    s.raster = [];
    s.trace = [];
    s.lastSpikeAt = -1e9;
    s.flash = [];
  }, []);

  const applyPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPresetId(id);
    setParams({ ...p.params });
    setHoldNa(p.holdNa);
    clearStats();
    startTrial();
  };

  const switchKind = (kind: SynapseKind) => {
    if (preset.kind === kind) return;
    const next = PRESETS.find((p) => p.kind === kind);
    if (next) applyPreset(next.id);
  };

  // --- single animation loop drives the model and all three canvases ---
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let frame = 0;
    startTrial();

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const s = st.current;
      const c = cfg.current;
      const syn = synRef.current!;
      const soma = somaRef.current!;

      // ---- advance ----
      const dtWall = Math.min(60, now - last);
      last = now;
      acc += dtWall * c.speed;
      while (acc >= DT) {
        acc -= DT;
        s.t += DT;

        // scheduled presynaptic spikes
        while (s.next < s.schedule.length && s.t >= s.schedule[s.next]) {
          const before = syn.sites.map((x) => x.available);
          const ev = syn.spike();
          s.raster.push(s.t);
          s.lastSpikeAt = s.t;
          s.trialAmps.push(ev.ampNs);
          s.spikes++;
          if (ev.released === 0) s.failures++;
          if (s.trialAmps.length === 1) s.firstAmps.push(ev.ampNs);
          syn.sites.forEach((site, i) => {
            if (before[i] && !site.available) s.flash.push({ site: i, at: s.t });
          });
          s.next++;
          if (s.next === s.schedule.length) {
            s.trials.push([...s.trialAmps]);
            if (s.trials.length > MAX_TRIALS) s.trials.shift();
            s.nextTrialAt = s.t + 400;
          }
        }

        syn.step(DT);
        soma.step(DT, syn.gNs, c.params.eSynMv, c.holdNa);

        if (++s.sampleTick >= TRACE_STRIDE) {
          s.sampleTick = 0;
          s.trace.push({ t: s.t, g: syn.gNs, v: soma.v });
          while (s.trace.length && s.trace[0].t < s.t - TRACE_MS) s.trace.shift();
        }

        // next trial
        if (s.next >= s.schedule.length && c.autoRepeat && s.t >= s.nextTrialAt) startTrial();
      }
      s.flash = s.flash.filter((f) => s.t - f.at < 60);

      // ---- draw ----
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      drawOn(terminalCanvas.current, dpr, (ctx, w, h) =>
        drawTerminal(ctx, w, h, syn, st.current, cfg.current)
      );
      drawOn(traceCanvas.current, dpr, (ctx, w, h) =>
        drawTrace(ctx, w, h, st.current, cfg.current)
      );
      drawOn(statsCanvas.current, dpr, (ctx, w, h) =>
        drawStats(ctx, w, h, st.current, cfg.current)
      );

      if (++frame % 6 === 0) {
        setStats({
          u: syn.u,
          avail: syn.availableFraction,
          lastAmp: s.trialAmps.length ? s.trialAmps[s.trialAmps.length - 1] : 0,
          lastReleased: 0,
          trials: s.trials.length,
          failures: s.spikes ? s.failures / s.spikes : 0,
          spikes: s.spikes,
          cv1: cv(s.firstAmps),
          v: soma.v,
        });
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [startTrial]);

  const set = <K extends keyof TmParams>(key: K, value: TmParams[K]) =>
    setParams((p) => ({ ...p, [key]: value }));

  const isExc = preset.kind === 'excitatory';

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="relative min-h-[300px] overflow-hidden rounded-xl border border-slate-800">
          <canvas ref={terminalCanvas} className="absolute inset-0 h-full w-full" />
        </div>

        <aside className="flex flex-col gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
            <div className="flex gap-1.5">
              {(['excitatory', 'inhibitory'] as SynapseKind[]).map((k) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => switchKind(k)}
                  aria-pressed={preset.kind === k}
                  className={`flex-1 rounded border px-2 py-1 text-[11px] font-medium ${
                    preset.kind === k
                      ? k === 'excitatory'
                        ? 'border-emerald-400/70 bg-emerald-400/20 text-emerald-100'
                        : 'border-rose-400/70 bg-rose-400/20 text-rose-100'
                      : 'border-slate-700 text-slate-400 hover:bg-slate-700/50'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-col gap-1">
              {PRESETS.filter((p) => p.kind === preset.kind).map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className={`rounded border px-2 py-1 text-left text-[11px] ${
                    p.id === presetId
                      ? 'border-sky-500/60 bg-sky-500/10 text-sky-200'
                      : 'border-slate-700 text-slate-300 hover:bg-slate-700/40'
                  }`}
                >
                  {p.label.split('·')[1]?.trim() ?? p.label}
                  <span className="mt-0.5 block text-[10px] text-slate-500">{p.note}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
            <h4 className="mb-1 text-[10px] tracking-widest text-slate-500 uppercase">synapse</h4>
            <Slider
              label="U — release probability"
              value={params.U}
              min={0.02}
              max={1}
              step={0.01}
              display={params.U.toFixed(2)}
              onChange={(v) => set('U', v)}
              accent="accent-sky-400"
            />
            <Slider
              label="τ recovery (depression)"
              value={params.tauRecMs}
              min={20}
              max={1200}
              step={10}
              unit=" ms"
              onChange={(v) => set('tauRecMs', v)}
              accent="accent-violet-400"
            />
            <Slider
              label="τ facilitation"
              value={params.tauFacilMs}
              min={5}
              max={1200}
              step={5}
              unit=" ms"
              onChange={(v) => set('tauFacilMs', v)}
              accent="accent-amber-400"
            />
            <Slider
              label="release sites"
              value={params.nSites}
              min={1}
              max={20}
              step={1}
              onChange={(v) => set('nSites', v)}
              accent="accent-emerald-400"
            />
            <Slider
              label="conductance per vesicle"
              value={params.quantalNs}
              min={0.1}
              max={3}
              step={0.1}
              unit=" nS"
              onChange={(v) => set('quantalNs', v)}
            />
            <Slider
              label="holding current"
              value={holdNa}
              min={0}
              max={0.25}
              step={0.01}
              unit=" nA"
              onChange={setHoldNa}
              accent="accent-amber-400"
            />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
            <h4 className="mb-1 text-[10px] tracking-widest text-slate-500 uppercase">stimulus</h4>
            <Slider
              label="frequency"
              value={freqHz}
              min={1}
              max={50}
              step={1}
              unit=" Hz"
              onChange={(v) => {
                setFreqHz(v);
                clearStats();
              }}
            />
            <Slider
              label="spikes in train"
              value={nSpikes}
              min={2}
              max={20}
              step={1}
              onChange={(v) => {
                setNSpikes(v);
                clearStats();
              }}
            />
            <Slider
              label="recovery test delay"
              value={recoveryMs}
              min={0}
              max={2000}
              step={50}
              unit=" ms"
              onChange={(v) => {
                setRecoveryMs(v);
                clearStats();
              }}
            />
            <Slider
              label="speed"
              value={speedIdx}
              min={0}
              max={SPEEDS.length - 1}
              step={1}
              display={speedLabel(SPEEDS[speedIdx])}
              onChange={setSpeedIdx}
            />
            <div className="mt-2 flex gap-1.5">
              <button
                type="button"
                onClick={startTrial}
                className="flex-1 rounded border border-sky-500/40 bg-sky-500/10 py-1 text-[11px] text-sky-200 hover:bg-sky-500/20"
              >
                run trial
              </button>
              <button
                type="button"
                onClick={() => setAutoRepeat((r) => !r)}
                aria-pressed={autoRepeat}
                className={`flex-1 rounded border py-1 text-[11px] ${
                  autoRepeat
                    ? 'border-sky-400/70 bg-sky-400/20 text-sky-100'
                    : 'border-slate-700 text-slate-400 hover:bg-slate-700/50'
                }`}
              >
                repeat
              </button>
              <button
                type="button"
                onClick={clearStats}
                className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700/50"
              >
                ⟲
              </button>
            </div>
            <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
              <input
                type="checkbox"
                checked={showMean}
                onChange={(e) => setShowMean(e.target.checked)}
                className="accent-sky-400"
              />
              show trial mean and prediction
            </label>
          </div>

          <dl className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 font-mono text-[11px]">
            <Row label="u (release prob.)" value={stats.u.toFixed(3)} />
            <Row
              label="available sites"
              value={`${Math.round(stats.avail * params.nSites)}/${params.nSites}`}
            />
            <Row label="last amplitude" value={`${stats.lastAmp.toFixed(2)} nS`} strong />
            <Row label="failure rate" value={`${(stats.failures * 100).toFixed(0)} %`} />
            <Row label="CV of 1st response" value={stats.cv1.toFixed(2)} />
            <Row label="post-synaptic V" value={`${stats.v.toFixed(1)} mV`} />
            <Row label="trials collected" value={`${stats.trials}`} />
          </dl>
        </aside>
      </div>

      <canvas ref={traceCanvas} className="h-[250px] w-full rounded-xl border border-slate-800" />
      <canvas ref={statsCanvas} className="h-[230px] w-full rounded-xl border border-slate-800" />
      <p className="text-[11px] text-slate-500">
        {isExc ? 'Excitatory' : 'Inhibitory'} synapse · reversal {params.eSynMv} mV ·{' '}
        {params.nSites} release sites · vesicle {params.quantalNs.toFixed(1)} nS
      </p>
    </div>
  );
}

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

type State = {
  t: number;
  schedule: number[];
  next: number;
  trialAmps: number[];
  trials: number[][];
  raster: number[];
  trace: Sample[];
  lastSpikeAt: number;
  flash: { site: number; at: number }[];
  failures: number;
  spikes: number;
  firstAmps: number[];
};
type Cfg = {
  params: TmParams;
  holdNa: number;
  freqHz: number;
  nSpikes: number;
  recoveryMs: number;
  speed: number;
  autoRepeat: boolean;
  showMean: boolean;
  preset: (typeof PRESETS)[number];
};

function drawOn(
  canvas: HTMLCanvasElement | null,
  dpr: number,
  fn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
) {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  fn(ctx, w, h);
}

/** Panel 1: the terminal, its release sites, and the two state variables. */
function drawTerminal(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  syn: TmSynapse,
  s: State,
  c: Cfg
) {
  fillPanel(ctx, w, h);
  const exc = c.preset.kind === 'excitatory';
  const accent = exc ? '#34d399' : '#f87171';
  const sinceSpike = s.t - s.lastSpikeAt;
  const spikeGlow = sinceSpike >= 0 && sinceSpike < 25 ? 1 - sinceSpike / 25 : 0;

  // presynaptic axon coming in from the left
  const axonY = h * 0.3;
  const boutonX = w * 0.42;
  ctx.strokeStyle = spikeGlow > 0.05 ? '#fbbf24' : 'rgba(148,163,184,0.55)';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  if (spikeGlow > 0.05) {
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 20 * spikeGlow;
  }
  ctx.beginPath();
  ctx.moveTo(24, axonY);
  ctx.lineTo(boutonX - 62, axonY);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // bouton
  const bw = 150;
  const bh = 96;
  const bx = boutonX - 62;
  const by = axonY - bh / 2;
  ctx.beginPath();
  roundRect(ctx, bx, by, bw, bh, 26);
  ctx.fillStyle = 'rgba(148,163,184,0.10)';
  ctx.fill();
  ctx.strokeStyle = spikeGlow > 0.05 ? 'rgba(251,191,36,0.9)' : 'rgba(148,163,184,0.5)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // release sites along the bottom face of the bouton
  const n = syn.sites.length;
  const sitesY = by + bh - 8;
  syn.sites.forEach((site, i) => {
    const x = bx + 20 + (bw - 40) * (n === 1 ? 0.5 : i / (n - 1));
    // docked vesicle
    const flashing = s.flash.find((f) => f.site === i);
    const fl = flashing ? 1 - (s.t - flashing.at) / 60 : 0;
    ctx.beginPath();
    ctx.arc(x, sitesY - 12, 6.5, 0, Math.PI * 2);
    if (site.available) {
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.9;
      if (fl > 0) {
        ctx.shadowColor = accent;
        ctx.shadowBlur = 14 * fl;
      }
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(148,163,184,0.5)';
      ctx.setLineDash([2, 2]);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // released vesicle crossing the cleft
    if (fl > 0) {
      const p = 1 - fl;
      const y = sitesY - 12 + p * 46;
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  });

  // post-synaptic membrane
  const postY = sitesY + 40;
  ctx.strokeStyle = 'rgba(226,232,240,0.22)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(bx - 26, postY);
  ctx.lineTo(bx + bw + 26, postY);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(148,163,184,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bx - 26, postY - 4);
  ctx.lineTo(bx + bw + 26, postY - 4);
  ctx.moveTo(bx - 26, postY + 4);
  ctx.lineTo(bx + bw + 26, postY + 4);
  ctx.stroke();

  ctx.font = `10px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(148,163,184,0.75)';
  ctx.fillText('presynaptic terminal', bx + bw / 2, by - 18);
  ctx.fillText(`post-synaptic membrane · E = ${c.params.eSynMv} mV`, bx + bw / 2, postY + 12);
  ctx.textAlign = 'left';
  ctx.fillText('presynaptic spike', 24, axonY - 22);

  // state bars: u and available fraction
  const barX = w - 168;
  const barW = 140;
  bar(ctx, barX, h * 0.3 - 26, barW, 'u  release probability', syn.u, 1, '#38bdf8');
  bar(ctx, barX, h * 0.3 + 16, barW, 'R  available vesicles', syn.availableFraction, 1, '#a78bfa');

  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = 'rgba(148,163,184,0.7)';
  ctx.textAlign = 'left';
  ctx.fillText(`${speedLabel(c.speed)}`, barX, h * 0.3 + 62);
  ctx.fillText(`${syn.available}/${n} sites ready`, barX, h * 0.3 + 78);
  ctx.fillText(`${c.freqHz} Hz · ${c.nSpikes} spikes`, barX, h * 0.3 + 94);
}

function bar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  label: string,
  value: number,
  max: number,
  color: string
) {
  ctx.font = `10px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(148,163,184,0.85)';
  ctx.fillText(label, x, y - 3);
  ctx.fillStyle = 'rgba(148,163,184,0.15)';
  roundRect(ctx, x, y, w, 8, 4);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(ctx, x, y, Math.max(1, w * Math.min(1, value / max)), 8, 4);
  ctx.fill();
  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = '#cbd5e1';
  ctx.textBaseline = 'top';
  ctx.fillText(value.toFixed(2), x + w + 6, y - 2);
}

/** Panel 2: spikes, synaptic conductance and post-synaptic voltage in time. */
function drawTrace(ctx: CanvasRenderingContext2D, w: number, h: number, s: State, c: Cfg) {
  fillPanel(ctx, w, h);
  const padL = 52;
  const padR = 14;
  const pw = Math.max(20, w - padL - padR);
  const rasterY = 18;
  const gTop = 32;
  const gH = (h - gTop - 34) * 0.42;
  const vTop = gTop + gH + 22;
  const vH = h - vTop - 26;

  const tMax = Math.max(s.t, TRACE_MS);
  const tMin = tMax - TRACE_MS;
  const xOf = (t: number) => padL + ((t - tMin) / TRACE_MS) * pw;

  const gMax = Math.max(1, c.params.nSites * c.params.quantalNs * 1.05);
  const gY = (g: number) => gTop + gH - (Math.min(g, gMax) / gMax) * gH;

  const exc = c.preset.kind === 'excitatory';
  const vs = s.trace.map((p) => p.v);
  const vLo = Math.min(-72, ...(vs.length ? vs : [-72])) - 1;
  const vHi = Math.max(-68, ...(vs.length ? vs : [-68])) + 1;
  const vY = (v: number) => vTop + vH - ((v - vLo) / Math.max(1, vHi - vLo)) * vH;

  // frames + labels
  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = 'rgba(148,163,184,0.75)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(148,163,184,0.12)';
  ctx.lineWidth = 1;
  for (const frac of [0, 0.5, 1]) {
    const y = gTop + gH * frac;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + pw, y);
    ctx.stroke();
    ctx.fillText((gMax * (1 - frac)).toFixed(1), padL - 6, y);
  }
  for (const v of niceTicks(vLo, vHi)) {
    const y = vY(v);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + pw, y);
    ctx.stroke();
    ctx.fillText(`${v}`, padL - 6, y);
  }

  ctx.save();
  ctx.translate(14, gTop + gH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(148,163,184,0.8)';
  ctx.font = `10px ${FONT}`;
  ctx.fillText('g syn (nS)', 0, 0);
  ctx.restore();
  ctx.save();
  ctx.translate(14, vTop + vH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('V post (mV)', 0, 0);
  ctx.restore();

  // presynaptic raster
  ctx.textAlign = 'right';
  ctx.font = `9px ${MONO}`;
  ctx.fillStyle = 'rgba(148,163,184,0.7)';
  ctx.fillText('pre', padL - 6, rasterY + 3);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.6;
  for (const t of s.raster) {
    if (t < tMin) continue;
    ctx.beginPath();
    ctx.moveTo(xOf(t), rasterY - 5);
    ctx.lineTo(xOf(t), rasterY + 5);
    ctx.stroke();
  }
  // failures marked with a hollow circle
  ctx.strokeStyle = 'rgba(248,113,113,0.9)';
  s.raster.forEach((t, i) => {
    if (t < tMin || s.trialAmps[i] === undefined) return;
    if (s.trialAmps[i] > 0) return;
    ctx.beginPath();
    ctx.arc(xOf(t), rasterY - 11, 3.2, 0, Math.PI * 2);
    ctx.stroke();
  });

  // conductance and voltage
  ctx.save();
  ctx.beginPath();
  ctx.rect(padL, gTop - 2, pw, gH + 4);
  ctx.clip();
  ctx.strokeStyle = exc ? '#34d399' : '#f87171';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  s.trace.forEach((p, i) => (i ? ctx.lineTo(xOf(p.t), gY(p.g)) : ctx.moveTo(xOf(p.t), gY(p.g))));
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(padL, vTop - 2, pw, vH + 4);
  ctx.clip();
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  s.trace.forEach((p, i) => (i ? ctx.lineTo(xOf(p.t), vY(p.v)) : ctx.moveTo(xOf(p.t), vY(p.v))));
  ctx.stroke();
  ctx.restore();

  // time axis
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(148,163,184,0.7)';
  ctx.font = `10px ${MONO}`;
  for (let t = Math.ceil(tMin / 200) * 200; t <= tMax; t += 200) {
    ctx.fillText(`${(t / 1000).toFixed(1)}`, xOf(t), h - 18);
  }
  ctx.textAlign = 'left';
  ctx.font = `10px ${FONT}`;
  ctx.fillText('time (s)', padL, h - 18);
}

/** Panel 3: amplitude against position in the train, over trials. */
function drawStats(ctx: CanvasRenderingContext2D, w: number, h: number, s: State, c: Cfg) {
  fillPanel(ctx, w, h);
  const padL = 52;
  const padR = 120;
  const padT = 24;
  const padB = 34;
  const pw = Math.max(20, w - padL - padR);
  const ph = Math.max(20, h - padT - padB);

  const total = c.nSpikes + (c.recoveryMs > 0 ? 1 : 0);
  const predicted = tmDeterministic(
    c.params,
    trainIntervals(c.nSpikes, c.freqHz, c.recoveryMs || undefined)
  );
  const maxAmp = Math.max(
    c.params.nSites * c.params.quantalNs * 0.6,
    ...predicted.map((p) => p.ampNs),
    ...s.trials.flat(),
    ...s.trialAmps
  );
  const xOf = (i: number) => padL + (total === 1 ? pw / 2 : (i / (total - 1)) * pw);
  const yOf = (a: number) => padT + ph - (a / (maxAmp * 1.1)) * ph;

  // grid
  ctx.strokeStyle = 'rgba(148,163,184,0.12)';
  ctx.lineWidth = 1;
  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = 'rgba(148,163,184,0.75)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let k = 0; k <= 4; k++) {
    const a = (maxAmp * 1.1 * k) / 4;
    const y = yOf(a);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + pw, y);
    ctx.stroke();
    ctx.fillText(a.toFixed(1), padL - 6, y);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i < total; i++) {
    const label = c.recoveryMs > 0 && i === total - 1 ? 'rec' : `${i + 1}`;
    ctx.fillText(label, xOf(i), padT + ph + 8);
  }
  ctx.textAlign = 'left';
  ctx.font = `10px ${FONT}`;
  ctx.fillStyle = 'rgba(148,163,184,0.8)';
  ctx.fillText('spike in train', padL, padT + ph + 22);
  ctx.save();
  ctx.translate(14, padT + ph / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('amplitude (nS)', 0, 0);
  ctx.restore();

  // individual trials
  ctx.fillStyle = 'rgba(148,163,184,0.35)';
  for (const trial of s.trials) {
    trial.forEach((a, i) => {
      if (i >= total) return;
      ctx.beginPath();
      ctx.arc(xOf(i) + (Math.random() - 0.5) * 3, yOf(a), 1.8, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // current trial in progress
  ctx.strokeStyle = c.preset.kind === 'excitatory' ? '#34d399' : '#f87171';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  s.trialAmps.forEach((a, i) => (i ? ctx.lineTo(xOf(i), yOf(a)) : ctx.moveTo(xOf(i), yOf(a))));
  ctx.stroke();
  ctx.fillStyle = ctx.strokeStyle;
  s.trialAmps.forEach((a, i) => {
    ctx.beginPath();
    ctx.arc(xOf(i), yOf(a), 3, 0, Math.PI * 2);
    ctx.fill();
  });

  if (c.showMean) {
    // mean over collected trials
    if (s.trials.length) {
      const means: number[] = [];
      for (let i = 0; i < total; i++) {
        const vals = s.trials.map((t) => t[i]).filter((v) => v !== undefined);
        means.push(vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : NaN);
      }
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      means.forEach((m, i) => {
        if (Number.isNaN(m)) return;
        if (i === 0) ctx.moveTo(xOf(i), yOf(m));
        else ctx.lineTo(xOf(i), yOf(m));
      });
      ctx.stroke();
    }
    // deterministic prediction
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    predicted.forEach((p, i) =>
      i ? ctx.lineTo(xOf(i), yOf(p.ampNs)) : ctx.moveTo(xOf(i), yOf(p.ampNs))
    );
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // legend
  const lx = padL + pw + 16;
  let ly = padT + 6;
  const legend: [string, string, boolean][] = [
    ['this trial', c.preset.kind === 'excitatory' ? '#34d399' : '#f87171', false],
    [`trials (${s.trials.length})`, 'rgba(148,163,184,0.6)', false],
    ['mean', '#f8fafc', false],
    ['deterministic TM', '#38bdf8', true],
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
  ctx.fillStyle = 'rgba(148,163,184,0.7)';
  ctx.font = `10px ${MONO}`;
  ctx.fillText(
    `${(s.spikes ? (s.failures / s.spikes) * 100 : 0).toFixed(0)} % failures`,
    lx,
    ly + 6
  );
}

function niceTicks(lo: number, hi: number): number[] {
  const span = hi - lo;
  const step = span > 40 ? 10 : span > 16 ? 5 : span > 6 ? 2 : 1;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v);
  return out;
}
