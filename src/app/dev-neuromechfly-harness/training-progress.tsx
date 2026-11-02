'use client';

// LOCAL TEST ONLY, remove before committing: a banc_rl training run's progress, beside its replays.
import { useEffect, useMemo, useState } from 'react';

export const REPLAYS = '/static/neuromechfly/replays';
const POLL_MS = 30_000;
// The reference palette's dark steps: categorical slots 1-3, the chart surface and text inks.
const COLOR = {
  left: '#3987e5',
  right: '#d95926',
  overturned: '#199e70',
  surface: '#1a1a19',
  text: '#f0efec',
  secondary: '#c3c2b7',
  muted: '#8f8e86',
  grid: '#2c2c2a',
};
const SIDES = ['left', 'right'] as const;
type Side = (typeof SIDES)[number];

interface Generation {
  generation: number;
  seconds: number;
  approach_left: number;
  approach_right: number;
  overturned: number;
}

interface Evaluation {
  evaluation: number;
  approach_left: [number, number];
  approach_right: [number, number];
  reached: number;
  overturned: number;
}

/** A check's scales run once in obi-one's Brian2 loop (banc_rl/transfer.py). */
interface Transfer {
  check: number;
  side: Side;
  approach_mm: number;
  overturned_s: number | null;
}

export interface TrainingLog {
  generations: Generation[];
  evaluations: Evaluation[];
  transfers: Transfer[];
}

/** ``rl-<run>-gen<N>-<side>``, the replays banc_rl/train.py writes, or with ``-brian2`` the same
 * scales in Brian2 (transfer.py); or null. */
export function parseTrainingReplay(id: string | undefined) {
  const match = id?.match(/^rl-(.+)-gen(\d+)-(left|right)(-brian2)?$/);
  if (!match) return null;
  return { run: match[1], generation: Number(match[2]), side: match[3] as Side, platform: !!match[4] };
}

export function trainingReplayId(run: string, generation: number, side: Side, platform = false) {
  return `rl-${run}-gen${generation}-${side}${platform ? '-brian2' : ''}`;
}

function jsonLines(text: string) {
  return text
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

/** The run's log.jsonl and transfers.jsonl (linked beside its replays), polled while the run goes on. */
export function useTrainingLog(run: string | undefined): TrainingLog | null {
  const [log, setLog] = useState<TrainingLog | null>(null);
  useEffect(() => {
    if (!run) return undefined;
    let cancelled = false;
    const load = async () => {
      const [response, transfers] = await Promise.all(
        ['log', 'transfers'].map((name) => fetch(`${REPLAYS}/rl-${run}-${name}.jsonl`, { cache: 'no-store' }))
      );
      if (!response.ok || cancelled) return;
      const lines = jsonLines(await response.text());
      setLog({
        generations: lines.filter((line) => 'generation' in line),
        evaluations: lines.filter((line) => 'evaluation' in line),
        transfers: transfers.ok ? jsonLines(await transfers.text()) : [],
      });
    };
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [run]);
  return log;
}

function niceStep(span: number, ticks: number) {
  const raw = span / ticks;
  const power = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * power).find((step) => step >= raw) ?? raw;
}

function ticksOf(low: number, high: number, count: number) {
  const step = niceStep(high - low || 1, count);
  const out = [];
  for (let value = Math.ceil(low / step) * step; value <= high + step * 1e-6; value += step) {
    out.push(Number(value.toFixed(6)));
  }
  return out;
}

const WIDTH = 400;
const MARGIN = { left: 40, right: 12, top: 10, bottom: 24 };

function Frame({
  height,
  xMax,
  yLow,
  yHigh,
  format,
  children,
  onHover,
}: {
  height: number;
  xMax: number;
  yLow: number;
  yHigh: number;
  format: (value: number) => string;
  children: (x: (g: number) => number, y: (v: number) => number) => React.ReactNode;
  onHover: (generation: number | null) => void;
}) {
  const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;
  const x = (g: number) => MARGIN.left + (g / xMax) * innerWidth;
  const y = (v: number) => MARGIN.top + (1 - (v - yLow) / (yHigh - yLow)) * innerHeight;
  return (
    <svg
      width={WIDTH}
      height={height}
      style={{ display: 'block' }}
      onMouseMove={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        const g = Math.round(((event.clientX - box.left - MARGIN.left) / innerWidth) * xMax);
        onHover(g >= 0 && g <= xMax ? g : null);
      }}
      onMouseLeave={() => onHover(null)}
    >
      {ticksOf(yLow, yHigh, 4).map((tick) => (
        <g key={tick}>
          <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke={COLOR.grid} />
          <text x={MARGIN.left - 6} y={y(tick) + 4} fill={COLOR.muted} fontSize={10} textAnchor="end">
            {format(tick)}
          </text>
        </g>
      ))}
      {ticksOf(0, xMax, 5).map((tick) => (
        <text key={tick} x={x(tick)} y={height - 8} fill={COLOR.muted} fontSize={10} textAnchor="middle">
          {tick}
        </text>
      ))}
      {children(x, y)}
    </svg>
  );
}

function path(points: [number, number][]) {
  return points.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join('');
}

export function TrainingProgress({
  run,
  log,
  generation,
  side,
  platform,
  onSelect,
}: {
  run: string;
  log: TrainingLog | null;
  generation: number;
  side: Side;
  platform: boolean;
  onSelect: (generation: number, side: Side, platform: boolean) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const scales = useMemo(() => {
    if (!log?.generations.length) return null;
    const last = log.generations[log.generations.length - 1].generation;
    const values = [
      ...log.generations.flatMap((g) => [g.approach_left, g.approach_right]),
      ...log.evaluations.flatMap((e) => [
        e.approach_left[0] + e.approach_left[1],
        e.approach_right[0] + e.approach_right[1],
        e.approach_left[0] - e.approach_left[1],
        e.approach_right[0] - e.approach_right[1],
      ]),
      ...log.transfers.map((t) => t.approach_mm),
    ];
    return {
      xMax: Math.max(10, last + 1),
      yLow: Math.min(0, ...values),
      yHigh: Math.max(...values) * 1.1,
    };
  }, [log]);

  if (!log || !scales) {
    const text = log ? `Waiting for ${run}'s first generation…` : `Loading ${run}'s log…`;
    return <div style={{ color: COLOR.secondary }}>{text}</div>;
  }
  const { generations, evaluations, transfers } = log;
  const last = generations[generations.length - 1];
  const recent = generations.slice(-10);
  const secondsPerGeneration = recent.reduce((sum, g) => sum + g.seconds, 0) / recent.length;
  const hovered = hover === null ? undefined : generations.find((g) => g.generation + 1 === hover);
  const hoveredEvaluation =
    hover === null ? undefined : evaluations.find((e) => e.evaluation === hover);
  const brian2 = (check: number) =>
    SIDES.map((s) => transfers.find((t) => t.check === check && t.side === s)?.approach_mm);
  const hoveredTransfer = hover === null ? [] : brian2(hover);
  const latest = evaluations[evaluations.length - 1];

  return (
    <div style={{ background: COLOR.surface, color: COLOR.text, padding: 10, borderRadius: 6, fontSize: 12 }}>
      <div style={{ fontWeight: 600 }}>Training run {run}</div>
      <div style={{ color: COLOR.secondary, marginTop: 2 }}>
        Generation {last.generation + 1} done · {secondsPerGeneration.toFixed(0)} s each
        {latest &&
          ` · latest check (gen ${latest.evaluation}): ${latest.approach_left[0].toFixed(2)} / ${latest.approach_right[0].toFixed(2)} mm, ${(latest.overturned * 100).toFixed(0)}% turned over`}
      </div>

      <div style={{ marginTop: 10, fontWeight: 600 }}>Distance gained on the odour source in 2 s (mm)</div>
      <div style={{ display: 'flex', gap: 14, color: COLOR.secondary, marginTop: 4, whiteSpace: 'nowrap' }}>
        {SIDES.map((s) => (
          <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 14, height: 2, background: COLOR[s], display: 'inline-block' }} />
            source {s}
          </span>
        ))}
      </div>
      <div style={{ color: COLOR.muted, margin: '2px 0 4px' }}>
        Lines: the population&apos;s mean each generation. Dots: a check of the current scales, ± sd.
        {transfers.length > 0 && " Rings: the check's scales in obi-one's Brian2 loop, one episode."}
      </div>
      <div style={{ position: 'relative' }}>
        <Frame
          height={210}
          xMax={scales.xMax}
          yLow={scales.yLow}
          yHigh={scales.yHigh}
          format={(v) => v.toFixed(1)}
          onHover={setHover}
        >
          {(x, y) => (
            <>
              {hover !== null && (
                <line x1={x(hover)} x2={x(hover)} y1={MARGIN.top} y2={210 - MARGIN.bottom} stroke={COLOR.muted} />
              )}
              {SIDES.map((s) => (
                <path
                  key={s}
                  d={path(generations.map((g) => [x(g.generation + 1), y(s === 'left' ? g.approach_left : g.approach_right)]))}
                  fill="none"
                  stroke={COLOR[s]}
                  strokeWidth={1.5}
                  strokeOpacity={0.75}
                />
              ))}
              {transfers.map((t) => {
                const cx = x(t.check) + (t.side === 'right' ? 4 : -4);
                const selected = platform && t.check === generation && t.side === side;
                return (
                  <g
                    key={`brian2-${t.check}-${t.side}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelect(t.check, t.side, true)}
                  >
                    <circle cx={cx} cy={y(t.approach_mm)} r={8} fill="transparent" />
                    <circle
                      cx={cx}
                      cy={y(t.approach_mm)}
                      r={selected ? 7 : 6}
                      fill="none"
                      stroke={selected ? COLOR.text : COLOR[t.side]}
                      strokeWidth={2}
                    />
                  </g>
                );
              })}
              {evaluations.map((e) =>
                SIDES.map((s, i) => {
                  const [mean, sd] = s === 'left' ? e.approach_left : e.approach_right;
                  const cx = x(e.evaluation) + (i ? 4 : -4);
                  const selected = !platform && e.evaluation === generation && s === side;
                  return (
                    <g
                      key={`${e.evaluation}-${s}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onSelect(e.evaluation, s, false)}
                    >
                      <line x1={cx} x2={cx} y1={y(mean - sd)} y2={y(mean + sd)} stroke={COLOR[s]} strokeWidth={1.5} />
                      <circle cx={cx} cy={y(mean)} r={12} fill="transparent" />
                      <circle
                        cx={cx}
                        cy={y(mean)}
                        r={selected ? 6 : 4.5}
                        fill={COLOR[s]}
                        stroke={selected ? COLOR.text : COLOR.surface}
                        strokeWidth={2}
                      />
                    </g>
                  );
                })
              )}
            </>
          )}
        </Frame>
        {hovered && (
          <div
            style={{
              position: 'absolute',
              top: 6,
              left: Math.min(WIDTH - 170, Math.max(44, (hover! / scales.xMax) * WIDTH)),
              background: '#0d0d0c',
              border: `1px solid ${COLOR.grid}`,
              borderRadius: 4,
              padding: '4px 6px',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ color: COLOR.text }}>Generation {hovered.generation + 1}</div>
            <div style={{ color: COLOR.secondary }}>
              left {hovered.approach_left.toFixed(2)} mm · right {hovered.approach_right.toFixed(2)} mm
            </div>
            <div style={{ color: COLOR.secondary }}>{(hovered.overturned * 100).toFixed(0)}% turned over</div>
            {hoveredEvaluation && (
              <div style={{ color: COLOR.secondary }}>
                check: {hoveredEvaluation.approach_left[0].toFixed(2)} / {hoveredEvaluation.approach_right[0].toFixed(2)} mm
              </div>
            )}
            {hoveredTransfer.some((value) => value !== undefined) && (
              <div style={{ color: COLOR.secondary }}>
                Brian2: {hoveredTransfer.map((value) => (value === undefined ? '–' : value.toFixed(2))).join(' / ')} mm
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, fontWeight: 600 }}>Turned over (% of the population&apos;s episodes)</div>
      <Frame height={110} xMax={scales.xMax} yLow={0} yHigh={Math.max(0.2, ...generations.map((g) => g.overturned)) * 1.1} format={(v) => `${Math.round(v * 100)}`} onHover={setHover}>
        {(x, y) => (
          <>
            {hover !== null && (
              <line x1={x(hover)} x2={x(hover)} y1={MARGIN.top} y2={110 - MARGIN.bottom} stroke={COLOR.muted} />
            )}
            <path
              d={path(generations.map((g) => [x(g.generation + 1), y(g.overturned)]))}
              fill="none"
              stroke={COLOR.overturned}
              strokeWidth={2}
            />
          </>
        )}
      </Frame>
      <div style={{ color: COLOR.muted, marginTop: 4 }}>
        Generations on the x axis. Click a dot to replay that check{transfers.length > 0 && ', a ring its Brian2 run'}.
      </div>
    </div>
  );
}
