'use client';

// LOCAL TEST ONLY, remove before committing: the NeuroMechFly scene on BANC's somas, signed out.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  BodyPreviewControls,
  BodyReplayNote,
} from '@/features/scan-config/components/circuit-viz/body-preview-controls';
import { NEUROMECHFLY_MARKER_RADIUS } from '@/features/scan-config/components/model-preview/neuromechfly/scene';
import { useBodyReplay } from '@/features/scan-config/components/model-preview/neuromechfly/replay';
import { useEmbodiedScene } from '@/features/scan-config/components/model-preview/neuromechfly/use-neuromechfly-scene';
import { MorphoViewerCircuitMultipleNeuronsSomaOnly, useMorphoViewerSignals } from '@/morpho-viewer';

import { ActivityPanel, useRecordedActivity } from './activity';
import {
  parseTrainingReplay,
  REPLAYS,
  TrainingProgress,
  trainingReplayId,
  useTrainingLog,
} from './training-progress';

import type { Config } from '@/features/scan-config/types';
import type { MorphoViewerSpikes } from '@/morpho-viewer';

// Simulated ms per wall-clock second; the viewer's own default (100) plays a body ten times slowed.
const SIDE_COLORS = { left: '#3987e5', right: '#d95926' };
const SPEEDS = [
  { label: '0.25×', value: 250 },
  { label: '0.5×', value: 500 },
  { label: '1× (real time)', value: 1000 },
  { label: '2×', value: 2000 },
];

const INITIAL: Config = {
  arena: { type: 'OdourArena', start_heading: 0, capture_radius: 4, peak_odour_intensity: 1 },
  odour_sources: { 'Odour Source 1': { type: 'OdourSource', x: 22, y: 11 } },
  walls: { 'Wall 1': { type: 'Wall', x0: 15, y0: -4, x1: 15, y1: 6 } },
  forces: {
    Push: {
      type: 'BodyForce',
      segment: 'thorax',
      frame: 'body',
      force_x: 0,
      force_y: -2,
      force_z: 0,
      start: 1000,
      duration: 200,
      frequency: 0,
    },
  },
  leg_overrides: {
    Lift: { type: 'LegOverride', leg: 'left_front', mode: 'lift', start: 1000, duration: 500 },
    Swing: {
      type: 'LegOverride',
      leg: 'right_middle',
      mode: 'swing',
      start: 1600,
      duration: 800,
      joint: 'tibia',
      amplitude: 30,
      frequency: 4,
    },
  },
};

const BODY_INTERFACE = { body: 'NeuroMechFly (flygym 1.2.1)' };
const BLOCKS = [
  ['', ''],
  ['forces', 'Push'],
  ['leg_overrides', 'Lift'],
  ['leg_overrides', 'Swing'],
];

export function Harness() {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <Scene />
    </QueryClientProvider>
  );
}

function Scene() {
  const [config, setConfig] = useState<Config>(INITIAL);
  const [positions, setPositions] = useState<Float32Array | null>(null);
  const [selected, setSelected] = useState(0);
  const signals = useMorphoViewerSignals();
  const light = typeof window !== 'undefined' && window.location.search.includes('light');
  // ?replay=<simulation id>&t=<spike ms>: a stored episode, played on a stand-in spike train as long
  // as the episode (on the recorded spikes, for a check's Brian2 run), from <spike ms> if given. It
  // plays at once, in real time, and loops.
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const [replayId, setReplayId] = useState(() => params?.get('replay') ?? undefined);
  const replayTime = Number(params?.get('t') ?? Number.NaN);
  const training = parseTrainingReplay(replayId);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [looping, setLooping] = useState(true);
  const [follow, setFollow] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const [time, setTime] = useState(0);
  const shown = useRef(0);
  const replay = useBodyReplay(replayId);
  const log = useTrainingLog(training?.run);
  const [notice, setNotice] = useState<string | null>(null);
  const durationMs = replay ? (replay.frames.thorax.length - 1) * replay.frame_ms : 4000;
  const recorded = useRecordedActivity(training?.platform ? replayId : undefined);
  const platformRun = (side: 'left' | 'right') =>
    !!training && !!log?.transfers.some((t) => t.check === training.generation && t.side === side);
  const selectReplay = useCallback((id: string) => {
    window.history.replaceState(null, '', `?replay=${id}`);
    setReplayId(id);
    setPaused(false);
    setTime(0);
  }, []);
  // Replays exist only for the run's checks (every --evaluate-every generations): asked for another
  // generation, show the nearest check before it, and say so.
  const [missing, setMissing] = useState<string | null>(null);
  useEffect(() => {
    if (!replayId || !parseTrainingReplay(replayId)) return undefined;
    let cancelled = false;
    fetch(`${REPLAYS}/${replayId}.json`, { method: 'HEAD', cache: 'no-store' }).then((response) => {
      if (!cancelled && !response.ok) setMissing(replayId);
    });
    return () => {
      cancelled = true;
    };
  }, [replayId]);
  useEffect(() => {
    if (!missing || !log) return;
    const asked = parseTrainingReplay(missing);
    if (!asked) return;
    if (asked.platform) {
      setMissing(null);
      setNotice(
        `No Brian2 run of generation ${asked.generation}'s scales on the ${asked.side} ` +
          "(banc_rl/transfer.py makes them). Showing the replica's episode."
      );
      selectReplay(trainingReplayId(asked.run, asked.generation, asked.side));
      return;
    }
    const checks = log.evaluations.map((e) => e.evaluation);
    if (!checks.length) {
      setNotice('No replays yet: the run saves its first after generation 10.');
      return;
    }
    const before = checks.filter((g) => g <= asked.generation);
    const shown = before.length ? before[before.length - 1] : checks[checks.length - 1];
    setMissing(null);
    setNotice(
      `No replay for generation ${asked.generation}: the run saves one at each check ` +
        `(generations ${checks.join(', ')}). Showing generation ${shown}.`
    );
    selectReplay(trainingReplayId(asked.run, shown, asked.side));
  }, [missing, log, selectReplay]);
  const onTime = useCallback((timeInMs: number) => {
    const now = performance.now();
    if (now - shown.current < 100) return;
    shown.current = now;
    setTime(timeInMs);
  }, []);
  const [root, entry] = BLOCKS[selected];
  const scene = useEmbodiedScene({
    bodyInterface: BODY_INTERFACE,
    config: replayId ? undefined : config,
    setConfig: replayId ? undefined : (update) => setConfig((previous) => update(previous)),
    backgroundDark: !light,
    selectedRootElement: root || undefined,
    selectedEntry: entry || undefined,
    signals,
    replay,
  });
  const platform = !!training?.platform;
  const spikes = useMemo<MorphoViewerSpikes | undefined>(() => {
    if (!replay || !positions) return undefined;
    if (platform) {
      return recorded.spikes ? { ...recorded.spikes, timeMinInMs: 0, timeMaxInMs: durationMs } : undefined;
    }
    const cells = positions.length / 3;
    const times = Float32Array.from({ length: durationMs + 1 }, (_, i) => i);
    return {
      cellIndices: Uint32Array.from(times, (_, i) => (i * 7919) % cells),
      times,
      timeMinInMs: 0,
      timeMaxInMs: durationMs,
    };
  }, [replay, positions, durationMs, platform, recorded.spikes]);

  // The viewer stops at the end of the episode, and when a new one arrives: start it again unless
  // the pause was asked for.
  useEffect(() => {
    if (!spikes || playing || paused || !looping) return undefined;
    const timer = setTimeout(() => setPlaying(true), 300);
    return () => clearTimeout(timer);
  }, [spikes, playing, paused, looping]);

  useEffect(() => {
    fetch('/static/neuromechfly/dev-banc-positions.bin')
      .then((r) => r.arrayBuffer())
      .then((b) => setPositions(new Float32Array(b)));
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', background: light ? '#fff' : '#111' }}>
      <div style={{ flex: 1, position: 'relative' }} data-testid="nmf-viewer">
        {positions && (
          <MorphoViewerCircuitMultipleNeuronsSomaOnly
            somaRadius={3}
            gizmo
            positions={positions}
            backgroundColor={light ? '#ffffff' : '#111111'}
            signals={signals}
            overlays={scene.overlays}
            overlaysRadius={NEUROMECHFLY_MARKER_RADIUS}
            overlaysMinRadiusInPixels={5}
            overlaysMaxRadiusInPixels={12}
            overlaysInteractive={scene.interactive}
            onOverlayTransform={scene.onOverlayTransform}
            highlightedOverlayId={scene.highlightedOverlayId}
            meshes={scene.meshes}
            cellsMatrix={scene.cellsMatrix}
            meshAnimation={scene.meshAnimation}
            cellsTrack={scene.cellsTrack}
            followCells={follow}
            ground={scene.ground}
            spikes={spikes}
            spikeTime={Number.isFinite(replayTime) ? replayTime : undefined}
            spikePlaying={playing}
            onSpikePlayingChange={setPlaying}
            spikeSpeed={speed}
            onSpikeTimeChange={onTime}
          />
        )}
        <div style={{ position: 'absolute', left: 12, top: 56 }}>
          {scene.bodyPreview && <BodyPreviewControls {...scene.bodyPreview} />}
          {scene.bodyReplay && <BodyReplayNote {...scene.bodyReplay} />}
          {notice && (
            <div
              style={{
                marginTop: 8,
                maxWidth: 420,
                padding: '6px 10px',
                borderRadius: 6,
                background: 'rgba(26, 26, 25, 0.92)',
                color: '#f0efec',
                fontSize: 13,
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
              }}
            >
              <span>{notice}</span>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setNotice(null)}
                style={{ background: 'transparent', color: '#c3c2b7', border: 'none', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
          )}
          {training && (
            <div
              style={{
                marginTop: 8,
                maxWidth: 420,
                padding: '6px 10px',
                borderRadius: 6,
                background: 'rgba(26, 26, 25, 0.92)',
                color: '#c3c2b7',
                fontSize: 12,
              }}
            >
              {platform &&
                (recorded.spikes
                  ? `Somas flash on the ${recorded.spikes.times.length.toLocaleString()} spikes Brian2 recorded. ` +
                    'Click the fly to zoom onto its CNS; tick "follow fly" to keep it in view.'
                  : 'Loading the spikes Brian2 recorded…')}
              {!platform &&
                `Somas flash on a stand-in spike train: the GPU replica records no spikes.${
                  platformRun(training.side) ? ' Brian2 (platform) plays the recorded ones.' : ''
                }`}
            </div>
          )}
        </div>
        {spikes && (
          <div
            style={{
              position: 'absolute',
              left: 12,
              bottom: 12,
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              padding: '6px 10px',
              borderRadius: 6,
              background: 'rgba(26, 26, 25, 0.9)',
              color: '#f0efec',
              fontSize: 13,
            }}
          >
            <button
              type="button"
              data-testid="nmf-play"
              style={{ minWidth: 64, padding: '2px 8px' }}
              onClick={() => {
                setPaused(playing);
                setPlaying(!playing);
              }}
            >
              {playing ? 'Pause' : 'Play'}
            </button>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {(time / 1000).toFixed(2)} / {(durationMs / 1000).toFixed(2)} s
            </span>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              style={{ background: '#2c2c2a', color: '#f0efec', border: '1px solid #52514e', borderRadius: 4 }}
            >
              {SPEEDS.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label>
              <input type="checkbox" checked={looping} onChange={(e) => setLooping(e.target.checked)} /> loop
            </label>
            <label title="The camera travels with the fly, so a zoomed view stays on it">
              <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} /> follow fly
            </label>
            {training &&
              (['left', 'right'] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  disabled={side === training.side}
                  onClick={() =>
                    selectReplay(trainingReplayId(training.run, training.generation, side, platform && platformRun(side)))
                  }
                  style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    color: '#f0efec',
                    background: side === training.side ? '#2c2c2a' : 'transparent',
                    border: `1px solid ${side === training.side ? SIDE_COLORS[side] : '#52514e'}`,
                    cursor: side === training.side ? 'default' : 'pointer',
                  }}
                >
                  source {side}
                </button>
              ))}
            {training && <span style={{ color: '#c3c2b7' }}>generation {training.generation}</span>}
            {training &&
              (platform || platformRun(training.side)) &&
              [false, true].map((brian2) => (
                <button
                  key={String(brian2)}
                  type="button"
                  disabled={brian2 === platform}
                  onClick={() =>
                    selectReplay(trainingReplayId(training.run, training.generation, training.side, brian2))
                  }
                  style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    color: '#f0efec',
                    background: brian2 === platform ? '#2c2c2a' : 'transparent',
                    border: `1px solid ${brian2 === platform ? '#f0efec' : '#52514e'}`,
                    cursor: brian2 === platform ? 'default' : 'pointer',
                  }}
                >
                  {brian2 ? 'Brian2 (platform)' : 'GPU replica'}
                </button>
              ))}
          </div>
        )}
      </div>
      {training ? (
        <div style={{ width: 430, padding: 8, background: '#111', overflowY: 'auto' }}>
          {platform && recorded.activity && (
            <div style={{ marginBottom: 8 }}>
              <ActivityPanel
                activity={recorded.activity}
                timeMs={time}
                color={SIDE_COLORS[training.side]}
                check={
                  log?.evaluations.find((e) => e.evaluation === training.generation)?.[
                    training.side === 'left' ? 'approach_left' : 'approach_right'
                  ]
                }
              />
            </div>
          )}
          <TrainingProgress
            run={training.run}
            log={log}
            generation={training.generation}
            side={training.side}
            platform={platform}
            onSelect={(generation, side, brian2) =>
              selectReplay(trainingReplayId(training.run, generation, side, brian2))
            }
          />
        </div>
      ) : (
      <div style={{ width: 320, color: '#ddd', fontSize: 12, padding: 8, background: '#111' }}>
        <select
          data-testid="nmf-block"
          value={selected}
          onChange={(e) => setSelected(Number(e.target.value))}
        >
          {BLOCKS.map(([r, name], index) => (
            <option key={`${r}:${name}`} value={index}>
              {name ? `${r} / ${name}` : '(no block open)'}
            </option>
          ))}
        </select>
        <label style={{ marginLeft: 8 }}>
          <input
            type="checkbox"
            data-testid="nmf-arena"
            checked={scene.menu.showArena ?? true}
            onChange={(e) => scene.menu.onToggleArena?.(e.target.checked)}
          />{' '}
          Arena
        </label>
        <pre data-testid="nmf-config">{JSON.stringify(config, null, 1)}</pre>
      </div>
      )}
    </div>
  );
}
