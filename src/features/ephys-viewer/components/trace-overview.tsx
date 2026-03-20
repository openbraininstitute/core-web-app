import { LineChartOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import startCase from 'es-toolkit/compat/startCase';
import Plotly from 'plotly.js-dist-min';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import createPlotlyComponent from 'react-plotly.js/factory';

import { useOverviewPlotConfig } from '@/features/ephys-viewer/hooks/config-hooks';
import { RecordingType } from '@/features/ephys-viewer/nwb-trace';
import useResizeObserver from '@/hooks/use-resize-observer-w-ref';
import optimizePlotData from '@/util/explore-section/optimize-trace';
import { convertCurrentSeries, convertVoltageSeries } from '@/util/explore-section/plot-helpers';
import { cn } from '@/utils/css-class';

import type NWBTrace from '@/features/ephys-viewer/nwb-trace';

const Plot = createPlotlyComponent(Plotly);

const { Option } = Select;

const GRID_CLASS_NAME =
  'grid gap-7 pt-5 @max-xs:grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4 @6xl:grid-cols-5 @7xl:grid-cols-6';

interface ImageSetComponentProps {
  trace: NWBTrace;
  cellId: string;
  protocol: string;
  repetitionMap: Map<string, string[]>;
  singleRecMultiCellMode: boolean;
  onRepetitionClick: (stimulusType: string, rep: string) => () => void;
}

interface CellComponentProps {
  trace: NWBTrace;
  cellId: string;
  protocols: string[];
  singleRecMultiCellMode: boolean;
  showCellLabel?: boolean;
  onRepetitionClick: (stimulusType: string, rep: string) => () => void;
}

interface TraceOverviewComponentProps {
  trace: NWBTrace;
  cellId: string;
  protocol: string;
  onCellIdChange: (cellId: string) => void;
  onProtocolChange: (value: string) => void;
  onRepetitionClick: (stimulusType: string, rep: string) => () => void;
}

const colorMap = {
  stimulus: '#ff0000',
  response: '#000000',
};

function TraceThumbnail({
  trace,
  cellId,
  protocol,
  repetition,
  recordingType,
  recordingIndex,
  plotRevision,
}: {
  trace: NWBTrace;
  cellId: string;
  protocol: string;
  repetition: string;
  recordingType: RecordingType;
  recordingIndex: number;
  plotRevision: number;
}) {
  const sweeps = trace.getSweeps(cellId, protocol, repetition);
  const [rawData, dataUnit, label] = useDataWithUnit(
    cellId,
    protocol,
    recordingType,
    recordingIndex,
    repetition,
    sweeps,
    trace
  );
  const unitStr = dataUnit === 'amperes' ? 'pA' : 'mV';
  const yTitle =
    dataUnit === 'amperes'
      ? `${label ?? 'Current'} (${unitStr})`
      : `${startCase(recordingType)} (${unitStr})`;
  const { layout, config } = useOverviewPlotConfig({
    datarevision: plotRevision,
    yTitle,
    xTitle: 'Time (ms)',
  });

  return <Plot data={rawData} className="h-full w-full" layout={layout} config={config} />;
}

function TraceThumbnailContainer({
  trace,
  cellId,
  protocol,
  repetition,
  recordingType,
  recordingIndex,
  className,
}: {
  trace: NWBTrace;
  cellId: string;
  protocol: string;
  repetition: string;
  recordingType: RecordingType;
  recordingIndex: number;
  className?: string;
}) {
  const [plotRevision, setPlotRevision] = useState<number>(0);

  const { ref: setInViewRef, inView } = useInView({
    threshold: 0,
    triggerOnce: true,
    rootMargin: '1200px',
  });

  const ref = useRef<HTMLDivElement>(null);

  const onResize = useCallback(() => setPlotRevision((prev) => prev + 1), []);
  useResizeObserver(ref, onResize);

  useEffect(() => {
    if (ref.current) setInViewRef(ref.current);
  }, [ref, setInViewRef]);

  return (
    <div ref={ref} className={cn('relative aspect-4/3 overflow-hidden bg-gray-100', className)}>
      {inView ? (
        <TraceThumbnail
          plotRevision={plotRevision}
          trace={trace}
          cellId={cellId}
          protocol={protocol}
          repetition={repetition}
          recordingType={recordingType}
          recordingIndex={recordingIndex}
        />
      ) : null}
    </div>
  );
}

function ImageSetComponent({
  trace,
  cellId,
  protocol,
  repetitionMap,
  singleRecMultiCellMode,
  onRepetitionClick,
}: ImageSetComponentProps) {
  const repetitions = repetitionMap.get(protocol) ?? [];

  const content = repetitions.map((repetition) => {
    const thumbnails = trace.recordingTypes.flatMap((recordingType: RecordingType) => {
      const recordings = trace.getSweepRecordingData(
        cellId,
        protocol,
        repetition,
        trace.getSweeps(cellId, protocol, repetition)[0],
        recordingType
      );
      return recordings.map((_, i) => ({
        recordingType,
        recordingIndex: i,
        key: `${recordingType}-${i}`,
      }));
    });

    const hasMultipleRecordings = thumbnails.length > 2;

    return (
      <div
        className={cn('flex flex-col gap-2', hasMultipleRecordings && 'col-span-full')}
        key={repetition}
      >
        <div className="flex items-center justify-between">
          <span className="text-dark indent-3 text-lg font-light capitalize">
            {singleRecMultiCellMode ? cellId : repetition}
          </span>
          <button
            className="bg-neutral-1 hover:bg-neutral-2 flex items-center rounded p-3"
            onClick={onRepetitionClick(protocol, repetition)}
            type="button"
            aria-label="Toggle selection"
          >
            <LineChartOutlined className="stroke-primary-8" />
          </button>
        </div>

        <div
          className={
            hasMultipleRecordings
              ? 'grid grid-cols-1 gap-4 @lg:grid-cols-2 @3xl:grid-cols-4 @7xl:grid-cols-6'
              : undefined
          }
        >
          {thumbnails.map(({ recordingType, recordingIndex, key }) => (
            <TraceThumbnailContainer
              key={key}
              trace={trace}
              cellId={cellId}
              protocol={protocol}
              repetition={repetition}
              recordingType={recordingType}
              recordingIndex={recordingIndex}
              className={cn(
                !hasMultipleRecordings &&
                  recordingIndex === 0 &&
                  recordingType === RecordingType.RESPONSE &&
                  'mt-7'
              )}
            />
          ))}
        </div>
      </div>
    );
  });

  if (singleRecMultiCellMode) return content;

  return (
    <div className="divide-neutral-2 flex flex-col gap-3 divide-y">
      <div className="text-primary-9 flex items-baseline gap-2 text-lg font-bold">
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
  trace,
  cellId,
  protocols,
  onRepetitionClick,
  singleRecMultiCellMode,
  showCellLabel,
}: CellComponentProps) {
  const repetitionMap = useMemo(
    () =>
      protocols.reduce(
        (map, protocolItem) => map.set(protocolItem, trace.getRepetitions(cellId, protocolItem)),
        new Map<string, string[]>()
      ),
    [protocols, trace, cellId]
  );

  const content = protocols.map((protocolItem) => (
    <ImageSetComponent
      key={protocolItem}
      trace={trace}
      cellId={cellId}
      protocol={protocolItem}
      repetitionMap={repetitionMap}
      onRepetitionClick={onRepetitionClick}
      singleRecMultiCellMode={singleRecMultiCellMode}
    />
  ));

  if (singleRecMultiCellMode) return content;

  return (
    <div className="flex flex-col gap-5">
      {showCellLabel && <div className="text-primary-9 text-xl font-bold">{cellId}</div>}
      {content}
    </div>
  );
}

export default function TraceOverview({
  trace,
  cellId,
  protocol,
  onCellIdChange,
  onProtocolChange,
  onRepetitionClick,
}: TraceOverviewComponentProps) {
  const cellIds = useMemo(() => trace.getCellIds(), [trace]);

  const allProtocols = useMemo(() => {
    const protocolSet = new Set<string>();
    cellIds.forEach((cId) => {
      trace.getProtocols(cId).forEach((p) => protocolSet.add(p));
    });
    return Array.from(protocolSet).sort();
  }, [cellIds, trace]);

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
      const cellProtocols = trace.getProtocols(cId);
      if (cellProtocols.length !== 1) return false;

      const repetitions = trace.getRepetitions(cId, cellProtocols[0]);
      return repetitions.length === 1;
    });
  }, [selectedCellIds, trace]);

  return (
    <div className="flex flex-col gap-10">
      {cellIds.length > 1 && (
        <div className="flex flex-col gap-2">
          Select Cell ({cellIds.length} available)
          <Select
            className="cell-select"
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
        <div className="flex flex-col gap-2">
          Select Stimulus ({allProtocols.length} available)
          <Select
            className="stimulus-select"
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
            trace={trace}
            cellId={cId}
            protocols={filteredProtocols}
            onRepetitionClick={onRepetitionClick}
            singleRecMultiCellMode={singleRecMultiCellMode}
            showCellLabel={cellIds.length > 1}
          />
        ))}
      </div>
    </div>
  );
}

function useDataWithUnit(
  cellId: string,
  protocol: string,
  recordingType: RecordingType,
  recordingIndex: number,
  repetition: string,
  sweeps: string[],
  trace: NWBTrace
): [
  data: { x: any[]; y: any[]; sweepName: string; name: string; line: { color: string } }[],
  unit: string | null,
  label: string | undefined,
] {
  return useMemo(() => {
    let deltaTime = 1;
    let dataUnit: string | null = null;
    let conversionFactor = 1;
    let dataLabel: string | undefined;

    const plotData = sweeps.map((sweep, idx) => {
      const recordingData = trace.getSweepRecordingData(
        cellId,
        protocol,
        repetition,
        sweep,
        recordingType
      )[recordingIndex];

      if (!recordingData) {
        throw new Error(`No recording data found for sweep ${sweep} at index ${recordingIndex}`);
      }

      if (idx === 0) {
        const { timeUnit, timeRate } = recordingData;

        if (timeUnit === 'seconds') {
          deltaTime = (1 / timeRate) * 1000;
        }

        dataUnit = recordingData.unit;
        conversionFactor = recordingData.conversionFactor;
        dataLabel = recordingData.label;
      }

      const name = sweep;
      const y = recordingData.data as number[]; // TODO Fix typing

      const color = colorMap[recordingType];

      return {
        name,
        y,
        mode: 'lines',
        line: {
          color,
          width: 1,
        },
        sweepName: sweep,
      };
    });

    // Downsample the data.
    const optimizedPlotData = optimizePlotData(plotData, deltaTime, {}, 100) || [];

    // Convert the data to meet the desired units.
    optimizedPlotData.forEach((d) => {
      // eslint-disable-next-line no-param-reassign
      d.y =
        dataUnit === 'amperes'
          ? convertCurrentSeries(d.y, 'pA', conversionFactor)
          : convertVoltageSeries(d.y, 'mV', conversionFactor);
    });

    return [optimizedPlotData, dataUnit, dataLabel];
  }, [cellId, protocol, recordingType, recordingIndex, repetition, sweeps, trace]);
}
