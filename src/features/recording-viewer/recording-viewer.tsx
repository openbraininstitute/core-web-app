import { RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react';
import { Empty, InputNumber, Spin, Switch } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { useSceneTablePane } from '@/features/circuit-viewer/scene-table-pane';
import ReportDetailsView, {
  MAX_SHARED_TRACES,
} from '@/features/sonata-viewer/components/report-details-view';
import { TRACE_COLORS } from '@/features/sonata-viewer/constants';
import { StackedPanes } from '@/features/spike-viewer/spike-statistics/stacked-panes';
import { PILL_CLASS, PillSelect, ROUND_PILL_CLASS } from '@/ui/molecules/select/pill-select';
import { cn } from '@/utils/css-class';

import { ElectrodesGrid } from './components/electrodes-grid';
import { ProbeMap } from './components/probe-map';
import { StackedTraces } from './components/stacked-traces';
import { useRecording } from './hooks/use-recording';
import { columnLayout, gridLayout } from './trace-layout';

import type { PickedTrace, PopulationMetadata } from '@/features/sonata-viewer/types';
import type { WorkspaceContext } from '@/types/common';
import type { RecordingInfo, RecordingSource } from './types';
import type { TraceEnvelopes } from './worker/envelopes';

const WINDOW_SECONDS = [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120];
/** Windows at least this long say how far their read has got, as they take a while. */
const PROGRESS_FROM_SECONDS = 5;
const PROGRESS_POLL_MS = 500;
const DEFAULT_WINDOW_SECONDS = 1;
const NO_TRACES: number[] = [];
const VIEW_OPTIONS = [
  { value: 'grid', label: 'Probe grid' },
  { value: 'column', label: 'Column' },
  { value: 'overlay', label: 'Overlay' },
];
const LANE_HEIGHTS = [
  { value: '6', label: 'Small' },
  { value: '12', label: 'Medium' },
  { value: '24', label: 'Large' },
];
const GAINS = [0.25, 0.5, 1, 2, 4, 8];
const DEFAULT_LANE_HEIGHT = 24;
const INITIAL_ENVELOPE_WIDTH = 256;

function RecordingTraces({
  info,
  worker,
  chooser,
}: {
  info: RecordingInfo;
  worker: NonNullable<ReturnType<typeof useRecording>['worker']>;
  chooser: React.ReactNode;
}) {
  const duration = info.numFrames / info.samplingFrequency;
  const [start, setStart] = useState(info.startTime);
  const [length, setLength] = useState(DEFAULT_WINDOW_SECONDS);
  const [population, setPopulation] = useState<PopulationMetadata | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loadingWindow, setLoadingWindow] = useState(true);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    setProgress(0);
    if (!loadingWindow || length < PROGRESS_FROM_SECONDS) return undefined;
    const timer = setInterval(() => {
      worker
        .getLoadProgress()
        .then(setProgress)
        .catch(() => {});
    }, PROGRESS_POLL_MS);
    return () => clearInterval(timer);
  }, [loadingWindow, length, worker]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoadingWindow(true);
    worker
      .loadWindow(info.name, start, length)
      .then((window) => {
        if (cancelled) return;
        // What failed was asked of a window now gone, as when moving quickly along the recording.
        setError(null);
        setPopulation(window);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoadingWindow(false);
      });
    return () => {
      cancelled = true;
    };
  }, [worker, info.name, start, length]);

  const [picked, setPicked] = useState<PickedTrace[]>([]);
  const togglePick = useCallback((channel: number) => {
    setPicked((current) => {
      if (current.some((pick) => pick.traceIndex === channel)) {
        return current.filter((pick) => pick.traceIndex !== channel);
      }
      const used = new Set(current.map((pick) => pick.slot));
      const free = TRACE_COLORS.findIndex((_, slot) => !used.has(slot));
      return [...current, { traceIndex: channel, slot: free }];
    });
  }, []);
  const pickAlone = useCallback((channel: number) => {
    setPicked((current) =>
      current.length === 1 && current[0].traceIndex === channel
        ? []
        : [{ traceIndex: channel, slot: 0 }]
    );
  }, []);
  const [hovered, setHovered] = useState<number | null>(null);
  const hoveredTraces = useMemo(() => (hovered === null ? NO_TRACES : [hovered]), [hovered]);
  const [focus, setFocus] = useState<number | null>(null);
  /** A channel picked in the table is brought into view in the traces. A hover alone scrolls nothing. */
  const pickInTable = useCallback(
    (channel: number) => {
      togglePick(channel);
      setFocus(channel);
    },
    [togglePick]
  );
  /** A channel picked beside the table is brought into view there, each time. */
  const [focusRow, setFocusRow] = useState<{ nodeId: number; key: number }>();
  const pickInTraces = useCallback(
    (channel: number) => {
      togglePick(channel);
      setFocusRow((last) => ({ nodeId: channel, key: (last?.key ?? 0) + 1 }));
    },
    [togglePick]
  );
  const pickOnMap = useCallback(
    (channel: number) => {
      pickInTable(channel);
      setFocusRow((last) => ({ nodeId: channel, key: (last?.key ?? 0) + 1 }));
    },
    [pickInTable]
  );

  const [view, setView] = useState('grid');
  const [showProbe, setShowProbe] = useState(true);
  const [laneHeight, setLaneHeight] = useState(DEFAULT_LANE_HEIGHT);
  const [gain, setGain] = useState(1);
  const layout = useMemo(
    () =>
      view === 'grid'
        ? gridLayout(info.numChannels, info.contacts)
        : columnLayout(info.numChannels, info.contacts),
    [view, info.numChannels, info.contacts]
  );

  const [envelopeWidth, setEnvelopeWidth] = useState(INITIAL_ENVELOPE_WIDTH);
  const [envelopes, setEnvelopes] = useState<TraceEnvelopes | null>(null);
  const [loadingEnvelopes, setLoadingEnvelopes] = useState(false);
  const windowName = population?.name;
  useEffect(() => {
    if (!windowName) return undefined;
    let cancelled = false;
    setLoadingEnvelopes(true);
    worker
      .getEnvelopes(windowName, envelopeWidth)
      .then((result) => {
        if (!cancelled) setEnvelopes(result);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoadingEnvelopes(false);
      });
    return () => {
      cancelled = true;
    };
  }, [worker, windowName, envelopeWidth]);
  const isStacked = view !== 'overlay';
  const busy = loadingWindow || (isStacked && (loadingEnvelopes || !envelopes));

  // A host with a pane for it, the configuration's right column, has the table there.
  const tablePane = useSceneTablePane();
  const claimTablePane = tablePane?.claim;
  useEffect(() => claimTablePane?.(), [claimTablePane]);
  const electrodes = (
    <ElectrodesGrid
      table={info.electrodes}
      name={info.name}
      picked={picked}
      hovered={hovered}
      focusRow={focusRow}
      onPick={pickInTable}
      onHover={setHovered}
      onReset={() => setPicked([])}
    />
  );

  const first = info.startTime;
  const lastStart = Math.max(first, first + duration - length);
  const move = (by: number) => setStart(Math.max(first, Math.min(lastStart, start + by)));

  const traces = (
    <div className="flex h-full min-h-0 flex-col gap-2 p-3" data-testid="recording-viewer">
      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        {chooser}
        <button
          type="button"
          aria-label="Earlier"
          className={cn(ROUND_PILL_CLASS, 'disabled:opacity-40')}
          disabled={start <= first}
          onClick={() => move(-length)}
        >
          <RiArrowLeftSLine size={18} />
        </button>
        <div className={cn(PILL_CLASS, 'hover:bg-white')}>
          <span className="font-normal text-neutral-500">From</span>
          <InputNumber
            size="small"
            variant="borderless"
            controls={false}
            className="w-16!"
            min={first}
            max={lastStart}
            step={length}
            value={start}
            suffix="s"
            data-testid="recording-window-start"
            onChange={(value) => setStart(value ?? first)}
          />
        </div>
        <button
          type="button"
          aria-label="Later"
          className={cn(ROUND_PILL_CLASS, 'disabled:opacity-40')}
          disabled={start >= lastStart}
          onClick={() => move(length)}
        >
          <RiArrowRightSLine size={18} />
        </button>
        <PillSelect
          label="Window"
          value={String(length)}
          options={WINDOW_SECONDS.filter((seconds) => seconds === length || seconds < duration).map(
            (seconds) => ({
              value: String(seconds),
              label: `${seconds} s`,
            })
          )}
          onChange={(value) => setLength(Number(value))}
        />
        <PillSelect label="Traces" value={view} options={VIEW_OPTIONS} onChange={setView} />
        {isStacked && (
          <>
            <PillSelect
              label="Height"
              value={String(laneHeight)}
              options={LANE_HEIGHTS}
              onChange={(value) => setLaneHeight(Number(value))}
            />
            <PillSelect
              label="Gain"
              value={String(gain)}
              options={GAINS.map((value) => ({ value: String(value), label: `× ${value}` }))}
              onChange={(value) => setGain(Number(value))}
            />
          </>
        )}
        {info.contacts && (
          <span className={cn(PILL_CLASS, 'gap-2 hover:bg-white')}>
            <Switch
              size="small"
              checked={showProbe}
              onChange={setShowProbe}
              data-testid="recording-show-electrodes"
            />
            Electrodes
          </span>
        )}
        <span className="ml-auto whitespace-nowrap text-neutral-400">
          {info.numChannels.toLocaleString()} channels · {duration.toFixed(1)} s ·{' '}
          {(info.samplingFrequency / 1000).toFixed(1)} kHz
          {view === 'overlay' && picked.length === 0 && info.numChannels > MAX_SHARED_TRACES
            ? ` · first ${MAX_SHARED_TRACES} drawn`
            : ''}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 gap-2">
        {info.contacts && showProbe && (
          <ProbeMap
            contacts={info.contacts}
            channelNames={info.channelNames}
            peakToPeak={envelopes?.peakToPeak ?? null}
            picked={picked}
            hovered={hovered}
            onHover={setHovered}
            onPick={pickOnMap}
          />
        )}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          {error && <Empty className="m-auto" description={error.message} />}
          {!error && population && busy && (
            // Over what's shown, which stays in place until the new window replaces it.
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/60"
              data-testid="recording-loading"
            >
              <Spin />
              {loadingWindow && length >= PROGRESS_FROM_SECONDS && (
                <span className="text-xs text-neutral-500" data-testid="recording-load-progress">
                  Reading {Math.round(progress * length)} of {length} s
                </span>
              )}
            </div>
          )}
          {!error && !population && <Spin className="m-auto" data-testid="recording-loading" />}
          {!error && population && view === 'overlay' && (
            <ReportDetailsView
              key={population.name}
              population={population}
              worker={worker}
              visibleTraces={null}
              picked={picked}
              hovered={hoveredTraces}
              lineNoun="channel"
              onCellClick={pickAlone}
            />
          )}
          {!error && population && isStacked && (
            <>
              <StackedTraces
                layout={layout}
                envelopes={envelopes}
                channelNames={info.channelNames}
                picked={picked}
                hovered={hovered}
                focus={focus}
                laneHeight={laneHeight}
                gain={gain}
                onHover={setHovered}
                onPick={pickInTraces}
                onColumnPixels={setEnvelopeWidth}
              />
              <div className="flex justify-between pt-1 pl-14 text-[11px] text-neutral-400">
                <span>{population.timeConfig.startTime.toFixed(3)} s</span>
                {envelopes && (
                  <span data-testid="recording-lane-scale">
                    Lane ±{Math.round((layout.noiseRange * envelopes.noise) / gain)}{' '}
                    {population.dataUnits}
                  </span>
                )}
                <span>{population.timeConfig.endTime.toFixed(3)} s</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (tablePane) {
    return (
      <>
        {traces}
        {tablePane.target && createPortal(electrodes, tablePane.target)}
      </>
    );
  }
  return (
    <StackedPanes
      split="file"
      bottomShare={0.4}
      top={{ title: 'Traces', keepsSize: true, boxClassName: 'overflow-hidden', content: traces }}
      bottom={{ title: 'Electrodes', boxClassName: 'px-3 pt-1 pb-2', content: electrodes }}
    />
  );
}

/** A recording's traces, a window at a time, over the table of its electrodes. */
export default function RecordingViewer({
  source,
  context,
}: {
  source: RecordingSource;
  context: WorkspaceContext;
}) {
  const { recordings, worker, error } = useRecording(source, context);
  const [chosen, setChosen] = useState<string>();

  if (error) return <Empty className="p-8" description={error.message} />;
  if (!recordings || !worker) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spin />
      </div>
    );
  }
  const info = recordings.find((recording) => recording.name === chosen) ?? recordings[0];
  return (
    <RecordingTraces
      key={info.name}
      info={info}
      worker={worker}
      chooser={
        recordings.length > 1 ? (
          <PillSelect
            label="Recording"
            value={info.name}
            options={recordings.map(({ name }) => ({ value: name, label: name }))}
            onChange={setChosen}
          />
        ) : null
      }
    />
  );
}
