'use client';

import { Spin } from 'antd';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';

import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { DIVERGING_COLOURS } from '@/features/lfp-viewer/colour-scale';
import {
  arrayAxis,
  coherenceWith,
  contactLines,
  currentSourceDensity,
  matrixOverRows,
  profileAlong,
  rowCorrelation,
  spectrogram,
  triggeredAverage,
} from '@/features/lfp-viewer/field-analysis';
import {
  coherenceFigure,
  correlationFigure,
  csdFigure,
  profileFigure,
  spectrogramFigure,
  triggeredFigure,
} from '@/features/lfp-viewer/field-figures';
import { coordinatesAlong } from '@/features/lfp-viewer/field-structure';
import { psdFigure } from '@/features/lfp-viewer/psd-figure';
import { binAt, fieldValue } from '@/features/lfp-viewer/summary';
import { useContactRows, useStoredCorrelation } from '@/features/lfp-viewer/use-lfp-summary';
import { CollapsingControls } from '@/features/spike-viewer/components/collapsing-controls';
import { PlotHelp } from '@/features/spike-viewer/components/raster-plot-controls';
import useSpikeTrace from '@/features/spike-viewer/hooks/use-spike-trace';
import { PillSelect } from '@/ui/molecules/select/pill-select';

import type { ReactNode } from 'react';
import type { LfpSummarySource } from '@/api/small-scale-simulator/simulation-result/lfp-summary';
import type { ColourScale } from '@/features/lfp-viewer/colour-scale';
import type { FieldDirection, FieldRow } from '@/features/lfp-viewer/field-structure';
import type { LfpField } from '@/features/lfp-viewer/summary';
import type { LfpSummary } from '@/features/lfp-viewer/use-lfp-summary';
import type { TAssetBackedFile } from '@/features/scan-config/types';
import type { TimeCursor } from '@/features/sonata-viewer/time-cursor';
import type { TimelineEvent } from '@/features/spike-viewer/config-timeline';
import type { Figure } from '@/features/spike-viewer/spike-statistics/figures';

const StatisticsPlot = dynamic(
  () => import('@/features/spike-viewer/spike-statistics/statistics-plot'),
  { ssr: false, loading: () => <Spin className="m-auto" /> }
);

/** Contacts drawn at once beside the mean, or with the first. */
const MAX_COMPARED = 8;
/** Contacts compared with the selected one until some are ticked. */
const DEFAULT_COMPARED = 4;
const HALF_WINDOWS_MS = [5, 10, 20, 50, 100];
const DEFAULT_HALF_WINDOW_MS = 20;
/** How often a plot of the player's time is drawn again. */
const CURSOR_REDRAW_MS = 100;

type PlotKind =
  | 'psd'
  | 'spectrogram'
  | 'triggered'
  | 'correlation'
  | 'coherence'
  | 'profile'
  | 'csd';
type ProfileMeasure = 'ptp' | 'rms' | 'min' | 'max' | 'at-time';

type StatisticsProps = {
  source: LfpSummarySource;
  summary: LfpSummary;
  /** As the field pane draws it: with its shared signal off, if that is chosen. */
  field: LfpField;
  removeShared: boolean;
  scale: ColourScale;
  rows: readonly FieldRow[];
  positions: Float32Array | null;
  direction: FieldDirection | null;
  selectedContact: number | null;
  ticked: readonly number[];
  spikeFiles: readonly TAssetBackedFile[];
  timeline: readonly TimelineEvent[];
  timeCursor: TimeCursor;
  window: [number, number];
  /** Whether the pane is on show and settled, so that a plot can be drawn. */
  visible: boolean;
};

type FrameProps = {
  picker: ReactNode;
  controls?: ReactNode;
  note?: string;
  help: string;
  visible: boolean;
  figure: Figure | null;
  /** Said in the plot's place where there is no figure; a spinner if not given. */
  empty?: string;
  timeline?: { events: readonly TimelineEvent[]; timeCursor: TimeCursor };
};

function PlotFrame({ picker, controls, note, help, visible, figure, empty, timeline }: FrameProps) {
  return (
    <div className="flex h-full min-h-0 flex-col p-2">
      <div className="shrink-0 px-1 pb-1">
        <CollapsingControls
          inline
          trailing={
            <>
              {note && <span className="whitespace-nowrap text-xs text-neutral-400">{note}</span>}
              <PlotHelp>{help}</PlotHelp>
            </>
          }
        >
          {picker}
          {controls}
        </CollapsingControls>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        {figure && visible && <StatisticsPlot figure={figure} timeline={timeline} />}
        {!figure && empty && (
          <p className="max-w-sm p-4 text-center text-sm text-neutral-500">{empty}</p>
        )}
        {!figure && !empty && <Spin />}
      </div>
    </div>
  );
}

/** The contacts to compare: those ticked, else a few spread along the rows, leaving out `except`. */
function comparedContacts(
  rows: readonly FieldRow[],
  ticked: readonly number[],
  except: number | null,
  count: number
): number[] {
  const chosen = ticked.filter((c) => c !== except);
  if (chosen.length > 0) return chosen.slice(0, count);
  const leads = rows.map((row) => row.lead).filter((c) => c !== except);
  const stride = Math.max(1, leads.length / count);
  return Array.from(
    { length: Math.min(count, leads.length) },
    (_, i) => leads[Math.floor(i * stride)]
  );
}

function usePlayerTime(timeCursor: TimeCursor, active: boolean): number | null {
  const [time, setTime] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    let last = 0;
    let pending: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = timeCursor.subscribe((t) => {
      clearTimeout(pending);
      const wait = last + CURSOR_REDRAW_MS - performance.now();
      if (wait <= 0) {
        last = performance.now();
        setTime(t);
      } else {
        // The last time of a drag has to land, however soon after the one before.
        pending = setTimeout(() => {
          last = performance.now();
          setTime(t);
        }, wait);
      }
    });
    return () => {
      clearTimeout(pending);
      unsubscribe();
    };
  }, [timeCursor, active]);
  return time;
}

/**
 * What the field shows beyond the traces, one plot at a time: each reads what
 * it needs from the summary only once picked.
 */
export function LfpStatistics(props: StatisticsProps) {
  const { summary, positions, spikeFiles } = props;
  const [plot, setPlot] = useState<PlotKind>('psd');
  const lines = useMemo(() => (positions ? contactLines(positions) : []), [positions]);
  const noPositions = 'Needs the contacts’ positions';
  const picker = (
    <PillSelect
      label="Plot"
      value={plot}
      options={[
        { value: 'psd', label: 'Power spectrum' },
        { value: 'spectrogram', label: 'Spectrogram' },
        {
          value: 'triggered',
          label: 'Spike-triggered average',
          disabled: spikeFiles.length === 0,
          detail: spikeFiles.length === 0 ? 'This simulation has no spikes' : undefined,
        },
        { value: 'correlation', label: 'Correlation' },
        {
          value: 'coherence',
          label: 'Coherence',
          disabled: summary.index.contacts < 2,
          detail: summary.index.contacts < 2 ? 'Needs two contacts' : undefined,
        },
        {
          value: 'profile',
          label: 'Depth profile',
          disabled: !positions,
          detail: positions ? undefined : noPositions,
        },
        {
          value: 'csd',
          label: 'Current source density',
          disabled: lines.length === 0,
          detail:
            lines.length > 0
              ? undefined
              : positions
                ? 'Needs contacts evenly spaced on a line'
                : noPositions,
        },
      ]}
      onChange={(v) => setPlot(v as PlotKind)}
    />
  );
  const shared = { ...props, picker };
  if (plot === 'spectrogram') return <SpectrogramPlot {...shared} />;
  if (plot === 'triggered') return <TriggeredPlot {...shared} />;
  if (plot === 'correlation') return <CorrelationPlot {...shared} />;
  if (plot === 'coherence') return <CoherencePlot {...shared} />;
  if (plot === 'profile') return <ProfilePlot {...shared} />;
  if (plot === 'csd') return <CsdPlot {...shared} lines={lines} />;
  return <SpectrumPlot {...shared} />;
}

type PlotProps = StatisticsProps & { picker: ReactNode };

const FAILED = 'The summary could not be read';
const PICK_A_CONTACT = 'Pick a contact in the table';

function SpectrumPlot({ picker, summary, selectedContact, ticked, visible }: PlotProps) {
  const { index, psd } = summary;
  const contacts = useMemo(
    () =>
      ticked.length > 0
        ? ticked.slice(0, MAX_COMPARED)
        : selectedContact !== null
          ? [selectedContact]
          : [],
    [ticked, selectedContact]
  );
  const figure = useMemo(
    () => psdFigure({ frequencies: index.psd_frequencies, psd, contacts, dtMs: index.time.dt }),
    [index, psd, contacts]
  );
  return (
    <PlotFrame
      picker={picker}
      note={`Welch, whole run${contacts.length > 0 ? ` · ${contacts.map((c) => `e${c}`).join(', ')}` : ''}`}
      help="Power at each frequency over the whole run: the mean of all contacts, and the selected contact or those ticked, as recorded"
      visible={visible}
      figure={figure}
    />
  );
}

function SpectrogramPlot({
  picker,
  source,
  summary,
  selectedContact,
  timeline,
  timeCursor,
  window,
  visible,
}: PlotProps) {
  const contacts = useMemo(
    () => (selectedContact === null ? [] : [selectedContact]),
    [selectedContact]
  );
  const { field, failed } = useContactRows(source, summary, contacts);
  const result = useMemo(
    () => (field ? spectrogram(field.data, field.scale, field.binMs, field.start) : null),
    [field]
  );
  const figure = useMemo(
    () => (result ? spectrogramFigure({ result, window }) : null),
    [result, window]
  );
  const empty =
    selectedContact === null
      ? PICK_A_CONTACT
      : failed
        ? FAILED
        : field && !result
          ? 'This run is too short for a spectrogram'
          : undefined;
  return (
    <PlotFrame
      picker={picker}
      note={selectedContact === null ? undefined : `e${selectedContact} · as recorded`}
      help="Power at each frequency over time at the selected contact, in dB of µV²/Hz. It follows the field's zoom, and shows the 50 dB below its strongest"
      visible={visible}
      figure={figure}
      empty={empty}
      timeline={{ events: timeline, timeCursor }}
    />
  );
}

function TriggeredPlot(props: PlotProps) {
  const { picker, spikeFiles, visible } = props;
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [halfWindow, setHalfWindow] = useState(DEFAULT_HALF_WINDOW_MS);
  const file = spikeFiles.find((f) => f.asset.id === chosenId) ?? spikeFiles[0];
  const controls = (
    <>
      <PillSelect
        label="Trigger"
        value={file?.asset.id ?? ''}
        options={spikeFiles.map((f) => ({
          value: f.asset.id,
          label:
            f.asset.label === AssetLabel.replay_spikes
              ? (f.asset.path.split('/').at(-1) ?? f.asset.path).replace(/\.h5$/i, '')
              : 'Circuit spikes',
          detail: f.asset.label === AssetLabel.replay_spikes ? 'Input' : undefined,
        }))}
        onChange={setChosenId}
      />
      <PillSelect
        label="Window"
        value={String(halfWindow)}
        options={HALF_WINDOWS_MS.map((ms) => ({ value: String(ms), label: `±${ms} ms` }))}
        onChange={(v) => setHalfWindow(Number(v))}
      />
    </>
  );
  if (!file) {
    return (
      <PlotFrame
        picker={picker}
        controls={controls}
        help=""
        visible={visible}
        figure={null}
        empty="This simulation has no spikes"
      />
    );
  }
  return (
    <TriggeredFigure
      key={file.asset.id}
      {...props}
      file={file}
      controls={controls}
      halfWindow={halfWindow}
    />
  );
}

/** Apart from the controls, as its spikes are downloaded while it is mounted. */
function TriggeredFigure({
  picker,
  source,
  summary,
  selectedContact,
  ticked,
  visible,
  file,
  controls,
  halfWindow,
}: PlotProps & { file: TAssetBackedFile; controls: ReactNode; halfWindow: number }) {
  const [spikes, spikesError] = useSpikeTrace({
    entityId: file.entity.id,
    entityType: file.entity.type,
    asset: file.asset,
    ctx: source.ctx,
  });
  const contacts = useMemo(() => {
    if (selectedContact === null) return ticked.slice(0, MAX_COMPARED);
    return [selectedContact, ...ticked.filter((c) => c !== selectedContact)].slice(0, MAX_COMPARED);
  }, [selectedContact, ticked]);
  const { field, failed } = useContactRows(source, summary, contacts);
  const triggers = useMemo(() => {
    if (!spikes) return null;
    const populations = spikes.populations.map((p) => p.timestamps);
    if (populations.length === 1) return populations[0];
    const merged = new Float32Array(populations.reduce((sum, t) => sum + t.length, 0));
    let at = 0;
    for (const times of populations) {
      merged.set(times, at);
      at += times.length;
    }
    return merged;
  }, [spikes]);
  const result = useMemo(
    () => (field && triggers ? triggeredAverage(field, triggers, halfWindow) : null),
    [field, triggers, halfWindow]
  );
  const figure = useMemo(
    () => (result && result.triggers > 0 ? triggeredFigure({ result, contacts }) : null),
    [result, contacts]
  );
  const empty =
    contacts.length === 0
      ? PICK_A_CONTACT
      : spikesError
        ? 'These spikes could not be read'
        : failed
          ? FAILED
          : result && result.triggers === 0
            ? 'No spikes fall with their whole window inside the recording'
            : undefined;
  return (
    <PlotFrame
      picker={picker}
      controls={controls}
      note={
        result
          ? `${result.triggers.toLocaleString()} of ${(triggers?.length ?? 0).toLocaleString()} spikes${
              result.events === 1 ? ' · one moment, so a single trial and not an average' : ''
            }`
          : undefined
      }
      help="The field around each spike, averaged, as recorded: the selected contact with its standard error, and those ticked. Spikes driven by a shared stimulus share its response, so read this beside the stimulus marks"
      visible={visible}
      figure={figure}
      empty={empty}
    />
  );
}

function CorrelationPlot({
  picker,
  source,
  summary,
  field,
  removeShared,
  rows,
  visible,
}: PlotProps) {
  const { index } = summary;
  const useStored = !removeShared && !!index.correlation;
  const stored = useStoredCorrelation(source, summary, useStored);
  const matrix = useMemo(() => {
    if (useStored) {
      return stored.data
        ? matrixOverRows(stored.data.values, index.contacts, rows, stored.data.scale)
        : null;
    }
    return rowCorrelation(field, rows);
  }, [useStored, stored.data, index.contacts, rows, field]);
  const figure = useMemo(
    () => (matrix ? correlationFigure({ matrix, rows, colours: DIVERGING_COLOURS }) : null),
    [matrix, rows]
  );
  const note = useMemo(() => {
    if (!matrix) return undefined;
    const n = rows.length;
    let low = Infinity;
    let high = -Infinity;
    for (let a = 0; a < n; a++) {
      for (let b = 0; b < n; b++) {
        if (a === b) continue;
        low = Math.min(low, matrix[a * n + b]);
        high = Math.max(high, matrix[a * n + b]);
      }
    }
    const kept = useStored
      ? 'as recorded'
      : removeShared
        ? 'shared signal removed'
        : 'from the overview';
    return n > 1 ? `r from ${low.toFixed(2)} to ${high.toFixed(2)} · ${kept}` : kept;
  }, [matrix, rows, useStored, removeShared]);
  return (
    <PlotFrame
      picker={picker}
      note={note}
      help="How alike contacts are over the whole run, in the field's rows and order. It follows Shared signal: where most of the field is shared every pair reads near 1, so remove it to see what differs"
      visible={visible}
      figure={figure}
      empty={stored.isError ? FAILED : undefined}
    />
  );
}

function CoherencePlot({
  picker,
  source,
  summary,
  rows,
  selectedContact,
  ticked,
  visible,
}: PlotProps) {
  const others = useMemo(
    () =>
      comparedContacts(
        rows,
        ticked,
        selectedContact,
        ticked.length > 0 ? MAX_COMPARED - 1 : DEFAULT_COMPARED
      ),
    [rows, ticked, selectedContact]
  );
  const contacts = useMemo(
    () => (selectedContact === null ? [] : [selectedContact, ...others]),
    [selectedContact, others]
  );
  const { field, failed } = useContactRows(source, summary, contacts);
  const result = useMemo(() => {
    if (!field || field.contacts < 2) return null;
    const row = (r: number) => field.data.subarray(r * field.bins, (r + 1) * field.bins);
    return coherenceWith(
      row(0),
      others.map((_, i) => row(i + 1)),
      field.binMs
    );
  }, [field, others]);
  const figure = useMemo(
    () =>
      result && selectedContact !== null
        ? coherenceFigure({ result, contacts: others, reference: selectedContact })
        : null,
    [result, others, selectedContact]
  );
  const empty =
    selectedContact === null
      ? PICK_A_CONTACT
      : failed
        ? FAILED
        : field && field.contacts >= 2 && !result
          ? 'This run is too short for coherence'
          : others.length === 0
            ? 'Needs another contact'
            : undefined;
  return (
    <PlotFrame
      picker={picker}
      note={result ? `${result.segments} segments · as recorded` : undefined}
      help="How well contacts follow the selected one at each frequency, whatever their delay: 1 is in step, near 0 unrelated. Compares those ticked, else a few along the rows"
      visible={visible}
      figure={figure}
      empty={empty}
    />
  );
}

function ProfilePlot({
  picker,
  summary,
  field,
  removeShared,
  scale,
  positions,
  direction,
  selectedContact,
  timeCursor,
  visible,
}: PlotProps) {
  const { index, stats } = summary;
  const [measure, setMeasure] = useState<ProfileMeasure>('ptp');
  const axis = useMemo(
    () => direction?.axis ?? (positions ? arrayAxis(positions) : null),
    [direction, positions]
  );
  const coordinate = useMemo(
    () => (positions && axis ? coordinatesAlong(positions, axis) : null),
    [positions, axis]
  );
  const time = usePlayerTime(timeCursor, measure === 'at-time');
  const column = index.stats.indexOf(measure);
  const value = useMemo(() => {
    if (measure === 'at-time') {
      const bin = time === null ? 0 : binAt(field, time);
      return (contact: number) => fieldValue(field, contact, bin);
    }
    return (contact: number) => stats[contact * index.stats.length + column];
  }, [measure, time, field, stats, index.stats.length, column]);
  const atTime = measure === 'at-time';
  const figure = useMemo(() => {
    if (!coordinate || !axis) return null;
    const labels = { ptp: 'Peak-to-peak (µV)', rms: 'RMS (µV)', min: 'Min (µV)', max: 'Max (µV)' };
    return profileFigure({
      points: profileAlong(coordinate, value),
      measure: atTime
        ? `Field at ${time === null ? 'the start' : `${time.toFixed(1)} ms`} (µV)`
        : labels[measure as keyof typeof labels],
      axisLabel: `Along (${axis.map((d) => d.toFixed(2)).join(', ')}), µm`,
      selected:
        selectedContact === null
          ? null
          : { at: coordinate[selectedContact], value: value(selectedContact) },
      range: atTime ? [-scale.limit, scale.limit] : undefined,
    });
  }, [coordinate, axis, value, measure, atTime, time, selectedContact, scale.limit]);
  return (
    <PlotFrame
      picker={picker}
      controls={
        <PillSelect
          label="Measure"
          value={measure}
          options={[
            { value: 'ptp', label: 'Peak-to-peak' },
            { value: 'rms', label: 'RMS' },
            { value: 'min', label: 'Min' },
            { value: 'max', label: 'Max' },
            { value: 'at-time', label: 'At the player’s time' },
          ]}
          onChange={(v) => setMeasure(v as ProfileMeasure)}
        />
      }
      note={atTime && removeShared ? 'shared signal removed' : atTime ? undefined : 'as recorded'}
      help="A value against position along the field's direction, or the array's longest axis where no line follows the field. Many contacts are averaged into stretches of the axis"
      visible={visible}
      figure={figure}
      empty={axis ? undefined : 'The contacts all lie in one place'}
    />
  );
}

function CsdPlot({
  picker,
  source,
  summary,
  positions,
  selectedContact,
  lines,
  timeline,
  timeCursor,
  window,
  visible,
}: PlotProps & { lines: ReturnType<typeof contactLines> }) {
  const line =
    lines.find((l) => selectedContact !== null && l.contacts.includes(selectedContact)) ?? lines[0];
  const contacts = line?.contacts;
  const { field, failed } = useContactRows(source, summary, contacts ?? NO_CONTACTS);
  const result = useMemo(
    () => (field && line ? currentSourceDensity(field, line.spacing) : null),
    [field, line]
  );
  const coordinates = useMemo(() => {
    const axis = positions ? arrayAxis(positions) : null;
    if (!positions || !axis || !contacts) return [];
    const along = coordinatesAlong(positions, axis);
    return contacts.slice(1, -1).map((c) => along[c]);
  }, [positions, contacts]);
  const figure = useMemo(
    () => (result ? csdFigure({ result, coordinates, window, colours: DIVERGING_COLOURS }) : null),
    [result, coordinates, window]
  );
  return (
    <PlotFrame
      picker={picker}
      note={
        line
          ? `${line.contacts.length} contacts, ${Number(line.spacing.toFixed(1))} µm apart${lines.length > 1 ? ` · line ${lines.indexOf(line) + 1} of ${lines.length}` : ''}`
          : undefined
      }
      help="−σ ∂²φ/∂z² along the line holding the selected contact, as recorded: sinks in blue, sources in orange. It has no value at the line's two ends, and follows the field's zoom"
      visible={visible}
      figure={figure}
      empty={failed ? FAILED : line ? undefined : 'Needs contacts evenly spaced on a line'}
      timeline={{ events: timeline, timeCursor }}
    />
  );
}

const NO_CONTACTS: readonly number[] = [];
