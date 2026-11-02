'use client';

// LOCAL TEST ONLY, remove before committing: the brain activity Brian2 recorded in a banc_rl check's
// scales (banc_rl/transfer.py), beside its replay.
import { useEffect, useState } from 'react';

import { REPLAYS } from './training-progress';

import type { MorphoViewerSpikes } from '@/morpho-viewer';

const COLOR = {
  text: '#f0efec',
  secondary: '#c3c2b7',
  muted: '#8f8e86',
  grid: '#2c2c2a',
  surface: '#1a1a19',
};

interface Group {
  name: string;
  neurons: number;
  rates_hz: number[];
}

export interface Activity {
  bin_ms: number;
  duration_ms: number;
  neurons: number;
  active: number;
  spikes: number;
  groups: Group[];
  approach_mm: number;
  overturned_s: number | null;
  sources_reached: number;
}

/** ``<replay>-activity.json`` and ``<replay>-spikes.bin`` (node ids, then times in ms), or nulls. */
export function useRecordedActivity(replayId: string | undefined) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [spikes, setSpikes] = useState<Pick<MorphoViewerSpikes, 'cellIndices' | 'times'> | null>(null);
  useEffect(() => {
    setActivity(null);
    setSpikes(null);
    if (!replayId) return undefined;
    let cancelled = false;
    fetch(`${REPLAYS}/${replayId}-activity.json`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => !cancelled && setActivity(json));
    fetch(`${REPLAYS}/${replayId}-spikes.bin`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.arrayBuffer() : null))
      .then((buffer) => {
        if (cancelled || !buffer) return;
        const count = buffer.byteLength / 8;
        setSpikes({
          cellIndices: new Uint32Array(buffer, 0, count),
          times: new Float32Array(buffer, count * 4, count),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [replayId]);
  return { activity, spikes };
}

const WIDTH = 400;
const ROW = 46;
const MARGIN = { left: 8, right: 44, top: 4, bottom: 22 };

/** One row per group, each on its own rate scale, time shared; the playhead at ``timeMs``. */
export function ActivityPanel({
  activity,
  timeMs,
  color,
  check,
}: {
  activity: Activity;
  timeMs: number;
  color: string;
  check?: [number, number];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const bins = activity.groups[0].rates_hz.length;
  const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
  const height = MARGIN.top + activity.groups.length * ROW + MARGIN.bottom;
  const x = (ms: number) => MARGIN.left + (ms / activity.duration_ms) * innerWidth;
  const binAt = hover === null ? null : Math.min(bins - 1, Math.floor(hover / activity.bin_ms));
  const overturned =
    activity.overturned_s === null ? 'stayed upright' : `turned over at ${activity.overturned_s.toFixed(2)} s`;

  return (
    <div style={{ background: COLOR.surface, color: COLOR.text, padding: 10, borderRadius: 6, fontSize: 12 }}>
      <div style={{ fontWeight: 600 }}>Brain activity in obi-one&apos;s Brian2 loop</div>
      <div style={{ color: COLOR.secondary, marginTop: 2 }}>
        The check&apos;s scales in the platform&apos;s own simulator: one episode, gained{' '}
        {activity.approach_mm.toFixed(2)} mm
        {check && ` (the replica's check: ${check[0].toFixed(2)} ± ${check[1].toFixed(2)} mm)`}, {overturned}.{' '}
        {activity.spikes.toLocaleString()} spikes from {activity.active.toLocaleString()} of{' '}
        {activity.neurons.toLocaleString()} neurons; the 3D view plays them.
      </div>
      <div style={{ marginTop: 10, fontWeight: 600 }}>Mean firing rate (Hz), {activity.bin_ms} ms bins</div>
      <svg
        width={WIDTH}
        height={height}
        style={{ display: 'block', marginTop: 4 }}
        onMouseMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const ms = ((event.clientX - box.left - MARGIN.left) / innerWidth) * activity.duration_ms;
          setHover(ms >= 0 && ms <= activity.duration_ms ? ms : null);
        }}
        onMouseLeave={() => setHover(null)}
      >
        {activity.groups.map((group, row) => {
          const top = MARGIN.top + row * ROW;
          const peak = Math.max(...group.rates_hz) || 1;
          const y = (rate: number) => top + ROW - 6 - (rate / peak) * (ROW - 20);
          const line = group.rates_hz
            .map((rate, i) => `${i ? 'L' : 'M'}${x((i + 0.5) * activity.bin_ms).toFixed(1)},${y(rate).toFixed(1)}`)
            .join('');
          return (
            <g key={group.name}>
              <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(0)} y2={y(0)} stroke={COLOR.grid} />
              <text x={MARGIN.left} y={top + 10} fill={COLOR.secondary} fontSize={11}>
                {group.name} · {group.neurons.toLocaleString()}
                {binAt !== null && (
                  <tspan fill={COLOR.text}> · {group.rates_hz[binAt].toFixed(1)} Hz</tspan>
                )}
              </text>
              <text x={WIDTH - MARGIN.right + 6} y={y(peak) + 4} fill={COLOR.muted} fontSize={10}>
                {peak >= 10 ? peak.toFixed(0) : peak.toFixed(1)}
              </text>
              <text x={WIDTH - MARGIN.right + 6} y={y(0) + 4} fill={COLOR.muted} fontSize={10}>
                0
              </text>
              <path d={line} fill="none" stroke={color} strokeWidth={1.5} />
            </g>
          );
        })}
        {[0, 0.5, 1, 1.5, 2].filter((s) => s * 1000 <= activity.duration_ms).map((s) => (
          <text key={s} x={x(s * 1000)} y={height - 6} fill={COLOR.muted} fontSize={10} textAnchor="middle">
            {s} s
          </text>
        ))}
        <line
          x1={x(timeMs)}
          x2={x(timeMs)}
          y1={MARGIN.top}
          y2={height - MARGIN.bottom}
          stroke={COLOR.text}
          strokeOpacity={0.6}
        />
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={MARGIN.top} y2={height - MARGIN.bottom} stroke={COLOR.muted} />
        )}
      </svg>
      <div style={{ color: COLOR.muted, marginTop: 4 }}>
        Each row on its own scale (its peak at the right). The light line is the replay&apos;s time; hover for
        values.
      </div>
    </div>
  );
}
