import { RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react';
import { Empty, InputNumber, Spin } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import ReportDetailsView, {
  MAX_SHARED_TRACES,
} from '@/features/sonata-viewer/components/report-details-view';
import { TRACE_COLORS } from '@/features/sonata-viewer/constants';
import { PillSelect } from '@/ui/molecules/select/pill-select';

import { ElectrodesTable } from './components/electrodes-table';
import { useRecording } from './hooks/use-recording';

import type { PickedTrace, PopulationMetadata } from '@/features/sonata-viewer/types';
import type { WorkspaceContext } from '@/types/common';
import type { RecordingInfo, RecordingSource } from './types';

const WINDOW_SECONDS = [0.1, 0.5, 1, 2, 5];
const DEFAULT_WINDOW_SECONDS = 1;
const NO_TRACES: number[] = [];

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

  useEffect(() => {
    let cancelled = false;
    setError(null);
    worker
      .loadWindow(info.name, start, length)
      .then((window) => {
        if (!cancelled) setPopulation(window);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
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

  const first = info.startTime;
  const lastStart = Math.max(first, first + duration - length);
  const move = (by: number) => setStart(Math.max(first, Math.min(lastStart, start + by)));

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 bg-white p-2" data-testid="recording-viewer">
      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        {chooser}
        <button
          type="button"
          aria-label="Earlier"
          className="rounded border border-neutral-200 p-0.5 disabled:opacity-40"
          disabled={start <= first}
          onClick={() => move(-length)}
        >
          <RiArrowLeftSLine size={16} />
        </button>
        <span>From</span>
        <InputNumber
          size="small"
          className="w-24!"
          min={first}
          max={lastStart}
          step={length}
          value={start}
          suffix="s"
          data-testid="recording-window-start"
          onChange={(value) => setStart(value ?? first)}
        />
        <button
          type="button"
          aria-label="Later"
          className="rounded border border-neutral-200 p-0.5 disabled:opacity-40"
          disabled={start >= lastStart}
          onClick={() => move(length)}
        >
          <RiArrowRightSLine size={16} />
        </button>
        <PillSelect
          label="Window"
          value={String(length)}
          options={WINDOW_SECONDS.map((seconds) => ({
            value: String(seconds),
            label: `${seconds} s`,
          }))}
          onChange={(value) => setLength(Number(value))}
        />
        <span className="ml-auto whitespace-nowrap text-neutral-400">
          {info.numChannels.toLocaleString()} channels · {duration.toFixed(1)} s ·{' '}
          {(info.samplingFrequency / 1000).toFixed(1)} kHz
          {picked.length === 0 && info.numChannels > MAX_SHARED_TRACES
            ? ` · first ${MAX_SHARED_TRACES} drawn`
            : ''}
        </span>
      </div>

      <div className="flex min-h-0 flex-[3] flex-col">
        {error && <Empty className="m-auto" description={error.message} />}
        {!error && !population && <Spin className="m-auto" />}
        {!error && population && (
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
      </div>

      <div className="flex min-h-0 flex-[2] flex-col">
        <ElectrodesTable
          table={info.electrodes}
          picked={picked}
          onTogglePick={togglePick}
          onHover={setHovered}
        />
      </div>
    </div>
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
