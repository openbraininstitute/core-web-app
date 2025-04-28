import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import { Select } from 'antd';
import { useInView } from 'react-intersection-observer';
import { LineChartOutlined } from '@ant-design/icons';
import startCase from 'lodash/startCase';
import createPlotlyComponent from 'react-plotly.js/factory';

import useResizeObserver from '@/components/explore-section/ephys-viewer/hooks/use-resize-observer';
import { useOverviewPlotConfig } from '@/components/explore-section/ephys-viewer/hooks/config-hooks';
import NWBTrace, { RecordingType } from '@/components/explore-section/ephys-viewer/nwb-trace';
import optimizePlotData from '@/util/explore-section/optimizeTrace';
import { convertCurrentSeries, convertVoltageSeries } from '@/util/explore-section/plotHelpers';

const Plot = createPlotlyComponent(Plotly);

const { Option } = Select;

interface ImageSetComponentProps {
  trace: NWBTrace;
  protocol: string;
  repetitionMap: Map<string, string[]>;
  onRepetitionClick: (stimulusType: string, rep: string) => () => void;
}

interface TraceOverviewComponentProps {
  trace: NWBTrace;
  protocol: string;
  onProtocolChange: (value: string) => void;
  onRepetitionClick: (stimulusType: string, rep: string) => () => void;
}

const colorMap = {
  stimulus: '#ff0000',
  response: '#000000',
};

function TraceThumbnail({
  trace,
  protocol,
  repetition,
  recordingType,
  plotRevision,
}: {
  trace: NWBTrace;
  protocol: string;
  repetition: string;
  recordingType: RecordingType;
  plotRevision: number;
}) {
  const sweeps = trace.getSweeps(protocol, repetition);

  const [rawData, dataUnit] = useMemo(() => {
    let deltaTime = 1;
    let dataUnit: string | null = null;
    let conversionFactor = 1;

    const plotData = sweeps.map((sweep, idx) => {
      const recordingData = trace.getSweepRecordingData(protocol, repetition, sweep, recordingType);

      if (idx === 0) {
        const { timeUnit, timeRate } = recordingData;

        if (timeUnit === 'seconds') {
          deltaTime = (1 / timeRate) * 1000;
        }

        dataUnit = recordingData.unit;
        conversionFactor = recordingData.conversionFactor;
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
      d.y =
        dataUnit === 'amperes'
          ? convertCurrentSeries(d.y, 'pA', conversionFactor)
          : convertVoltageSeries(d.y, 'mV', conversionFactor);
    });

    return [optimizedPlotData, dataUnit];
  }, [protocol, recordingType, repetition, sweeps, trace]);

  const yTitle = `${startCase(recordingType)} (${dataUnit === 'amperes' ? 'pA' : 'mV'})`;

  const { layout, config } = useOverviewPlotConfig({
    datarevision: plotRevision,
    yTitle,
    xTitle: 'Time (ms)',
  });

  return <Plot data={rawData} className="h-full w-full" layout={layout} config={config} />;
}

function TraceThumbnailContainer({
  trace,
  protocol,
  repetition,
  recordingType,
}: {
  trace: NWBTrace;
  protocol: string;
  repetition: string;
  recordingType: RecordingType;
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
    <div ref={ref} className="relative aspect-4/3 overflow-hidden bg-gray-100 last:mt-7">
      {inView ? (
        <TraceThumbnail
          plotRevision={plotRevision}
          trace={trace}
          protocol={protocol}
          repetition={repetition}
          recordingType={recordingType}
        />
      ) : null}
    </div>
  );
}

function ImageSetComponent({
  trace,
  protocol,
  repetitionMap,
  onRepetitionClick,
}: ImageSetComponentProps) {
  const repetitions = repetitionMap.get(protocol) ?? [];

  return (
    <div className="flex flex-col gap-3 divide-y divide-neutral-2">
      <div className="flex items-baseline gap-2 text-lg font-bold text-primary-9">
        {protocol}
        <small className="font-light">{`${repetitions.length} ${
          repetitions.length === 1 ? 'repetition' : 'repetitions'
        }`}</small>
      </div>

      <div className="grid gap-7 pt-5 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
        {repetitions.map((repetition) => (
          <div className="flex flex-col gap-2" key={repetition}>
            <div className="flex items-center justify-between">
              <span className="indent-10 text-lg font-light capitalize text-dark">
                {repetition}
              </span>
              <button
                className="flex items-center rounded bg-neutral-1 p-3 hover:bg-neutral-2"
                onClick={onRepetitionClick(protocol, repetition)}
                type="button"
                aria-label="Toggle selection"
              >
                <LineChartOutlined className="stroke-primary-8" />
              </button>
            </div>

            {[RecordingType.STIMULUS, RecordingType.RESPONSE].map(
              (recordingType: RecordingType) => (
                <TraceThumbnailContainer
                  key={recordingType}
                  trace={trace}
                  protocol={protocol}
                  repetition={repetition}
                  recordingType={recordingType}
                />
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TraceOverview({
  trace,
  protocol,
  onProtocolChange,
  onRepetitionClick,
}: TraceOverviewComponentProps) {
  const protocols = useMemo(() => trace.getProtocols(), [trace]);

  const repetitionMap = useMemo(
    () =>
      protocols.reduce(
        (map, protocol) => map.set(protocol, trace.getRepetitions(protocol)),
        new Map<string, string[]>()
      ),
    [protocols, trace]
  );

  const filteredProtocols = useMemo(
    () => protocols.filter((p) => p === protocol || protocol === 'All'),
    [protocols, protocol]
  );

  return (
    <div className="flex flex-col gap-10">
      {protocols.length > 1 && (
        <div className="flex flex-col gap-2">
          Select Stimulus ({protocols.length} available)
          <Select
            className="stimulus-select"
            placeholder="Select a stimulus"
            value={protocol}
            onChange={onProtocolChange}
          >
            <Option value="All">All</Option>
            {Array.from(repetitionMap.entries()).map(([protocol, repetitions]) => (
              <Option value={protocol} key={protocol}>
                {protocol} {repetitions.length > 1 && `(${repetitions.length})`}
              </Option>
            ))}
          </Select>
        </div>
      )}
      <div className="flex flex-col gap-5">
        {filteredProtocols.map((protocol) => (
          <ImageSetComponent
            key={protocol}
            trace={trace}
            protocol={protocol}
            repetitionMap={repetitionMap}
            onRepetitionClick={onRepetitionClick}
          />
        ))}
      </div>
    </div>
  );
}
