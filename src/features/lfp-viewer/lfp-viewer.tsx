'use client';

import { RiPauseFill, RiPlayFill } from '@remixicon/react';
import { Empty, Spin } from 'antd';
import { maxBy } from 'es-toolkit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { ShutPaneBar } from '@/features/circuit-viewer/pane-resize-handle';
import { colourScale, fieldLimit, formatUv } from '@/features/lfp-viewer/colour-scale';
import { lineColour, pickColours } from '@/features/lfp-viewer/contact-colours';
import { contactGrid } from '@/features/lfp-viewer/contact-grid';
import { recordingArrayId } from '@/features/lfp-viewer/contacts';
import { contactCardRows, ElectrodesTable } from '@/features/lfp-viewer/electrodes-table';
import { FieldFromControls } from '@/features/lfp-viewer/field-from';
import { FieldPlot } from '@/features/lfp-viewer/field-plot';
import {
  coordinatesAlong,
  DEFAULT_TRACES,
  describeField,
  fieldDirection,
  fieldRows,
  MAX_TRACES,
  openingOrder,
  sharedShareOf,
  tracedContacts,
  traceLabels,
  withoutShared,
} from '@/features/lfp-viewer/field-structure';
import { LfpScene } from '@/features/lfp-viewer/lfp-scene';
import { LfpStatistics } from '@/features/lfp-viewer/lfp-statistics';
import {
  statsFromOverview,
  TOTAL_FIELD,
  useChosenField,
  useContactPositions,
  useLfpSummary,
  useWindowRows,
} from '@/features/lfp-viewer/use-lfp-summary';
import { useResultsSidePanel } from '@/features/scan-config/components/shared/results-layout';
import {
  DEFAULT_SCENE_SPEED,
  SceneSpeedSelect,
} from '@/features/sonata-viewer/components/voltage-scene';
import { createTimeCursor } from '@/features/sonata-viewer/time-cursor';
import { togglePickIn } from '@/features/sonata-viewer/trace-picks';
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
import type { FieldPlotMode, LanesInView } from '@/features/lfp-viewer/field-plot';
import type { RowOrder } from '@/features/lfp-viewer/field-structure';
import type {
  ContactPositions,
  FieldChoice,
  LfpSummary,
} from '@/features/lfp-viewer/use-lfp-summary';
import type { SimulationReport } from '@/features/sonata-viewer/simulation-reports-context';
import type { Pick } from '@/features/sonata-viewer/trace-picks';
import type { WorkspaceContext } from '@/types/common';

/** "Hide below" in 3D, as shares of the scale's limit. */
const HIDE_BELOW_SHARES = [0, 0.05, 0.1, 0.25];
const GAINS = [0.5, 1, 2, 4, 8];
/** Each trace's height in px, for those that scroll: Fit has every one in the pane. */
const LANE_HEIGHTS = { fit: null, small: 16, medium: 32, large: 64 } as const;
type LaneHeight = keyof typeof LANE_HEIGHTS;
/** Above this many contacts the traces open at Small, scrolling, as Fit would squeeze them. */
const FIT_AT_MOST = 64;
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
  const { index, total } = summary;
  const { spikeFiles, timeline } = useSimulation();
  const start = index.time.start;
  const end = start + index.time.steps * index.time.dt;
  const sceneTimeRange = useMemo(() => ({ min: start, max: end }), [start, end]);
  const structure = useMemo(() => describeField(total), [total]);
  const grid = useMemo(() => (positions ? contactGrid(positions) : null), [positions]);
  const direction = useMemo(
    () => (positions ? fieldDirection(structure.mode, positions) : null),
    [structure, positions]
  );

  const [choice, setChoice] = useState(TOTAL_FIELD);
  const { chosen, loading, failed } = useChosenField(source, summary, choice);
  // The controls name what the panes draw: a field that can't be read is let go of, to be read again if picked again.
  const [lastUnread, setLastUnread] = useState(false);
  if (failed && chosen.choice !== choice) {
    setChoice(chosen.choice);
    setLastUnread(true);
  }
  const pickField = (next: FieldChoice) => {
    setLastUnread(false);
    setChoice(next);
  };
  const [removeShared, setRemoveShared] = useState(false);
  const field = useMemo(
    () => (removeShared ? withoutShared(chosen.field) : chosen.field),
    [removeShared, chosen.field]
  );
  const scale = useMemo(() => colourScale(fieldLimit(field)), [field]);
  const [hideBelowShare, setHideBelowShare] = useState(0);

  const [mode, setMode] = useState<FieldPlotMode>('traces');
  const [chosenOrder, setChosenOrder] = useState<RowOrder | null>(null);
  const order = chosenOrder ?? openingOrder(structure, direction);
  const ptp = index.stats.indexOf('ptp');
  // Rows stay as the total has them, so that they don't jump about between groups.
  const swing = useCallback(
    (contact: number) => (ptp < 0 ? 0 : summary.stats[contact * index.stats.length + ptp]),
    [index.stats, ptp, summary.stats]
  );
  const rows = useMemo(
    () => fieldRows(order, structure, positions, direction, swing),
    [order, structure, positions, direction, swing]
  );
  const [gain, setGain] = useState(1);
  // Every contact, as a probe's traces are, the ticked in their colours; or the ticked alone.
  const [tracedOnly, setTracedOnly] = useState(false);
  const [laneHeight, setLaneHeight] = useState<LaneHeight>(() =>
    index.contacts > FIT_AT_MOST ? 'small' : 'fit'
  );
  const [timeWindow, setTimeWindow] = useState<[number, number] | null>(null);
  const shownWindow = useMemo<[number, number]>(
    () => timeWindow ?? [start, end],
    [timeWindow, start, end]
  );
  // Each with a colour of its own, kept while others are ticked and unticked, as a voltage report's cells.
  const [picks, setPicks] = useState<Pick[]>([]);
  const ticked = useMemo(() => picks.map((p) => p.nodeId), [picks]);
  const colours = useMemo(() => pickColours(picks), [picks]);
  // Under the pointer in the table, which the traces and the 3D player show, or in the traces,
  // which the player shows, as a voltage report's are.
  const [rowHovered, setRowHovered] = useState<number | null>(null);
  const [traceHovered, setTraceHovered] = useState<number | null>(null);
  // The contact the statistics are about, at first and after a reset the one the field swings most at.
  const [defaultContact] = useState<number | null>(() =>
    ptp < 0
      ? null
      : (maxBy(
          Array.from({ length: index.contacts }, (_, c) => c),
          swing
        ) ?? null)
  );
  const [selectedContact, setSelectedContact] = useState(defaultContact);
  // Clicked again, a contact gives the selection back, as a voltage report's trace gives back every cell.
  const toggleSelected = useCallback(
    (contact: number) =>
      setSelectedContact((selected) => (selected === contact ? defaultContact : contact)),
    [defaultContact]
  );
  const contactRows = useCallback(
    (contact: number) =>
      contactCardRows(contact, {
        statNames: index.stats,
        stats: chosen.stats,
        shares: chosen.shares,
        positions,
      }),
    [index.stats, chosen.stats, chosen.shares, positions]
  );
  const clickHint = useCallback(
    (contact: number) =>
      contact !== selectedContact
        ? 'Click to select this contact'
        : contact !== defaultContact && defaultContact !== null
          ? `Click to go back to e${defaultContact}`
          : 'Selected',
    [selectedContact, defaultContact]
  );
  const allContacts = useMemo(() => rows.flatMap((row) => row.contacts), [rows]);
  const tracedOnes = useMemo(
    () => (tracedOnly ? tracedContacts(rows, ticked) : null),
    [tracedOnly, rows, ticked]
  );
  const traces = tracedOnes ?? allContacts;
  const along = useMemo(
    () => (positions && direction ? coordinatesAlong(positions, direction.axis) : null),
    [positions, direction]
  );
  const labels = useMemo(() => traceLabels(traces, along), [traces, along]);
  const colourOfLine = useMemo(
    () => lineColour(colours, selectedContact),
    [colours, selectedContact]
  );
  // The lanes on show and a screen of them either side are read over the window, finer than the
  // overview: only while drawn, and once positions are in, as they can change which contacts are
  // traced. A contact's row read so holds nothing of the mean to take off. They move a screen at a
  // time, so that a scroll of a lane doesn't put the window's field together again: the lanes on
  // show are within two screens and a lane of the first of theirs.
  const [lanesInView, setLanesInView] = useState<LanesInView | null>(null);
  const readTraces = useMemo(() => {
    if (!lanesInView) return [];
    const { first, perScreen } = lanesInView;
    return traces.slice(Math.max(0, first - perScreen), first + 3 * perScreen + 1);
  }, [traces, lanesInView]);
  const readsTraces = mode === 'traces' && !removeShared && contacts.state !== 'loading';
  const traceRows = useWindowRows(
    source,
    summary,
    chosen,
    readTraces,
    shownWindow,
    lanesInView?.width ?? 0,
    readsTraces
  );
  const sharedShare = useMemo(() => sharedShareOf(chosen.field), [chosen.field]);
  const sharedPercent = Math.round(sharedShare * 100);

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
                {tracedOnly &&
                  ticked.length > MAX_TRACES &&
                  ` · the first ${MAX_TRACES} of ${ticked.length} ticked traced`}
                {order === 'along' &&
                  direction &&
                  ` · along (${direction.axis.map((d) => d.toFixed(2)).join(', ')})`}
                {statsFromOverview(chosen) &&
                  ` · table over ${Number(chosen.field.binMs.toFixed(2))} ms means, so peaks read lower`}
                {traceRows.tooMany && ' · overview traces: too many rows to read finer'}
                {traceRows.failed && ' · overview traces: the finer ones could not be read'}
                {loading && ' · reading the field'}
                {(failed || lastUnread) && ' · that field could not be read'}
              </span>
              <PlotHelp>
                Drag to zoom · Double-click to reset · Click a trace to select its contact for the
                statistics, again to go back to the one the field swings most at; in the map, the
                row&apos;s contact · The player moves with the bar below · Tick contacts in the
                table to draw their traces in a colour of their own, there and in the 3D player;
                Show ticked draws those alone · Scroll through traces that don&apos;t fit · Removing
                the shared signal leaves the table and spectra as recorded · A group of cells&apos;
                overview holds means over its bins, the total&apos;s their extremes, so zoomed out
                the total&apos;s peaks read higher
              </PlotHelp>
            </>
          }
        >
          <FieldFromControls index={index} choice={choice} onChange={pickField} />
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
              label="Show"
              value={tracedOnly ? 'ticked' : 'all'}
              options={[
                { value: 'all', label: 'All contacts' },
                {
                  value: 'ticked',
                  label: 'Ticked',
                  detail:
                    ticked.length > 0 ? undefined : `None ticked: ${DEFAULT_TRACES} spread out`,
                },
              ]}
              onChange={(v) => setTracedOnly(v === 'ticked')}
            />
          )}
          {mode === 'traces' && (
            <PillSelect
              label="Height"
              value={laneHeight}
              options={[
                { value: 'fit', label: 'Fit' },
                { value: 'small', label: 'Small' },
                { value: 'medium', label: 'Medium' },
                { value: 'large', label: 'Large' },
              ]}
              onChange={(v) => setLaneHeight(v as LaneHeight)}
            />
          )}
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
        traceLabels={labels}
        colours={colours}
        traceRows={traceRows.rows}
        minSpanMs={2 * traceRows.finestBinMs}
        onLanesInView={setLanesInView}
        gain={gain}
        laneHeight={LANE_HEIGHTS[laneHeight]}
        window={shownWindow}
        onWindowChange={setTimeWindow}
        selectedContact={selectedContact}
        onContactClick={toggleSelected}
        onContactHover={setTraceHovered}
        hoveredContact={rowHovered}
        contactRows={contactRows}
        clickHint={clickHint}
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
      stats={chosen.stats}
      shares={chosen.shares}
      positions={positions}
      blocks={blocks}
      ticked={ticked}
      onTick={(contact) => setPicks((shown) => togglePickIn(shown, contact))}
      reset={{
        picked: picks.length > 0 || timeWindow !== null || selectedContact !== defaultContact,
        onReset: () => {
          setPicks([]);
          setTimeWindow(null);
          setSelectedContact(defaultContact);
        },
      }}
      onContactHover={setRowHovered}
      selectedContact={selectedContact}
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
              boxClassName: 'p-2',
              content: sceneMounted && (
                <LfpScene
                  circuit={circuit}
                  populationName={index.populations.length === 1 ? index.populations[0] : undefined}
                  field={field}
                  scale={scale}
                  contacts={contacts}
                  grid={grid}
                  hideBelow={hideBelowShare * scale.limit}
                  selectedContact={selectedContact}
                  colours={colours}
                  hoveredContact={rowHovered ?? traceHovered}
                  timeCursor={timeCursor}
                  speed={speed}
                  spikeFiles={spikeFiles}
                  ctx={source.ctx}
                  timeRange={sceneTimeRange}
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
                  chosen={chosen}
                  field={field}
                  removeShared={removeShared}
                  rows={rows}
                  positions={positions}
                  grid={grid}
                  direction={direction}
                  selectedContact={selectedContact}
                  ticked={ticked}
                  lineColour={colourOfLine}
                  spikeFiles={spikeFiles}
                  timeline={timeline}
                  timeCursor={timeCursor}
                  window={shownWindow}
                  visible={plotsUp && !sliding}
                  open={plotsUp}
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
