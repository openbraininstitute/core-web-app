import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Select } from 'antd';
import DistinctColors from 'distinct-colors';

import NWBTrace, { RecordingType, SweepData } from '@/features/ephys-viewer/nwb-trace';
import useResizeObserver from '@/features/ephys-viewer/hooks/use-resize-observer';
import InteractivePlot from '@/features/ephys-viewer/components/interactive-plot';
import OptionSelect from '@/features/ephys-viewer/components/option-select';
import SweepSelector from '@/features/ephys-viewer/components/sweep-selector';

interface EphysPlotProps {
  trace: NWBTrace;
  defaultProtocol?: string;
  defaultRepetition?: string;
}

function TraceDetailsView({ trace, defaultProtocol, defaultRepetition }: EphysPlotProps) {
  const [reset, setReset] = useState<boolean>(false);

  const plotContainerRef = useRef<HTMLDivElement>(null);
  const [plotRevision, setPlotRevision] = useState<number>(0);
  const updatePlots = useCallback(() => setPlotRevision((prev) => prev + 1), []);
  useResizeObserver(plotContainerRef, updatePlots);

  const [selectedProtocol, setSelectedDataSet] = useState<string>(
    defaultProtocol || trace.getProtocols()[0]
  );

  const [selectedRepetition, setSelectedRepetition] = useState<string>(
    defaultRepetition || trace.getRepetitions(selectedProtocol)[0]
  );

  const [selectedSweeps, setSelectedSweeps] = useState<string[]>([]);

  const [previewItem, setPreviewItem] = useState<string>();

  const repetitions: string[] = useMemo(
    () => trace.getRepetitions(selectedProtocol),
    [selectedProtocol, trace]
  );

  const { sweeps, sweepDataMap, colorMap } = useSweeps(trace, selectedProtocol, selectedRepetition);

  const dataSetOptions = trace.getProtocols().map((protocol) => {
    const repetitionNum = trace.getRepetitions(protocol).length;

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
    setSelectedRepetition(trace.getRepetitions(protocol)[0]);
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
      <div className="flex flex-wrap gap-8">
        <OptionSelect
          label={{ title: 'Protocol', numberOfAvailable: trace.getProtocols().length }}
          options={dataSetOptions}
          value={selectedProtocol}
          handleChange={handleProtocolChange}
        />
        <OptionSelect
          label={{ title: 'Repetition', numberOfAvailable: Object.keys(repetitions).length }}
          options={repetitionOptions}
          value={selectedRepetition}
          handleChange={handleRepetitionChange}
          hideWhenSingle
        />
        <SweepSelector
          handlePreviewSweep={handlePreviewSweep}
          colorMap={colorMap}
          selectedSweeps={selectedSweeps}
          previewItem={previewItem}
          setSelectedSweeps={setSelectedSweeps}
          sweepOptions={sweepOptions}
        />
        {sweeps.length > 1 && (
          <button
            type="button"
            className="bg-transparant text-dark h-[32px] self-end"
            onClick={() => {
              setReset(!reset);
              setSelectedSweeps([]);
            }}
          >
            Reset
          </button>
        )}
      </div>
      <div ref={plotContainerRef} className="flex flex-col gap-10 2xl:flex-row">
        {trace.recordingTypes.includes(RecordingType.STIMULUS) && (
          <InteractivePlot
            recordingType={RecordingType.STIMULUS}
            reset={reset}
            setSelectedSweeps={setSelectedSweeps}
            sweeps={sweepObject}
          />
        )}

        {trace.recordingTypes.includes(RecordingType.RESPONSE) && (
          <InteractivePlot
            recordingType={RecordingType.RESPONSE}
            reset={reset}
            setSelectedSweeps={setSelectedSweeps}
            sweeps={sweepObject}
          />
        )}
      </div>
    </div>
  );
}

export default TraceDetailsView;

function useSweeps(
  trace: NWBTrace,
  selectedProtocol: string,
  selectedRepetition: string
): { sweeps: string[]; sweepDataMap: Map<string, SweepData>; colorMap: Map<string, string> } {
  return useMemo(() => {
    const sweeps: string[] = trace.getSweeps(selectedProtocol, selectedRepetition);
    const colors = DistinctColors({ count: sweeps.length });

    const colorMap = sweeps.reduce(
      (map, sweep, idx) => map.set(sweep, colors[idx].hex()),
      new Map<string, string>()
    );

    const sweepDataMap = sweeps.reduce(
      (map, sweep) =>
        map.set(sweep, trace.getSweepData(selectedProtocol, selectedRepetition, sweep)),
      new Map<string, SweepData>()
    );

    return { sweeps, sweepDataMap, colorMap };
  }, [selectedProtocol, selectedRepetition, trace]);
}
