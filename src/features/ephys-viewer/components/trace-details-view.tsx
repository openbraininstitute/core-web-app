import { Radio, Select } from 'antd';
import DistinctColors from 'distinct-colors';
import { useAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import InteractivePlot, {
  currentUnitAtom,
  DEFAULT_CURRENT_UNIT,
} from '@/features/ephys-viewer/components/interactive-plot';
import OptionSelect from '@/features/ephys-viewer/components/option-select';
import SweepSelector from '@/features/ephys-viewer/components/sweep-selector';
import { RecordingType, type SweepData } from '@/features/ephys-viewer/nwb-trace';
import useResizeObserver from '@/hooks/use-resize-observer-w-ref';

import type NWBTrace from '@/features/ephys-viewer/nwb-trace';

interface TraceDetailsViewProps {
  trace: NWBTrace;
  defaultCellId?: string;
  defaultProtocol?: string;
  defaultRepetition?: string;
}

interface CellDetailsProps {
  trace: NWBTrace;
  cellId: string;
  showCellLabel?: boolean;
  defaultProtocol?: string;
  defaultRepetition?: string;
}

function CellDetails({ trace, cellId, showCellLabel, defaultProtocol, defaultRepetition }: CellDetailsProps) {
  const [reset, setReset] = useState<boolean>(false);

  const plotContainerRef = useRef<HTMLDivElement>(null);
  const [plotRevision, setPlotRevision] = useState<number>(0);
  const updatePlots = useCallback(() => setPlotRevision((prev) => prev + 1), []);
  useResizeObserver(plotContainerRef, updatePlots);

  const [selectedProtocol, setSelectedDataSet] = useState<string>(
    defaultProtocol || trace.getProtocols(cellId)[0]
  );

  const [selectedRepetition, setSelectedRepetition] = useState<string>(
    defaultRepetition || trace.getRepetitions(cellId, selectedProtocol)[0]
  );

  const [selectedSweeps, setSelectedSweeps] = useState<string[]>([]);

  const [previewItem, setPreviewItem] = useState<string>();

  const repetitions: string[] = useMemo(
    () => trace.getRepetitions(cellId, selectedProtocol),
    [cellId, selectedProtocol, trace]
  );

  const { sweeps, sweepDataMap, colorMap } = useSweeps(
    trace,
    cellId,
    selectedProtocol,
    selectedRepetition
  );

  const recordingCounts = useMemo(() => {
    const firstSweepData = sweepDataMap.values().next().value;
    return {
      stimulus: firstSweepData?.stimulus?.length ?? 0,
      response: firstSweepData?.response?.length ?? 0,
    };
  }, [sweepDataMap]);

  const hasMultipleRecordings = recordingCounts.stimulus > 1 || recordingCounts.response > 1;

  const hasCurrentRecordings = useMemo(() => {
    const firstSweepData = sweepDataMap.values().next().value;
    if (!firstSweepData) return false;
    return [...(firstSweepData.stimulus ?? []), ...(firstSweepData.response ?? [])].some(
      (r) => r.unit === 'amperes'
    );
  }, [sweepDataMap]);

  const [currentUnit, setCurrentUnit] = useAtom(currentUnitAtom);

  const dataSetOptions = trace.getProtocols(cellId).map((protocol) => {
    const repetitionNum = trace.getRepetitions(cellId, protocol).length;

    return (
      <Select.Option key={protocol} value={protocol}>
        {protocol} {repetitionNum > 1 && `(${repetitionNum})`}
      </Select.Option>
    );
  });

  const repetitionOptions = repetitions.map((v) => (
    <Select.Option key={v} value={v}>
      {v}
    </Select.Option>
  ));

  const sweepOptions = sweeps ? sweeps.map((sweep) => ({ label: sweep, value: sweep })) : [];

  const handleProtocolChange = (protocol: string) => {
    setSelectedDataSet(protocol);
    setSelectedRepetition(trace.getRepetitions(cellId, protocol)[0]);
    setSelectedSweeps([]);
    setReset(!reset);
  };

  const handlePreviewSweep = (value?: string) => {
    if (!value) {
      setPreviewItem(undefined);
    } else if (sweepOptions.length > 1 && !selectedSweeps.includes(value)) {
      setPreviewItem(value);
    }
  };

  const handleRepetitionChange = (value: string) => {
    setSelectedRepetition(value);
    setSelectedSweeps([]);
    setReset(!reset);
  };

  const sweepObject = useMemo(
    () => ({
      selectedSweeps,
      colorMap,
      sweepDataMap,
      allSweeps: sweeps,
      previewSweep: previewItem,
      plotRevision, // This is used to force a re-render of the plot
    }),
    [selectedSweeps, previewItem, sweeps, colorMap, sweepDataMap, plotRevision]
  );

  useEffect(
    () => updatePlots(),
    [selectedProtocol, selectedRepetition, selectedSweeps, updatePlots]
  );

  return (
    <div className="flex flex-col gap-10">
      {showCellLabel && <div className="text-primary-9 text-xl font-bold">{cellId}</div>}
      <div className="flex flex-wrap gap-8">
        <OptionSelect
          label={{ title: 'Protocol', numberOfAvailable: trace.getProtocols(cellId).length }}
          options={dataSetOptions}
          value={selectedProtocol}
          onChange={handleProtocolChange}
        />
        <OptionSelect
          label={{ title: 'Repetition', numberOfAvailable: Object.keys(repetitions).length }}
          options={repetitionOptions}
          value={selectedRepetition}
          onChange={handleRepetitionChange}
          hideWhenSingle
        />
        <SweepSelector
          onPreviewSweep={handlePreviewSweep}
          colorMap={colorMap}
          selectedSweeps={selectedSweeps}
          previewItem={previewItem}
          setSelectedSweeps={setSelectedSweeps}
          sweepOptions={sweepOptions}
        />
        {hasCurrentRecordings && (
          <Radio.Group
            onChange={(e) => setCurrentUnit(e.target.value)}
            value={currentUnit}
            size="small"
            className="ml-auto self-center"
          >
            <Radio.Button value={DEFAULT_CURRENT_UNIT}>{DEFAULT_CURRENT_UNIT}</Radio.Button>
            <Radio.Button value="nA">nA</Radio.Button>
          </Radio.Group>
        )}
      </div>
      <div
        ref={plotContainerRef}
        className={
          hasMultipleRecordings
            ? 'grid grid-cols-1 gap-10 md:grid-cols-2 4xl:grid-cols-4'
            : 'flex flex-col gap-10 2xl:flex-row'
        }
      >
        {hasMultipleRecordings ? (
          <>
            {trace.recordingTypes.includes(RecordingType.STIMULUS) &&
              Array.from({ length: recordingCounts.stimulus }, (_, i) => (
                <InteractivePlot
                  key={`stimulus-${i}`}
                  recordingType={RecordingType.STIMULUS}
                  recordingIndex={i}
                  reset={reset}
                  setSelectedSweeps={setSelectedSweeps}
                  sweeps={sweepObject}
                />
              ))}
            {trace.recordingTypes.includes(RecordingType.RESPONSE) &&
              Array.from({ length: recordingCounts.response }, (_, i) => (
                <InteractivePlot
                  key={`response-${i}`}
                  recordingType={RecordingType.RESPONSE}
                  recordingIndex={i}
                  reset={reset}
                  setSelectedSweeps={setSelectedSweeps}
                  sweeps={sweepObject}
                />
              ))}
          </>
        ) : (
          <>
            {trace.recordingTypes.includes(RecordingType.STIMULUS) && (
              <InteractivePlot
                recordingType={RecordingType.STIMULUS}
                recordingIndex={0}
                reset={reset}
                setSelectedSweeps={setSelectedSweeps}
                sweeps={sweepObject}
              />
            )}
            {trace.recordingTypes.includes(RecordingType.RESPONSE) && (
              <InteractivePlot
                recordingType={RecordingType.RESPONSE}
                recordingIndex={0}
                reset={reset}
                setSelectedSweeps={setSelectedSweeps}
                sweeps={sweepObject}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TraceDetailsView({
  trace,
  defaultCellId,
  defaultProtocol,
  defaultRepetition,
}: TraceDetailsViewProps) {
  const cellIds = useMemo(() => trace.getCellIds(), [trace]);
  const [selectedCellId, setSelectedCellId] = useState<string>(
    defaultCellId || cellIds[0] || 'All'
  );

  const selectedCellIds = useMemo(
    () => cellIds.filter((cId: string) => cId === selectedCellId || selectedCellId === 'All'),
    [cellIds, selectedCellId]
  );

  return (
    <div className="flex flex-col gap-10">
      {cellIds.length > 1 && (
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium">Select Cell ({cellIds.length} available)</div>
          <Select
            className="cell-select w-48"
            placeholder="Select a cell"
            value={selectedCellId}
            onChange={setSelectedCellId}
          >
            <Select.Option value="All">All Cells</Select.Option>
            {cellIds.map((cId: string) => (
              <Select.Option value={cId} key={cId}>
                {cId}
              </Select.Option>
            ))}
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-16">
        {selectedCellIds.map((cellId: string) => (
          <CellDetails
            key={cellId}
            trace={trace}
            cellId={cellId}
            showCellLabel={cellIds.length > 1}
            defaultProtocol={defaultProtocol}
            defaultRepetition={defaultRepetition}
          />
        ))}
      </div>
    </div>
  );
}

export default TraceDetailsView;

function useSweeps(
  trace: NWBTrace,
  cellId: string,
  selectedProtocol: string,
  selectedRepetition: string
): { sweeps: string[]; sweepDataMap: Map<string, SweepData>; colorMap: Map<string, string> } {
  return useMemo(() => {
    const sweeps: string[] = trace.getSweeps(cellId, selectedProtocol, selectedRepetition);
    const colors = DistinctColors({ count: sweeps.length });

    const colorMap = sweeps.reduce(
      (map, sweep, idx) => map.set(sweep, colors[idx].hex()),
      new Map<string, string>()
    );

    const sweepDataMap = sweeps.reduce(
      (map, sweep) =>
        map.set(sweep, trace.getSweepData(cellId, selectedProtocol, selectedRepetition, sweep)),
      new Map<string, SweepData>()
    );

    return { sweeps, sweepDataMap, colorMap };
  }, [cellId, selectedProtocol, selectedRepetition, trace]);
}
