'use client';

import { Spin } from 'antd';
import { throttle } from 'es-toolkit';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';

import { AssetLabel } from '@/api/entitycore/types/shared/global';
import {
  arrayAxis,
  coherenceWith,
  contactLines,
  currentSourceDensity,
  matrixOverRows,
  profileAlong,
  rowCorrelation,
  rowSpectra,
  spectrogram,
  triggeredAverage,
} from '@/features/lfp-viewer/field-analysis';
import {
  alongLabel,
  coherenceFigure,
  correlationFigure,
  csdFigure,
  profileFigure,
  spectrogramFigure,
  triggeredFigure,
  withTimeWindow,
} from '@/features/lfp-viewer/field-figures';
import { coordinatesAlong } from '@/features/lfp-viewer/field-structure';
import { psdFigure } from '@/features/lfp-viewer/psd-figure';
import { binAt, fieldValue } from '@/features/lfp-viewer/summary';
import {
  hasStoredCorrelation,
  statsFromOverview,
  useContactRows,
  useStoredCorrelation,
} from '@/features/lfp-viewer/use-lfp-summary';
import { reportStem } from '@/features/scan-config/use-cases/simulations/report-picker';
import { CollapsingControls } from '@/features/spike-viewer/components/collapsing-controls';
import { PlotHelp } from '@/features/spike-viewer/components/raster-plot-controls';
import useSpikeTrace from '@/features/spike-viewer/hooks/use-spike-trace';
import { PillSelect } from '@/ui/molecules/select/pill-select';

import type { ReactNode } from 'react';
import type { LfpSummarySource } from '@/api/small-scale-simulator/simulation-result/lfp-summary';
import type { LineColour } from '@/features/lfp-viewer/contact-colours';
import type { ContactGrid } from '@/features/lfp-viewer/contact-grid';
import type { ContactLine } from '@/features/lfp-viewer/field-analysis';
import type { FieldDirection, FieldRow } from '@/features/lfp-viewer/field-structure';
import type { LfpField } from '@/features/lfp-viewer/summary';
import type { ChosenField, LfpSummary, RowsProblem } from '@/features/lfp-viewer/use-lfp-summary';
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
const CURSOR_REDRAW_MS = 100;
/** What reading a line's rows at full resolution may hold in the query cache; it is held twice. */
const MAX_LINE_READ_BYTES = 512 * 2 ** 20;

type PlotKind =
  | 'psd'
  | 'spectrogram'
  | 'triggered'
  | 'correlation'
  | 'coherence'
  | 'profile'
  | 'csd';
const STORED_MEASURES = { ptp: 'Peak-to-peak', rms: 'RMS', min: 'Min', max: 'Max' };
type ProfileMeasure = keyof typeof STORED_MEASURES | 'share' | 'at-time';

type StatisticsProps = {
  source: LfpSummarySource;
  summary: LfpSummary;
  chosen: ChosenField;
  /** As the field pane draws it: with its shared signal off, if that is chosen. */
  field: LfpField;
  removeShared: boolean;
  rows: readonly FieldRow[];
  positions: Float32Array | null;
  grid: ContactGrid | null;
  direction: FieldDirection | null;
  selectedContact: number | null;
  ticked: readonly number[];
  /** A contact's line's colour: a ticked one's own, as its trace has it. */
  lineColour: LineColour;
  spikeFiles: readonly TAssetBackedFile[];
  timeline: readonly TimelineEvent[];
  timeCursor: TimeCursor;
  window: [number, number];
  /** Whether the pane is on show and settled, so that a plot can be drawn. */
  visible: boolean;
  /** Whether the pane is on show, settled or not: shut, a plot reads no contact's row. */
  open: boolean;
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
  /** The time axis's range, for a figure of time that follows the field's zoom. */
  timeWindow?: [number, number];
};

function PlotFrame({
  picker,
  controls,
  note,
  help,
  visible,
  figure,
  empty,
  timeline,
  timeWindow,
}: FrameProps) {
  const shown = useMemo(
    () => (figure && timeWindow ? withTimeWindow(figure, timeWindow) : figure),
    [figure, timeWindow]
  );
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
        {shown && visible && <StatisticsPlot figure={shown} timeline={timeline} />}
        {!figure && empty && (
          <p className="max-w-sm p-4 text-center text-sm text-neutral-500">{empty}</p>
        )}
        {!figure && !empty && <Spin />}
      </div>
    </div>
  );
}

function comparedContacts(
  rows: readonly FieldRow[],
  ticked: readonly number[],
  except: number | null
): number[] {
  const chosen = ticked.filter((c) => c !== except);
  if (chosen.length > 0) return chosen.slice(0, MAX_COMPARED - 1);
  const leads = rows.map((row) => row.lead).filter((c) => c !== except);
  const stride = Math.max(1, leads.length / DEFAULT_COMPARED);
  return Array.from(
    { length: Math.min(DEFAULT_COMPARED, leads.length) },
    (_, i) => leads[Math.floor(i * stride)]
  );
}

function usePlayerTime(timeCursor: TimeCursor, active: boolean): number | null {
  const [time, setTime] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    const update = throttle(setTime, CURSOR_REDRAW_MS);
    const unsubscribe = timeCursor.subscribe(update);
    return () => {
      update.cancel();
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
  const { summary, positions, grid, direction, spikeFiles } = props;
  const [plot, setPlot] = useState<PlotKind>('psd');
  const lines = useMemo(
    () => (positions ? contactLines(positions, grid, direction?.axis) : []),
    [positions, grid, direction]
  );
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
          ...whyNot(spikeFiles.length === 0 && NO_SPIKES),
        },
        { value: 'correlation', label: 'Correlation' },
        {
          value: 'coherence',
          label: 'Coherence',
          ...whyNot(summary.index.contacts < 2 && 'Needs two contacts'),
        },
        {
          value: 'profile',
          label: 'Depth profile',
          ...whyNot(!positions && NO_POSITIONS),
        },
        {
          value: 'csd',
          label: 'Current source density',
          ...whyNot(lines.length === 0 && (positions ? NO_LINE : NO_POSITIONS)),
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
const ROWS_PROBLEMS: Record<RowsProblem, string> = {
  failed: FAILED,
  'too-many': 'That is too many rows to read at once: tick fewer contacts or groups',
};
const PICK_A_CONTACT = 'Pick a contact in the table';
const NO_POSITIONS = 'Needs the contacts’ positions';
const NO_LINE = 'Needs contacts evenly spaced on a line';
const NO_SPIKES = 'This simulation has no spikes';
const TRIGGERED_HELP =
  'The field around each spike, averaged, as recorded: the selected contact with its standard error, counting spikes at one moment as one, and those ticked. Spikes whose window leaves the recording are left out, and at most 10,000 are used, evenly. Spikes driven by a shared stimulus share its response, so read this beside the stimulus marks';

const whyNot = (reason: string | false) => ({
  disabled: reason !== false,
  detail: reason === false ? undefined : reason,
});

function SpectrumPlot({
  picker,
  source,
  summary,
  chosen,
  selectedContact,
  ticked,
  lineColour,
  visible,
  open,
}: PlotProps) {
  const { index } = summary;
  const { spectra } = chosen;
  const contacts = useMemo(
    () =>
      ticked.length > 0
        ? ticked.slice(0, MAX_COMPARED)
        : selectedContact !== null
          ? [selectedContact]
          : [],
    [ticked, selectedContact]
  );
  // Groups added up have no stored spectrum, so their contacts' are worked out from their rows.
  const { field, problem } = useContactRows(source, summary, chosen, spectra ? [] : contacts, open);
  const figure = useMemo(() => {
    const dtMs = index.time.dt;
    if (spectra) return psdFigure({ ...spectra, contacts, dtMs, colourOf: lineColour });
    return field
      ? psdFigure({
          ...rowSpectra(field),
          contacts,
          dtMs,
          onlyTheseRows: true,
          colourOf: lineColour,
        })
      : null;
  }, [index, spectra, field, contacts, lineColour]);
  return (
    <PlotFrame
      picker={picker}
      note={`Welch, whole run${contacts.length > 0 ? ` · ${contacts.map((c) => `e${c}`).join(', ')}` : ''}`}
      help="Power at each frequency over the whole run: the mean of all contacts, and the selected contact or those ticked, as recorded. Groups added up show only the selected or ticked, as spectra don't add"
      visible={visible}
      figure={figure}
      empty={
        !spectra && contacts.length === 0
          ? PICK_A_CONTACT
          : problem
            ? ROWS_PROBLEMS[problem]
            : undefined
      }
    />
  );
}

function SpectrogramPlot({
  picker,
  source,
  summary,
  chosen,
  selectedContact,
  timeline,
  timeCursor,
  window,
  visible,
  open,
}: PlotProps) {
  const contacts = useMemo(
    () => (selectedContact === null ? [] : [selectedContact]),
    [selectedContact]
  );
  const { field, problem } = useContactRows(source, summary, chosen, contacts, open);
  const result = useMemo(
    () => (field ? spectrogram(field.data, field.scale, field.binMs, field.start) : null),
    [field]
  );
  const figure = useMemo(() => (result ? spectrogramFigure({ result }) : null), [result]);
  const empty =
    selectedContact === null
      ? PICK_A_CONTACT
      : problem
        ? ROWS_PROBLEMS[problem]
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
      timeWindow={window}
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
          label: f.asset.label === AssetLabel.replay_spikes ? reportStem(f) : 'Circuit spikes',
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
        help={TRIGGERED_HELP}
        visible={visible}
        figure={null}
        empty={NO_SPIKES}
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
  chosen,
  selectedContact,
  ticked,
  lineColour,
  visible,
  open,
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
  const { field, problem } = useContactRows(source, summary, chosen, contacts, open);
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
    () =>
      result && result.triggers > 0
        ? triggeredFigure({ result, contacts, colourOf: lineColour })
        : null,
    [result, contacts, lineColour]
  );
  const empty =
    contacts.length === 0
      ? PICK_A_CONTACT
      : spikesError
        ? 'These spikes could not be read'
        : problem
          ? ROWS_PROBLEMS[problem]
          : result && result.triggers === 0
            ? 'No spikes fall with their whole window inside the recording'
            : undefined;
  return (
    <PlotFrame
      picker={picker}
      controls={controls}
      note={
        result
          ? `${result.triggers.toLocaleString()} of ${(triggers?.length ?? 0).toLocaleString()} spikes used${
              result.events === 1 ? ' · one moment, so a single trial and not an average' : ''
            }`
          : undefined
      }
      help={TRIGGERED_HELP}
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
  chosen,
  field,
  removeShared,
  rows,
  visible,
}: PlotProps) {
  const { index } = summary;
  const useStored = !removeShared && hasStoredCorrelation(index, chosen.choice);
  const stored = useStoredCorrelation(source, summary, chosen.choice, useStored);
  const matrix = useMemo(() => {
    if (useStored) {
      return stored.data
        ? matrixOverRows(stored.data.values, index.contacts, rows, stored.data.scale)
        : null;
    }
    return rowCorrelation(field, rows);
  }, [useStored, stored.data, index.contacts, rows, field]);
  const figure = useMemo(
    () => (matrix ? correlationFigure({ matrix, rows }) : null),
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
    const source = useStored
      ? 'as recorded'
      : removeShared
        ? 'shared signal removed'
        : 'from the overview';
    const grouped = rows.some((row) => row.contacts.length > 1);
    const measure = useStored ? 'contact pairs averaged' : 'rows’ mean signals';
    const kept = grouped ? `${measure} · ${source}` : source;
    return n > 1 ? `r from ${low.toFixed(2)} to ${high.toFixed(2)} · ${kept}` : kept;
  }, [matrix, rows, useStored, removeShared]);
  return (
    <PlotFrame
      picker={picker}
      note={note}
      help="How alike contacts are over the whole run, in the field's rows and order. It follows Shared signal: where most of the field is shared every pair reads near 1, so remove it to see what differs. Where a row holds several contacts, the recorded matrix averages their pairs and otherwise the rows’ mean signals are compared, which reads higher as noise cancels"
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
  chosen,
  rows,
  selectedContact,
  ticked,
  lineColour,
  visible,
  open,
}: PlotProps) {
  const others = useMemo(
    () => comparedContacts(rows, ticked, selectedContact),
    [rows, ticked, selectedContact]
  );
  const contacts = useMemo(
    () => (selectedContact === null ? [] : [selectedContact, ...others]),
    [selectedContact, others]
  );
  const { field, problem } = useContactRows(source, summary, chosen, contacts, open);
  const result = useMemo(() => {
    if (!field || others.length === 0) return null;
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
        ? coherenceFigure({
            result,
            contacts: others,
            reference: selectedContact,
            colourOf: lineColour,
          })
        : null,
    [result, others, selectedContact, lineColour]
  );
  const empty =
    selectedContact === null
      ? PICK_A_CONTACT
      : others.length === 0
        ? 'Needs another contact'
        : problem
          ? ROWS_PROBLEMS[problem]
          : field && !result
            ? 'This run is too short for coherence'
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
  chosen,
  field,
  removeShared,
  positions,
  grid,
  direction,
  selectedContact,
  timeCursor,
  visible,
}: PlotProps) {
  const { index } = summary;
  const { stats, shares } = chosen;
  const measures = Object.entries(STORED_MEASURES).filter(([name]) => index.stats.includes(name));
  const first = (measures[0]?.[0] ?? 'at-time') as ProfileMeasure;
  const [picked, setMeasure] = useState(first);
  // The total's share is all of it, so it is only offered for groups.
  const measure = picked === 'share' && !shares ? first : picked;
  const axis = useMemo(
    () => direction?.axis ?? (positions ? arrayAxis(positions, grid) : null),
    [direction, positions, grid]
  );
  const coordinate = useMemo(
    () => (positions && axis ? coordinatesAlong(positions, axis) : null),
    [positions, axis]
  );
  const atTime = measure === 'at-time';
  const time = usePlayerTime(timeCursor, atTime && visible);
  // The field's largest, as its colour scale's limit leaves its peaks off the axis.
  const limit = useMemo(() => {
    if (!atTime) return 0;
    let largest = 0;
    for (const v of field.data) largest = Math.max(largest, Math.abs(v));
    return largest * field.scale || 1;
  }, [atTime, field]);
  const column = index.stats.indexOf(measure);
  const value = useMemo(() => {
    if (atTime) {
      const bin = time === null ? 0 : binAt(field, time);
      return (contact: number) => fieldValue(field, contact, bin);
    }
    if (measure === 'share' && shares) return (contact: number) => shares[contact] * 100;
    return (contact: number) => stats[contact * index.stats.length + column];
  }, [atTime, time, field, measure, shares, stats, index.stats.length, column]);
  const figure = useMemo(() => {
    if (!coordinate || !axis) return null;
    return profileFigure({
      points: profileAlong(coordinate, value),
      measure:
        measure === 'at-time'
          ? `Field at ${time === null ? 'the start' : `${time.toFixed(1)} ms`} (µV)`
          : measure === 'share'
            ? 'Share of the total’s variance (%)'
            : `${STORED_MEASURES[measure]} (µV)`,
      axisLabel: alongLabel(axis),
      selected:
        selectedContact === null
          ? null
          : { at: coordinate[selectedContact], value: value(selectedContact) },
      range: atTime ? [-limit, limit] : undefined,
    });
  }, [coordinate, axis, value, measure, atTime, time, selectedContact, limit]);
  return (
    <PlotFrame
      picker={picker}
      controls={
        <PillSelect
          label="Measure"
          value={measure}
          options={[
            ...measures.map(([value, label]) => ({ value, label })),
            ...(shares ? [{ value: 'share', label: 'Share of the field' }] : []),
            { value: 'at-time', label: 'At the player’s time' },
          ]}
          onChange={(v) => setMeasure(v as ProfileMeasure)}
        />
      }
      note={
        atTime
          ? removeShared
            ? 'shared signal removed'
            : undefined
          : measure === 'share' || !statsFromOverview(chosen)
            ? 'as recorded'
            : 'from the overview'
      }
      help="A value against position along the field's direction, or the array's longest axis where no line follows the field, a grid's own if it is one. Many contacts are averaged into stretches of the axis"
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
  chosen,
  selectedContact,
  lines,
  timeline,
  timeCursor,
  window,
  visible,
  open,
}: PlotProps & { lines: ContactLine[] }) {
  const line =
    lines.find((l) => selectedContact !== null && l.contacts.includes(selectedContact)) ?? lines[0];
  const tooLong =
    !!line &&
    chosen.field.kind !== 'value' &&
    line.contacts.length *
      chosen.choice.groups.length *
      summary.index.time.steps *
      Int16Array.BYTES_PER_ELEMENT >
      MAX_LINE_READ_BYTES;
  const { field, problem } = useContactRows(
    source,
    summary,
    chosen,
    !line || tooLong ? [] : line.contacts,
    open
  );
  const result = useMemo(
    () => (field && line ? currentSourceDensity(field, line.spacing) : null),
    [field, line]
  );
  const figure = useMemo(
    () =>
      result && line
        ? csdFigure({
            result,
            coordinates: line.coordinates.slice(1, -1),
            axisLabel: alongLabel(line.axis),
          })
        : null,
    [result, line]
  );
  return (
    <PlotFrame
      picker={picker}
      note={
        line
          ? `${line.contacts.length} contacts, ${Number(line.spacing.toFixed(1))} µm apart${lines.length > 1 ? ` · line ${lines.indexOf(line) + 1} of ${lines.length}` : ''}`
          : undefined
      }
      help="−σ ∂²φ/∂z² along the line holding the selected contact: sinks in blue, sources in orange. Each contact's mean over the run is taken off first, so this shows changes around it and not steady currents. It has no value at the line's two ends, and follows the field's zoom"
      visible={visible}
      figure={figure}
      empty={
        tooLong
          ? `${line.contacts.length} contacts of ${summary.index.time.steps.toLocaleString()} steps are too much to read here`
          : problem
            ? ROWS_PROBLEMS[problem]
            : line
              ? undefined
              : NO_LINE
      }
      timeline={{ events: timeline, timeCursor }}
      timeWindow={window}
    />
  );
}
