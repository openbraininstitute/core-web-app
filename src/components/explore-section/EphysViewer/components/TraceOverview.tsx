import { useMemo, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import { Select } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import startCase from 'lodash/startCase';

import NWBTrace, { RecordingType } from '../nwb-trace';
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
}: {
  trace: NWBTrace;
  protocol: string;
  repetition: string;
  recordingType: RecordingType;
}) {
  const [initialized, setInitialized] = useState(false);

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
    const optimizedPlotData = optimizePlotData(plotData, deltaTime, {}, 80) || [];

    // Convert the data to meet the desired units.
    optimizedPlotData.forEach((d) => {
      d.y =
        dataUnit === 'amperes'
          ? convertCurrentSeries(d.y, 'pA', conversionFactor)
          : convertVoltageSeries(d.y, 'mV', conversionFactor);
    });

    return [optimizedPlotData, dataUnit];
  }, [sweeps]);

  const yTitle = `${startCase(recordingType)} (${dataUnit === 'amperes' ? 'pA' : 'mV'})`;

  return (
    <Plot
      onInitialized={() => setInitialized(true)}
      data={rawData}
      onDoubleClick={() => false}
      style={{ width: '100%', height: '100%' }}
      layout={{
        shapes: [
          {
            type: 'rect',
            xref: 'paper',
            yref: 'paper',
            x0: 0,
            y0: 0,
            x1: 1,
            y1: 1,
            line: {
              color: '#808080',
              width: 1,
            },
          },
        ],
        showlegend: false,
        font: {
          size: 10,
        },
        margin: {
          l: 52,
          r: 0,
          t: 0,
          b: 42,
        },
        xaxis: {
          ticks: 'outside',
          ticklen: 6,
          tickwidth: 1,
          tickcolor: 'black',
          automargin: true,
          zeroline: false,
          title: {
            font: {
              size: 12,
            },
            text: 'Time (ms)',
          },
        },
        yaxis: {
          ticks: 'outside',
          ticklen: 4,
          tickwidth: 1,
          tickcolor: 'black',
          automargin: true,
          zeroline: false,
          title: {
            font: {
              size: 12,
            },
            text: yTitle,
          },
        },
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
  recordingType: RecordingType;
}) {
  const [ref, inView] = useInView({ threshold: 0, triggerOnce: true, rootMargin: '1200px' });

  return (
    <div ref={ref} className="aspect-4/3 relative w-full overflow-hidden last:mt-7">
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
    [trace]
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
