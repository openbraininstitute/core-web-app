'use client';

import { RiPauseFill, RiPlayFill } from '@remixicon/react';
import { Empty, Spin } from 'antd';
import { maxBy } from 'es-toolkit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { ShutPaneBar } from '@/features/circuit-viewer/pane-resize-handle';
import { colourScale, fieldLimit, formatUv } from '@/features/lfp-viewer/colour-scale';
import { recordingArrayId } from '@/features/lfp-viewer/contacts';
import { ElectrodesTable } from '@/features/lfp-viewer/electrodes-table';
import { FieldPlot } from '@/features/lfp-viewer/field-plot';
import {
  describeField,
  fieldDirection,
  fieldRows,
  MAX_TRACES,
  openingOrder,
  openingView,
  tracedContacts,
  withoutShared,
} from '@/features/lfp-viewer/field-structure';
import { LfpScene } from '@/features/lfp-viewer/lfp-scene';
import { LfpStatistics } from '@/features/lfp-viewer/lfp-statistics';
import {
  useContactPositions,
  useContactRows,
  useLfpSummary,
} from '@/features/lfp-viewer/use-lfp-summary';
import { useResultsSidePanel } from '@/features/scan-config/components/shared/results-layout';
import {
  DEFAULT_SCENE_SPEED,
  SceneSpeedSelect,
} from '@/features/sonata-viewer/components/voltage-scene';
import { createTimeCursor } from '@/features/sonata-viewer/time-cursor';
import { CollapsingControls } from '@/features/spike-viewer/components/collapsing-controls';
import { PlotHelp } from '@/features/spike-viewer/components/raster-plot-controls';
import { useSimulation } from '@/features/spike-viewer/simulation-context';
import { replaySubject } from '@/features/spike-viewer/spike-replay/replay-subject';
import { Scrubber } from '@/features/spike-viewer/spike-replay/scrubber';
import {
  TimeWindowFields,
  WindowResetButton,
} from '@/features/spike-viewer/spike-replay/time-window-fields';
import {
  LoadingFilePanes,
  OpenPanelButton,
  PANEL_FLOORS,
  StackedPanes,
} from '@/features/spike-viewer/spike-statistics/stacked-panes';
import { TABLE_BOX_CLASS } from '@/features/spike-viewer/spike-statistics/statistics-plots';
import { Button } from '@/ui/molecules/button';
import { PillSelect } from '@/ui/molecules/select/pill-select';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { ISimulationResult } from '@/api/entitycore/types/entities/simulation-result';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { LfpSummarySource } from '@/api/small-scale-simulator/simulation-result/lfp-summary';
import type { FieldPlotMode } from '@/features/lfp-viewer/field-plot';
import type { RowOrder } from '@/features/lfp-viewer/field-structure';
import type { ContactPositions, LfpSummary } from '@/features/lfp-viewer/use-lfp-summary';
import type { SimulationReport } from '@/features/sonata-viewer/simulation-reports-context';
import type { WorkspaceContext } from '@/types/common';

/** "Hide below" in 3D, as shares of the scale's limit. */
const HIDE_BELOW_SHARES = [0, 0.05, 0.1, 0.25];
const GAINS = [0.5, 1, 2, 4, 8];
const TRACES_TITLE = 'Extracellular field';
const TABLE_TITLE = 'Electrodes';
const SCENE_TITLE = '3D Player';
const STATISTICS_TITLE = 'Statistics';
const PANEL_TITLES = [SCENE_TITLE, STATISTICS_TITLE];

/**
 * An LFP report, read from the summary Bluenaas builds of it the first time it
 * is opened: the field over time, its contacts, played over the circuit, and
 * its spectra.
 */
export function LfpViewer({
  entity,
  asset,
  ctx,
  report,
}: {
  entity: ISimulationResult;
  asset: IAsset;
  ctx: WorkspaceContext;
  report: SimulationReport | null;
}) {
  const source = { ctx, resultId: entity.id, assetId: asset.id };
  const { status, summary } = useLfpSummary(source);
  const { model } = useSimulation();
  const circuit = replaySubject(model)?.circuit;
  const contacts = useContactPositions(
    ctx,
    recordingArrayId(report?.electrodes_file),
    summary.data?.index.contacts
  );
  const sidePanel = useResultsSidePanel();

  if (status.error || summary.error) {
    return (
      <Empty
        className="p-2em"
        description="There was a problem reading this LFP report's summary"
      />
    );
  }
  if (status.data?.state === 'building') {
    return <Summarising queuePosition={status.data.queue_position ?? null} />;
  }
  if (status.data?.state === 'refused') {
    return (
      <Empty
        className="p-2em"
        description={`This LFP report cannot be summarised: ${status.data.reason}`}
      />
    );
  }
  if (status.data?.state === 'failed') {
    return <Empty className="p-2em" description="Summarising this LFP report failed" />;
  }
  if (!summary.data) {
    return sidePanel?.target ? (
      <LoadingFilePanes title={TRACES_TITLE} panelTitles={PANEL_TITLES} tableTitle={TABLE_TITLE} />
    ) : (
      <div className="flex h-full items-center justify-center">
        <Spin />
      </div>
    );
  }
  if (summary.data.index.contacts === 0) {
    return <Empty className="p-2em" description="This LFP report has no contacts" />;
  }
  return (
    <LfpReportView source={source} summary={summary.data} circuit={circuit} contacts={contacts} />
  );
}

function Summarising({ queuePosition }: { queuePosition: number | null }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <Spin />
      <div className="text-primary-9 font-semibold">Summarising this LFP report</div>
      <p className="max-w-md text-sm text-neutral-500">
        The report holds every cell&apos;s contribution to every contact. They are summed once, for
        this and every later visit, which takes a minute or two for a large report.
        {queuePosition ? ` ${queuePosition} ahead in the queue.` : ''}
      </p>
    </div>
  );
}

function LfpReportView({
  source,
  summary,
  circuit,
  contacts,
}: {
  source: LfpSummarySource;
  summary: LfpSummary;
  circuit: ICircuit | undefined;
  contacts: ContactPositions;
}) {
  const { positions, blocks } = contacts;
  const { index, total, stats } = summary;
  const { spikeFiles, timeline } = useSimulation();
  const start = index.time.start;
  const end = start + index.time.steps * index.time.dt;
  const structure = useMemo(() => describeField(total), [total]);
  const direction = useMemo(
    () => (positions ? fieldDirection(structure.mode, positions) : null),
    [structure, positions]
  );

  const [removeShared, setRemoveShared] = useState(false);
  const field = useMemo(() => (removeShared ? withoutShared(total) : total), [removeShared, total]);
  const scale = useMemo(() => colourScale(fieldLimit(field)), [field]);
  const [hideBelowShare, setHideBelowShare] = useState(0);

  const [mode, setMode] = useState<FieldPlotMode>(() => openingView(structure));
  const [chosenOrder, setChosenOrder] = useState<RowOrder | null>(null);
  const order = chosenOrder ?? openingOrder(structure, direction);
  const ptp = index.stats.indexOf('ptp');
  const swing = useCallback(
    (contact: number) => (ptp < 0 ? 0 : stats[contact * index.stats.length + ptp]),
    [index.stats, ptp, stats]
  );
  const rows = useMemo(
    () => fieldRows(order, structure, positions, direction, swing),
    [order, structure, positions, direction, swing]
  );
  const [gain, setGain] = useState(1);
  const [timeWindow, setTimeWindow] = useState<[number, number] | null>(null);
  const [ticked, setTicked] = useState<number[]>([]);
  // At first the contact the field swings most at.
  const [selectedContact, setSelectedContact] = useState<number | null>(() =>
    ptp < 0
      ? null
      : (maxBy(
          Array.from({ length: index.contacts }, (_, c) => c),
          swing
        ) ?? null)
  );
  const traces = useMemo(() => tracedContacts(rows, ticked), [rows, ticked]);
  // Read only while drawn, and once positions are in, as they can change which contacts are traced.
  // A contact's row at full resolution holds nothing of the mean to take off.
  const traceField = useContactRows(
    source,
    summary,
    mode === 'traces' && !removeShared && total.kind !== 'value' && contacts.state !== 'loading'
      ? traces
      : []
  ).field;
  const sharedPercent = Math.round(structure.sharedShare * 100);

  // The player: one clock, moving every view's cursor outside React.
  const timeCursor = useMemo(() => createTimeCursor(), []);
  const timeRef = useRef(start);
  const scrubberRef = useRef<((timeInMs: number) => void) | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(DEFAULT_SCENE_SPEED);
  const moveTo = useCallback(
    (timeInMs: number) => {
      const t = Math.min(end, Math.max(start, timeInMs));
      timeRef.current = t;
      scrubberRef.current?.(t);
      timeCursor.set(t);
    },
    [start, end, timeCursor]
  );
  useEffect(() => {
    moveTo(timeRef.current);
  }, [moveTo]);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      const next = Math.min(end, timeRef.current + ((now - last) / 1000) * speed);
      last = now;
      moveTo(next);
      if (next >= end) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [playing, end, speed, moveTo]);
  const play = () => {
    if (!playing && timeRef.current >= end) moveTo(start);
    setPlaying(!playing);
  };

  const sidePanel = useResultsSidePanel();
  const dockedOpen = !!circuit && !!sidePanel?.open;
  const shuts = sidePanel?.shuts;
  const sliding = sidePanel?.sliding ?? false;
  const sceneUp = dockedOpen && shuts?.columns !== 'end' && shuts?.panel !== 'start';
  const plotsUp = dockedOpen && shuts?.columns !== 'end' && shuts?.panel !== 'end';
  // Once up the scene stays: building it again costs the circuit's download.
  const [sceneMounted, setSceneMounted] = useState(false);
  useEffect(() => {
    if (sceneUp && !sliding) setSceneMounted(true);
  }, [sceneUp, sliding]);

  const shownWindow = useMemo<[number, number]>(
    () => timeWindow ?? [start, end],
    [timeWindow, start, end]
  );

  const transport = (left: number, right: number) => (
    <div className="relative h-10 shrink-0">
      <div
        className="absolute inset-y-0 left-0 flex items-center justify-end pr-1.5"
        style={{ width: left }}
      >
        <Button
          type="button"
          variant="icon"
          size="sm"
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={play}
        >
          {playing ? <RiPauseFill className="size-4" /> : <RiPlayFill className="size-4" />}
        </Button>
      </div>
      <Scrubber
        from={shownWindow[0]}
        to={shownWindow[1]}
        left={left}
        right={right}
        timeRef={timeRef}
        moveRef={scrubberRef}
        onSeek={moveTo}
      />
    </div>
  );

  const tracesPane = (
    <>
      <div className="shrink-0 px-1 pb-1">
        <CollapsingControls
          inline
          trailing={
            <>
              <span className="whitespace-nowrap text-xs text-neutral-400">
                {index.contacts.toLocaleString()} contacts · {index.populations.join(', ')}
                {ticked.length > MAX_TRACES &&
                  ` · the first ${MAX_TRACES} of ${ticked.length} ticked traced`}
                {order === 'along' &&
                  direction &&
                  ` · along (${direction.axis.map((d) => d.toFixed(2)).join(', ')})`}
              </span>
              <PlotHelp>
                Drag to zoom · Double-click to reset · Click to move the player there; in the map,
                to pick the row&apos;s contact · Tick contacts in the table to draw their traces ·
                Removing the shared signal leaves the table and spectra as recorded
              </PlotHelp>
            </>
          }
        >
          <PillSelect
            label="View"
            value={mode}
            options={[
              { value: 'traces', label: 'Traces' },
              { value: 'map', label: 'Map' },
            ]}
            onChange={(v) => setMode(v as FieldPlotMode)}
          />
          <PillSelect
            label="Order"
            value={order}
            options={[
              {
                value: 'along',
                label: 'Along the field',
                disabled: !direction,
                detail: direction
                  ? undefined
                  : positions
                    ? 'No straight line follows this field'
                    : 'Needs the contacts’ positions',
              },
              { value: 'similar', label: 'Similar contacts' },
              { value: 'contacts', label: 'Contact order' },
            ]}
            onChange={(v) => setChosenOrder(v as RowOrder)}
          />
          <PillSelect
            label="Shared signal"
            title={`What all contacts have in common: ${sharedPercent}% of the field's variance`}
            value={removeShared ? 'removed' : 'kept'}
            options={[
              { value: 'kept', label: 'Kept', detail: `${sharedPercent}% of the field` },
              { value: 'removed', label: 'Removed' },
            ]}
            onChange={(v) => setRemoveShared(v === 'removed')}
          />
          {mode === 'traces' && (
            <PillSelect
              label="Gain"
              value={String(gain)}
              options={GAINS.map((g) => ({ value: String(g), label: `×${g}` }))}
              onChange={(v) => setGain(Number(v))}
            />
          )}
          <SceneSpeedSelect speed={speed} onSpeedChange={setSpeed} />
          {sceneUp && positions && (
            <PillSelect
              label="3D hide below"
              value={String(hideBelowShare)}
              options={HIDE_BELOW_SHARES.map((share) => ({
                value: String(share),
                label: share === 0 ? 'Off' : `${formatUv(share * scale.limit)} µV`,
              }))}
              onChange={(v) => setHideBelowShare(Number(v))}
            />
          )}
          <TimeWindowFields
            from={shownWindow[0]}
            to={shownWindow[1]}
            min={start}
            max={end}
            onChange={(from, to) => setTimeWindow([from, to])}
          />
          <WindowResetButton
            zoomed={timeWindow !== null}
            title="Back to the whole run"
            onReset={() => setTimeWindow(null)}
          />
        </CollapsingControls>
      </div>
      <FieldPlot
        mode={mode}
        field={field}
        scale={scale}
        rows={rows}
        traces={traces}
        traceField={traceField}
        gain={gain}
        window={shownWindow}
        onWindowChange={setTimeWindow}
        selectedContact={selectedContact}
        onContactClick={setSelectedContact}
        onSeek={moveTo}
        timeCursor={timeCursor}
        events={timeline}
        footer={transport}
      />
    </>
  );

  const table = (
    <ElectrodesTable
      contacts={index.contacts}
      statNames={index.stats}
      stats={stats}
      positions={positions}
      blocks={blocks}
      ticked={ticked}
      onTickedChange={setTicked}
      selectedContact={selectedContact}
      onContactClick={setSelectedContact}
    />
  );

  if (!sidePanel || !circuit) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3 px-4 pt-1.25 pb-4">
        <div className="flex min-h-[320px] flex-[3] flex-col">{tracesPane}</div>
        <div className={`${TABLE_BOX_CLASS} flex min-h-[200px] flex-[2] flex-col`}>{table}</div>
      </div>
    );
  }

  return (
    <>
      <StackedPanes
        split="file"
        header={
          !dockedOpen && (
            <div className="mb-3 flex min-w-0 items-center justify-end">
              <OpenPanelButton titles={PANEL_TITLES} onOpen={() => sidePanel.setOpen(true)} />
            </div>
          )
        }
        top={{ title: TRACES_TITLE, boxClassName: 'p-2', content: tracesPane }}
        bottom={{ title: TABLE_TITLE, boxClassName: 'px-3 pt-1 pb-2', content: table }}
      />
      {sidePanel.target &&
        createPortal(
          <StackedPanes
            split="panel"
            floors={PANEL_FLOORS}
            top={{
              title: SCENE_TITLE,
              keepsSize: true,
              boxClassName: 'px-2 pt-2',
              content: sceneMounted && (
                <LfpScene
                  circuit={circuit}
                  populationName={index.populations.length === 1 ? index.populations[0] : undefined}
                  field={field}
                  scale={scale}
                  contacts={contacts}
                  hideBelow={hideBelowShare * scale.limit}
                  selectedContact={selectedContact}
                  timeCursor={timeCursor}
                  active={sceneUp}
                />
              ),
            }}
            bottom={{
              title: STATISTICS_TITLE,
              content: (
                <LfpStatistics
                  source={source}
                  summary={summary}
                  field={field}
                  removeShared={removeShared}
                  rows={rows}
                  positions={positions}
                  direction={direction}
                  selectedContact={selectedContact}
                  ticked={ticked}
                  spikeFiles={spikeFiles}
                  timeline={timeline}
                  timeCursor={timeCursor}
                  window={shownWindow}
                  visible={plotsUp && !sliding}
                />
              ),
            }}
          />,
          sidePanel.target
        )}
      {sidePanel.fileStrip &&
        createPortal(
          <ShutPaneBar
            upright
            title={[TRACES_TITLE, TABLE_TITLE]}
            onOpen={sidePanel.openColumns}
          />,
          sidePanel.fileStrip
        )}
      {sidePanel.panelStrip &&
        createPortal(
          <ShutPaneBar upright title={PANEL_TITLES} onOpen={sidePanel.openColumns} />,
          sidePanel.panelStrip
        )}
    </>
  );
}
