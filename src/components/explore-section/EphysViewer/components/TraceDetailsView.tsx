import { useState, useMemo, useRef, useCallback } from 'react';
import { Select } from 'antd';
import DistinctColors from 'distinct-colors';

import NWBTrace, { RecordingType } from '../nwb-trace';
import useResizeObserver from '../hooks/use-resize-observer';
import InteractivePlot from './InteractivePlot';
import OptionSelect from '@/components/explore-section/EphysViewer/components/OptionSelect';
import SweepSelector from '@/components/explore-section/EphysViewer/components/SweepSelector';

interface EphysPlotProps {
  trace: NWBTrace;
  defaultProtocol?: string;
  defaultRepetition?: string;
}

function TraceDetailsView({ trace, defaultProtocol, defaultRepetition }: EphysPlotProps) {
  const [reset, setReset] = useState<boolean>(false);

  const plotContainerRef = useRef<HTMLDivElement>(null);
  const [plotRevision, setPlotRevision] = useState<number>(0);
  const onResize = useCallback(() => setPlotRevision((prev) => prev + 1), []);
  useResizeObserver(plotContainerRef, onResize);

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

  const { sweeps, sweepDataMap, colorMap } = useMemo(() => {
    const sweeps: string[] = trace.getSweeps(selectedProtocol, selectedRepetition);
    const colors = DistinctColors({ count: sweeps.length });

    const colorMap = sweeps.reduce(
      (map, sweep, idx) => map.set(sweep, colors[idx].hex()),
      new Map()
    );

    const sweepDataMap = sweeps.reduce(
      (map, sweep) =>
        map.set(sweep, trace.getSweepData(selectedProtocol, selectedRepetition, sweep)),
      new Map()
    );

    return { sweeps, sweepDataMap, colorMap };
  }, [selectedProtocol, selectedRepetition, trace]);

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

  const sweepObject = {
    selectedSweeps,
    colorMap,
    sweepDataMap,
    allSweeps: sweeps,
    previewSweep: previewItem,
  };

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
            className="bg-transparant h-[32px] self-end text-dark"
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
        <InteractivePlot
          recordingType={RecordingType.STIMULUS}
          reset={reset}
          setSelectedSweeps={setSelectedSweeps}
          sweeps={sweepObject}
          plotRevision={plotRevision}
        />
        <InteractivePlot
          recordingType={RecordingType.RESPONSE}
          reset={reset}
          setSelectedSweeps={setSelectedSweeps}
          sweeps={sweepObject}
          plotRevision={plotRevision}
        />
      </div>
    </div>
  );
}

export default TraceDetailsView;
