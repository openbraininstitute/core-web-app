import { useMemo, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import { Select } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';

import NWBTrace from './nwb-trace';
import { useInView } from 'react-intersection-observer';
import createPlotlyComponent from 'react-plotly.js/factory';
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
  onStimulusChange: (value: string) => void;
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
}: {
  trace: NWBTrace;
  protocol: string;
  repetition: string;
  recordingType: 'stimulus' | 'response';
}) {
  const [initialized, setInitialized] = useState(false);

  const sweeps = trace.getSweeps(protocol, repetition);

  const rawData = useMemo(() => {
    let deltaTime = 1;
    let dataUnit: string | null = null;
    let conversionFactor = 1;

    const plotData = sweeps.map((sweep, idx) => {
      const sweepData = trace.getSweepData(protocol, repetition, sweep);

      if (idx === 0) {
        const { timeUnit, timeRate } = sweepData[recordingType];

        if (timeUnit === 'seconds') {
          deltaTime = (1 / timeRate) * 1000;
          console.log('deltaTime', deltaTime);
        }

        dataUnit = sweepData[recordingType].unit;
        conversionFactor = sweepData[recordingType].conversionFactor;
      }

      const name = sweep;
      const y = sweepData[recordingType].data as number[]; // TODO Fix typing

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
    const optimizedPlotData = optimizePlotData(plotData, deltaTime, {}, 80) || [];

    // Convert the data to meet the desired units.
    optimizedPlotData.forEach((d) => {
      d.y =
        dataUnit === 'amperes'
          ? convertCurrentSeries(d.y, 'pA', conversionFactor)
          : convertVoltageSeries(d.y, 'mV', conversionFactor);
    });

    return optimizedPlotData;
  }, [sweeps]);

  return (
    <Plot
      onInitialized={() => setInitialized(true)}
      data={rawData}
      onDoubleClick={() => false}
      style={{ width: '100%', height: '100%' }}
      layout={{
        showlegend: false,
        font: {
          size: 10,
        },
        margin: {
          l: 20,
          r: 0,
          t: 0,
          b: 20,
        },
        xaxis: {
          zeroline: false,
        },
        yaxis: {
          zeroline: false,
        },
        // autosize: true,
      }}
      config={{ displaylogo: false, responsive: true, staticPlot: true }}
    />
  );
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
  recordingType: 'stimulus' | 'response';
}) {
  const [ref, inView] = useInView({ threshold: 0, triggerOnce: true, rootMargin: '1200px 0px' });

  return (
    <div ref={ref} className="relative aspect-video w-full border border-lime-400">
      {inView ? (
        <TraceThumbnail
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

            {['stimulus', 'response'].map((recordingType: string) => (
              <div className="flex items-center" key={recordingType}>
                <span className="-rotate-90 capitalize text-neutral-4">{recordingType}</span>
                {/* {imagePreview({ imageUrl: imgData.imageSrc })} */}
                <TraceThumbnailContainer
                  trace={trace}
                  protocol={protocol}
                  repetition={repetition}
                  recordingType={recordingType}
                />
                {/* <div className="h-32">test</div> */}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TraceOverview({
  trace,
  protocol,
  onStimulusChange,
  onRepetitionClick,
}: TraceOverviewComponentProps) {
  const protocols = useMemo(() => trace.getProtocols(), [trace]);

  const repetitionMap = useMemo(
    () =>
      protocols.reduce(
        (map, protocol) => map.set(protocol, trace.getRepetitions(protocol)),
        new Map<string, string[]>()
      ),
    [trace]
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
            onChange={onStimulusChange}
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
        {protocols.map((protocol) => (
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
