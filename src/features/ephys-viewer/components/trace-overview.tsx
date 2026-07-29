import { Select } from 'antd';
import startCase from 'es-toolkit/compat/startCase';
import Plotly from 'plotly.js-dist-min';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import createPlotlyComponent from 'react-plotly.js/factory';

import { type TViewVariant, ViewVariant } from '@/constants';
import { CHART_LINE_COLOR, OVERVIEW_PLOT_POINTS } from '@/features/ephys-viewer/constants';
import { useOverviewPlotConfig } from '@/features/ephys-viewer/hooks/config-hooks';
import { usePlotRevision } from '@/features/ephys-viewer/hooks/use-plot-revision';
import { useSweepSeries } from '@/features/ephys-viewer/hooks/use-sweep-series';
import {
  ephysHeadingClass,
  ephysSectionLabelClass,
  ephysSelectClass,
} from '@/features/ephys-viewer/label-styles';
import { toPlotTraces, yAxisTitle } from '@/features/ephys-viewer/plot-traces';
import { useTraceContext } from '@/features/ephys-viewer/trace-context';
import {
  getCellIds,
  getProtocols,
  getRecordingSlots,
  getRepetitions,
  getSweeps,
  isMultiRecordingLayout,
  RecordingType,
} from '@/features/ephys-viewer/trace-index';
import useResizeObserver from '@/hooks/use-resize-observer-w-ref';
import { cn } from '@/utils/css-class';

import type { PlotData } from 'plotly.js-dist-min';
import type { RecordingSeries, RecordingSlot } from '@/features/ephys-viewer/trace-index';
import type { CurrentUnit } from '@/util/explore-section/plotHelpers';

const Plot = createPlotlyComponent(Plotly);

const { Option } = Select;

const GRID_CLASS_NAME =
  'grid gap-7 pt-5 @max-xs:grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4 @6xl:grid-cols-5 @7xl:grid-cols-6';

interface ImageSetComponentProps {
  cellId: string;
  protocol: string;
  repetitionMap: Map<string, string[]>;
  singleRecMultiCellMode: boolean;
  onRepetitionClick: (stimulusType: string, rep: string) => () => void;
  variant?: TViewVariant;
}

interface CellComponentProps {
  cellId: string;
  protocols: string[];
  singleRecMultiCellMode: boolean;
  showCellLabel?: boolean;
  onRepetitionClick: (stimulusType: string, rep: string) => () => void;
  variant?: TViewVariant;
}

interface TraceOverviewComponentProps {
  cellId: string;
  protocol: string;
  onCellIdChange: (cellId: string) => void;
  onProtocolChange: (value: string) => void;
  onRepetitionClick: (stimulusType: string, rep: string) => () => void;
  variant?: TViewVariant;
}

const colorMap = {
  stimulus: '#ff0000',
  response: CHART_LINE_COLOR,
};

/** Thumbnails are too small for the detail view's pA/nA toggle to be legible on. */
const THUMBNAIL_CURRENT_UNIT: CurrentUnit = 'pA';

function TraceThumbnail({
  recording,
  recordingType,
  plotRevision,
}: {
  recording: RecordingSeries | undefined;
  recordingType: RecordingType;
  plotRevision: number;
}) {
  const data = usePlotData(recording, recordingType);

  // Plotly stops comparing the traces once a `datarevision` is set, so the revision has to move
  // with them — a later read of the same repetition would otherwise leave the first one drawn.
  const dataRevision = usePlotRevision(data, plotRevision);

  const yTitle =
    yAxisTitle(recording, {
      currentUnit: THUMBNAIL_CURRENT_UNIT,
      voltageTitle: startCase(recordingType),
    }) ?? '';

  const { layout, config } = useOverviewPlotConfig({
    datarevision: dataRevision,
    yTitle,
    xTitle: 'Time (ms)',
  });

  return <Plot data={data} className="h-full w-full" layout={layout} config={config} />;
}

function TraceThumbnailContainer({
  recording,
  recordingType,
  className,
}: {
  recording: RecordingSeries | undefined;
  recordingType: RecordingType;
  className?: string;
}) {
  const [plotRevision, setPlotRevision] = useState<number>(0);

  const ref = useRef<HTMLDivElement>(null);

  const onResize = useCallback(() => setPlotRevision((prev) => prev + 1), []);
  useResizeObserver(ref, onResize);

  return (
    <div ref={ref} className={cn('relative aspect-4/3 overflow-hidden bg-gray-100', className)}>
      {recording ? (
        <TraceThumbnail
          plotRevision={plotRevision}
          recording={recording}
          recordingType={recordingType}
        />
      ) : null}
    </div>
  );
}

/**
 * The thumbnails of one repetition, fetched together.
 *
 * The worker returns every recording of a repetition in one response, so the fetch is scoped
 * here rather than to each plot — a stimulus and its response come out of the same read.
 */
function RepetitionThumbnails({
  cellId,
  protocol,
  repetition,
  thumbnails,
  hasMultipleRecordings,
}: {
  cellId: string;
  protocol: string;
  repetition: string;
  thumbnails: RecordingSlot[];
  hasMultipleRecordings: boolean;
}) {
  const { index } = useTraceContext();

  // Read a repetition a screenful before it scrolls in, once.
  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: true,
    rootMargin: '1200px',
  });

  const sweeps = getSweeps(index, cellId, protocol, repetition);

  const { data } = useSweepSeries(
    inView
      ? {
          cellId,
          protocol,
          repetition,
          sweeps,
          desiredLength: OVERVIEW_PLOT_POINTS,
        }
      : null
  );

  return (
    <div
      ref={ref}
      className={
        hasMultipleRecordings
          ? 'grid grid-cols-1 gap-4 @lg:grid-cols-2 @3xl:grid-cols-4 @7xl:grid-cols-6'
          : undefined
      }
    >
      {thumbnails.map(({ recordingType, recordingIndex }) => (
        <TraceThumbnailContainer
          key={`${recordingType}-${recordingIndex}`}
          recording={data?.[recordingType]?.[recordingIndex]}
          recordingType={recordingType}
          className={cn(
            !hasMultipleRecordings &&
              recordingIndex === 0 &&
              recordingType === RecordingType.RESPONSE &&
              'mt-7'
          )}
        />
      ))}
    </div>
  );
}

function ImageSetComponent({
  cellId,
  protocol,
  repetitionMap,
  singleRecMultiCellMode,
  onRepetitionClick,
  variant = ViewVariant.Light,
}: ImageSetComponentProps) {
  const { index } = useTraceContext();
  const repetitions = repetitionMap.get(protocol) ?? [];

  const content = repetitions.map((repetition) => {
    const thumbnails = getRecordingSlots(index, cellId, protocol, repetition);
    const hasMultipleRecordings = isMultiRecordingLayout(thumbnails);

    return (
      <button
        className={cn('flex cursor-pointer flex-col gap-3 text-left', {
          'col-span-full': hasMultipleRecordings,
        })}
        key={repetition}
        onClick={onRepetitionClick(protocol, repetition)}
        type="button"
      >
        <span className={cn('text-lg', variant === ViewVariant.Default && 'text-white')}>
          {singleRecMultiCellMode ? cellId : repetition}
        </span>

        <RepetitionThumbnails
          cellId={cellId}
          protocol={protocol}
          repetition={repetition}
          thumbnails={thumbnails}
          hasMultipleRecordings={hasMultipleRecordings}
        />
      </button>
    );
  });

  if (singleRecMultiCellMode) return content;

  return (
    <div className="divide-neutral-2 flex flex-col gap-3 divide-y">
      <div className={ephysHeadingClass(variant, 'flex items-baseline gap-2 text-lg')}>
        {protocol}
        <small className="font-light">{`${repetitions.length} ${
          repetitions.length === 1 ? 'repetition' : 'repetitions'
        }`}</small>
      </div>

      <div className={GRID_CLASS_NAME}>{content}</div>
    </div>
  );
}

function CellComponent({
  cellId,
  protocols,
  onRepetitionClick,
  singleRecMultiCellMode,
  showCellLabel,
  variant = ViewVariant.Light,
}: CellComponentProps) {
  const { index } = useTraceContext();

  const repetitionMap = useMemo(
    () =>
      protocols.reduce(
        (map, protocolItem) => map.set(protocolItem, getRepetitions(index, cellId, protocolItem)),
        new Map<string, string[]>()
      ),
    [protocols, index, cellId]
  );

  const content = protocols.map((protocolItem) => (
    <ImageSetComponent
      key={protocolItem}
      cellId={cellId}
      protocol={protocolItem}
      repetitionMap={repetitionMap}
      onRepetitionClick={onRepetitionClick}
      singleRecMultiCellMode={singleRecMultiCellMode}
      variant={variant}
    />
  ));

  if (singleRecMultiCellMode) return content;

  return (
    <div className="flex flex-col gap-5">
      {showCellLabel && <div className={ephysHeadingClass(variant)}>{cellId}</div>}
      {content}
    </div>
  );
}

export default function TraceOverview({
  cellId,
  protocol,
  onCellIdChange,
  onProtocolChange,
  onRepetitionClick,
  variant = ViewVariant.Light,
}: TraceOverviewComponentProps) {
  const { index } = useTraceContext();

  const cellIds = useMemo(() => getCellIds(index), [index]);

  // Ordering is the reader's call, taken across every cell when the index was built.
  const allProtocols = index.protocolOrder;

  const filteredProtocols = useMemo(
    () => allProtocols.filter((p) => p === protocol || protocol === 'All'),
    [allProtocols, protocol]
  );

  const selectedCellIds = useMemo(
    () => cellIds.filter((cId) => cId === cellId || cellId === 'All'),
    [cellIds, cellId]
  );

  // When there are multiple cells each having only one repetition and one sweep
  // For better readability this is displayed in a single (flat) grid without nested structure
  // This switch is also used to disable rendering protocol/sweep labels
  const singleRecMultiCellMode = useMemo(() => {
    // Check if each cell has only one protocol and one repetition
    return selectedCellIds.every((cId) => {
      const cellProtocols = getProtocols(index, cId);
      if (cellProtocols.length !== 1) return false;

      return getRepetitions(index, cId, cellProtocols[0]).length === 1;
    });
  }, [selectedCellIds, index]);

  return (
    <div className="flex flex-col gap-10">
      {cellIds.length > 1 && (
        <div className={cn('flex flex-col gap-2', ephysSectionLabelClass(variant))}>
          Select cell ({cellIds.length} available)
          <Select
            className={ephysSelectClass(variant, 'cell-select')}
            placeholder="Select a cell"
            value={cellId}
            onChange={onCellIdChange}
          >
            <Option value="All">All Cells</Option>
            {cellIds.map((cId) => (
              <Option value={cId} key={cId}>
                {cId}
              </Option>
            ))}
          </Select>
        </div>
      )}

      {allProtocols.length > 1 && (
        <div className={cn('flex flex-col gap-2', ephysSectionLabelClass(variant))}>
          Select Stimulus ({allProtocols.length} available)
          <Select
            className={ephysSelectClass(variant, 'stimulus-select')}
            placeholder="Select a stimulus"
            value={protocol}
            onChange={onProtocolChange}
          >
            <Option value="All">All</Option>
            {allProtocols.map((protocolItem) => (
              <Option value={protocolItem} key={protocolItem}>
                {protocolItem}
              </Option>
            ))}
          </Select>
        </div>
      )}

      <div className={singleRecMultiCellMode ? GRID_CLASS_NAME : 'flex flex-col gap-10'}>
        {selectedCellIds.map((cId) => (
          <CellComponent
            key={cId}
            cellId={cId}
            protocols={filteredProtocols}
            onRepetitionClick={onRepetitionClick}
            singleRecMultiCellMode={singleRecMultiCellMode}
            showCellLabel={cellIds.length > 1}
            variant={variant}
          />
        ))}
      </div>
    </div>
  );
}

/** Convert the worker's decimated series into Plotly traces, in the viewer's display units. */
function usePlotData(
  recording: RecordingSeries | undefined,
  recordingType: RecordingType
): Partial<PlotData>[] {
  return useMemo(
    () =>
      toPlotTraces(recording, { color: colorMap[recordingType], currentUnit: 'pA' }).map(
        (trace) => ({ ...trace, mode: 'lines' as const, line: { ...trace.line, width: 1 } })
      ),
    [recording, recordingType]
  );
}
