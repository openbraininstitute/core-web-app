import { Radio, Select, Spin } from 'antd';
import DistinctColors from 'distinct-colors';
import { useAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type TViewVariant, ViewVariant } from '@/constants';
import InteractivePlot, {
  currentUnitAtom,
  DEFAULT_CURRENT_UNIT,
} from '@/features/ephys-viewer/components/interactive-plot';
import OptionSelect from '@/features/ephys-viewer/components/option-select';
import SweepSelector from '@/features/ephys-viewer/components/sweep-selector';
import { DETAIL_PLOT_POINTS } from '@/features/ephys-viewer/constants';
import { useSweepSeries } from '@/features/ephys-viewer/hooks/use-sweep-series';
import {
  ephysHeadingClass,
  ephysSectionLabelClass,
  ephysSelectClass,
} from '@/features/ephys-viewer/label-styles';
import { useTraceContext } from '@/features/ephys-viewer/trace-context';
import {
  getCellIds,
  getProtocols,
  getRecordings,
  getRepetitions,
  getSweeps,
  hasCurrentRecordings,
} from '@/features/ephys-viewer/trace-index';
import useResizeObserver from '@/hooks/use-resize-observer-w-ref';
import { cn } from '@/utils/css-class';

interface TraceDetailsViewProps {
  defaultCellId?: string;
  defaultProtocol?: string;
  defaultRepetition?: string;
  variant?: TViewVariant;
}

interface CellDetailsProps {
  cellId: string;
  showCellLabel?: boolean;
  defaultProtocol?: string;
  defaultRepetition?: string;
  variant?: TViewVariant;
}

function CellDetails({
  cellId,
  showCellLabel,
  defaultProtocol,
  defaultRepetition,
  variant = ViewVariant.Light,
}: CellDetailsProps) {
  const { index } = useTraceContext();
  const [reset, setReset] = useState<boolean>(false);

  const plotContainerRef = useRef<HTMLDivElement>(null);
  const [plotRevision, setPlotRevision] = useState<number>(0);
  const updatePlots = useCallback(() => setPlotRevision((prev) => prev + 1), []);
  useResizeObserver(plotContainerRef, updatePlots);

  const protocols = useMemo(() => getProtocols(index, cellId), [index, cellId]);

  const [selectedProtocol, setSelectedDataSet] = useState<string>(defaultProtocol || protocols[0]);

  const [selectedRepetition, setSelectedRepetition] = useState<string>(
    defaultRepetition || getRepetitions(index, cellId, selectedProtocol)[0]
  );

  const [selectedSweeps, setSelectedSweeps] = useState<string[]>([]);

  const [previewItem, setPreviewItem] = useState<string>();

  const repetitions: string[] = useMemo(
    () => getRepetitions(index, cellId, selectedProtocol),
    [index, cellId, selectedProtocol]
  );

  const sweeps = useMemo(
    () => getSweeps(index, cellId, selectedProtocol, selectedRepetition),
    [index, cellId, selectedProtocol, selectedRepetition]
  );

  const colorMap = useMemo(() => {
    const colors = DistinctColors({ count: sweeps.length });
    return sweeps.reduce(
      (map, sweep, idx) => map.set(sweep, colors[idx].hex()),
      new Map<string, string>()
    );
  }, [sweeps]);

  const seriesRequest = useMemo(
    () => ({
      cellId,
      protocol: selectedProtocol,
      repetition: selectedRepetition,
      sweeps,
      desiredLength: DETAIL_PLOT_POINTS,
    }),
    [cellId, selectedProtocol, selectedRepetition, sweeps]
  );

  const { data, loading, error } = useSweepSeries(seriesRequest);

  // Later reads keep the previous series on screen, so only the very first one has nothing to
  // draw. That is the one switching into this view hits.
  const awaitingFirstSeries = loading && !data;

  const plots = useMemo(
    () =>
      index.recordingTypes.flatMap((recordingType) =>
        getRecordings(index, cellId, selectedProtocol, selectedRepetition, recordingType).map(
          (_, recordingIndex) => ({ recordingType, recordingIndex })
        )
      ),
    [index, cellId, selectedProtocol, selectedRepetition]
  );

  const hasMultipleRecordings = plots.length > 2;

  const showCurrentUnitToggle = useMemo(
    () => hasCurrentRecordings(index, cellId, selectedProtocol, selectedRepetition),
    [index, cellId, selectedProtocol, selectedRepetition]
  );

  const [currentUnit, setCurrentUnit] = useAtom(currentUnitAtom);

  const dataSetOptions = useMemo(
    () =>
      protocols.map((protocol) => {
        const repetitionNum = getRepetitions(index, cellId, protocol).length;

        return (
          <Select.Option key={protocol} value={protocol}>
            {protocol} {repetitionNum > 1 && `(${repetitionNum})`}
          </Select.Option>
        );
      }),
    [protocols, index, cellId]
  );

  const repetitionOptions = repetitions.map((v) => (
    <Select.Option key={v} value={v}>
      {v}
    </Select.Option>
  ));

  const sweepOptions = sweeps.map((sweep) => ({ label: sweep, value: sweep }));

  const handleProtocolChange = (protocol: string) => {
    setSelectedDataSet(protocol);
    setSelectedRepetition(getRepetitions(index, cellId, protocol)[0]);
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedSweeps is used to force a re-render of the plot
  useEffect(
    () => updatePlots(),
    [selectedProtocol, selectedRepetition, selectedSweeps, updatePlots]
  );

  return (
    <div className="flex flex-col gap-10">
      {showCellLabel && <div className={ephysHeadingClass(variant)}>{cellId}</div>}
      <div className="flex flex-wrap gap-8">
        <OptionSelect
          label={{ title: 'Protocol', numberOfAvailable: protocols.length }}
          options={dataSetOptions}
          value={selectedProtocol}
          onChange={handleProtocolChange}
          variant={variant}
        />
        <OptionSelect
          label={{ title: 'Repetition', numberOfAvailable: repetitions.length }}
          options={repetitionOptions}
          value={selectedRepetition}
          onChange={handleRepetitionChange}
          hideWhenSingle
          variant={variant}
        />
        <SweepSelector
          onPreviewSweep={handlePreviewSweep}
          colorMap={colorMap}
          selectedSweeps={selectedSweeps}
          previewItem={previewItem}
          setSelectedSweeps={setSelectedSweeps}
          sweepOptions={sweepOptions}
          variant={variant}
        />
        {showCurrentUnitToggle && (
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

      {error ? (
        <div className={ephysSectionLabelClass(variant)}>
          There was a problem reading this repetition
        </div>
      ) : (
        <div className="relative">
          <div
            ref={plotContainerRef}
            className={cn(
              hasMultipleRecordings
                ? 'grid grid-cols-1 gap-10 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4'
                : 'flex flex-col gap-10 2xl:flex-row',
              // How many plots there are, and how tall each one is, are both known from the
              // index — so the area is laid out before the series arrives and only dimmed while
              // it does. Swapping it for a bare spinner collapsed the page and jumped it back.
              awaitingFirstSeries && 'pointer-events-none opacity-40'
            )}
          >
            {plots.map(({ recordingType, recordingIndex }) => (
              <InteractivePlot
                key={`${recordingType}-${recordingIndex}`}
                recording={data?.[recordingType]?.[recordingIndex]}
                recordingType={recordingType}
                recordingIndex={recordingIndex}
                seriesRequest={seriesRequest}
                reset={reset}
                selectedSweeps={selectedSweeps}
                setSelectedSweeps={setSelectedSweeps}
                previewSweep={previewItem}
                colorMap={colorMap}
                plotRevision={plotRevision}
              />
            ))}
          </div>

          {awaitingFirstSeries && (
            // Centred within the first 70vh rather than over the whole area, which runs several
            // screens long once a repetition has more than two recordings.
            <div className="absolute inset-x-0 top-0 flex h-full max-h-[70vh] items-center justify-center">
              <Spin />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TraceDetailsView({
  defaultCellId,
  defaultProtocol,
  defaultRepetition,
  variant = ViewVariant.Light,
}: TraceDetailsViewProps) {
  const { index } = useTraceContext();

  const cellIds = useMemo(() => getCellIds(index), [index]);
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
          <div className={ephysSectionLabelClass(variant)}>
            Select cell ({cellIds.length} available)
          </div>
          <Select
            className={ephysSelectClass(variant, 'cell-select w-48')}
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
            cellId={cellId}
            showCellLabel={cellIds.length > 1}
            defaultProtocol={defaultProtocol}
            defaultRepetition={defaultRepetition}
            variant={variant}
          />
        ))}
      </div>
    </div>
  );
}

export default TraceDetailsView;
