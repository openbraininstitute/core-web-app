import { useState, useMemo } from 'react';
import { Select } from 'antd';
import DistinctColors from 'distinct-colors';

import StimulusPlot from './StimulusPlot';
import ResponsePlot from './ResponsePlot';
import OptionSelect from '@/components/explore-section/EphysViewerContainer/OptionSelect';
import SweepSelector from '@/components/explore-section/EphysViewerContainer/SweepSelector';
import NWBTrace from './nwb-trace';

interface EphysPlotProps {
  trace: NWBTrace;
  defaultProtocol?: string;
  defaultRepetition?: string;
}

function TraceDetailsView({ trace, defaultProtocol, defaultRepetition }: EphysPlotProps) {
  const [reset, setReset] = useState<boolean>(false);

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
    [selectedProtocol]
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
  }, [repetitions, selectedProtocol, selectedRepetition]);

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
      <div className="flex flex-col gap-10 2xl:flex-row">
        <StimulusPlot reset={reset} setSelectedSweeps={setSelectedSweeps} sweeps={sweepObject} />
        <ResponsePlot reset={reset} setSelectedSweeps={setSelectedSweeps} sweeps={sweepObject} />
      </div>
    </div>
  );
}

export default TraceDetailsView;
