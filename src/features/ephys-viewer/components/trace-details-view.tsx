import { Spin } from 'antd';
import DistinctColors from 'distinct-colors';
import { useAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type TViewVariant, ViewVariant } from '@/constants';
import { EphysSelect } from '@/features/ephys-viewer/components/ephys-select';
import InteractivePlot, {
  currentUnitAtom,
  DEFAULT_CURRENT_UNIT,
} from '@/features/ephys-viewer/components/interactive-plot';
import OptionSelect from '@/features/ephys-viewer/components/option-select';
import SweepSelector from '@/features/ephys-viewer/components/sweep-selector';
import { DETAIL_PLOT_POINTS } from '@/features/ephys-viewer/constants';
import { useSweepSeries } from '@/features/ephys-viewer/hooks/use-sweep-series';
import { ephysHeadingClass, ephysSectionLabelClass } from '@/features/ephys-viewer/label-styles';
import { useTraceContext } from '@/features/ephys-viewer/trace-context';
import {
  getCellIds,
  getProtocols,
  getRecordingSlots,
  getRepetitions,
  getSweeps,
  hasCurrentRecordings,
  isMultiRecordingLayout,
} from '@/features/ephys-viewer/trace-index';
import useResizeObserver from '@/hooks/use-resize-observer-w-ref';
import { MotionTabs, MotionTabsList, MotionTabsTrigger } from '@/ui/molecules/motion-tabs';
import { ensureCurrentUnit } from '@/util/explore-section/plotHelpers';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { TEphysControlsVariant } from '@/features/ephys-viewer/components/option-select';

interface TraceDetailsViewProps {
  defaultCellId?: string;
  defaultProtocol?: string;
  defaultRepetition?: string;
  variant?: TViewVariant;
  /**
   * Host-supplied controls, rendered at the head of the Protocol / Repetition / Sweep row.
   *
   * A host that decides *which* trace is loaded — the e-feature editor picks one of the
   * recordings being extracted — has a control that belongs beside these, not stacked above
   * them in a second row of its own. Rendered once, against the first cell, so a multi-cell
   * trace does not repeat it.
   */
  leadingControls?: ReactNode;
  controlsVariant?: TEphysControlsVariant;
}

interface CellDetailsProps {
  cellId: string;
  showCellLabel?: boolean;
  defaultProtocol?: string;
  defaultRepetition?: string;
  variant?: TViewVariant;
  leadingControls?: ReactNode;
  controlsVariant?: TEphysControlsVariant;
}

function CellDetails({
  cellId,
  showCellLabel,
  defaultProtocol,
  defaultRepetition,
  variant = ViewVariant.Light,
  leadingControls,
  controlsVariant = 'page',
}: CellDetailsProps) {
  const { index } = useTraceContext();
  const [reset, setReset] = useState<boolean>(false);

  const plotContainerRef = useRef<HTMLDivElement>(null);
  const [plotRevision, setPlotRevision] = useState<number>(0);
  const updatePlots = useCallback(() => setPlotRevision((prev) => prev + 1), []);
  useResizeObserver(plotContainerRef, updatePlots);

  const protocols = useMemo(() => getProtocols(index, cellId), [index, cellId]);

  const [selectedProtocol, setSelectedDataSet] = useState<string>(() => {
    const match =
      defaultProtocol &&
      protocols.find((name) => name.toLowerCase() === defaultProtocol.toLowerCase());
    return match || protocols[0];
  });

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
    () => getRecordingSlots(index, cellId, selectedProtocol, selectedRepetition),
    [index, cellId, selectedProtocol, selectedRepetition]
  );

  const hasMultipleRecordings = isMultiRecordingLayout(plots);

  const showCurrentUnitToggle = useMemo(
    () => hasCurrentRecordings(index, cellId, selectedProtocol, selectedRepetition),
    [index, cellId, selectedProtocol, selectedRepetition]
  );

  const [currentUnit, setCurrentUnit] = useAtom(currentUnitAtom);

  const dataSetOptions = useMemo(
    () =>
      protocols.map((protocol) => {
        const repetitionNum = getRepetitions(index, cellId, protocol).length;

        return {
          value: protocol,
          label: repetitionNum > 1 ? `${protocol} (${repetitionNum})` : protocol,
        };
      }),
    [protocols, index, cellId]
  );

  const repetitionOptions = repetitions.map((v) => ({ value: v, label: v }));

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

  const isPanel = controlsVariant === 'panel';

  const protocolSelect = (
    <OptionSelect
      label={{ title: 'Protocol', numberOfAvailable: protocols.length }}
      items={dataSetOptions}
      value={selectedProtocol}
      onChange={handleProtocolChange}
      variant={variant}
      fluid={isPanel}
    />
  );

  const repetitionSelect = (
    <OptionSelect
      label={{ title: 'Repetition', numberOfAvailable: repetitions.length }}
      items={repetitionOptions}
      value={selectedRepetition}
      onChange={handleRepetitionChange}
      hideWhenSingle
      variant={variant}
      fluid={isPanel}
    />
  );

  const sweepSelector = (
    <SweepSelector
      onPreviewSweep={handlePreviewSweep}
      colorMap={colorMap}
      selectedSweeps={selectedSweeps}
      previewItem={previewItem}
      setSelectedSweeps={setSelectedSweeps}
      sweepOptions={sweepOptions}
      variant={variant}
    />
  );

  const currentUnitToggle = showCurrentUnitToggle ? (
    <MotionTabs
      value={currentUnit}
      onValueChange={(next) => setCurrentUnit(ensureCurrentUnit(next, DEFAULT_CURRENT_UNIT))}
      variant="segment"
      className="ml-auto mt-9.5 self-start shrink-0"
    >
      <MotionTabsList className="w-auto">
        <MotionTabsTrigger value={DEFAULT_CURRENT_UNIT}>{DEFAULT_CURRENT_UNIT}</MotionTabsTrigger>
        <MotionTabsTrigger value="nA">nA</MotionTabsTrigger>
      </MotionTabsList>
    </MotionTabs>
  ) : null;

  return (
    <div className="flex flex-col gap-10">
      {showCellLabel && <div className={ephysHeadingClass(variant)}>{cellId}</div>}
      {isPanel ? (
        <div className="flex flex-col gap-5">
          <div className="grid auto-cols-fr grid-flow-col items-end gap-3">
            {leadingControls}
            {protocolSelect}
            {repetitionSelect}
          </div>
          <div className="flex flex-nowrap items-start gap-6">
            {sweepSelector}
            {currentUnitToggle}
          </div>
        </div>
      ) : (
        <div className="flex flex-nowrap items-start gap-8">
          {leadingControls}
          {protocolSelect}
          {repetitionSelect}
          {sweepSelector}
          {currentUnitToggle}
        </div>
      )}

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
                ? 'grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4'
                : 'flex flex-col gap-5 2xl:flex-row',
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
  leadingControls,
  controlsVariant = 'page',
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
          <EphysSelect
            className="cell-select w-48"
            placeholder="Select a cell"
            value={selectedCellId}
            onChange={setSelectedCellId}
            variant={variant}
            items={[
              { value: 'All', label: 'All Cells' },
              ...cellIds.map((cId: string) => ({ value: cId, label: cId })),
            ]}
          />
        </div>
      )}

      <div className="flex flex-col gap-16">
        {selectedCellIds.map((cellId: string, cellIndex: number) => (
          <CellDetails
            key={`${cellId}:${defaultProtocol ?? ''}`}
            cellId={cellId}
            showCellLabel={cellIds.length > 1}
            defaultProtocol={defaultProtocol}
            defaultRepetition={defaultRepetition}
            variant={variant}
            leadingControls={cellIndex === 0 ? leadingControls : undefined}
            controlsVariant={controlsVariant}
          />
        ))}
      </div>
    </div>
  );
}

export default TraceDetailsView;
