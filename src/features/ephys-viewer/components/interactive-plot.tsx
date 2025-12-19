import { Radio } from 'antd';
import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import Plotly, { type PlotData } from 'plotly.js-dist-min';
import { useEffect, useMemo, useState } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
import { useInteractivePlotConfig } from '@/features/ephys-viewer/hooks/config-hooks';
import { RecordingType, type SweepData } from '@/features/ephys-viewer/nwb-trace';
import type { PlotProps, ZoomRanges } from '@/features/ephys-viewer/types';
import optimizePlotData from '@/util/explore-section/optimizeTrace';
import {
  type CurrentUnit,
  convertCurrentSeries,
  convertVoltageSeries,
  ensureCurrentUnit,
  type VoltageUnit,
} from '@/util/explore-section/plotHelpers';

const Plot = createPlotlyComponent(Plotly);

const DEFAULT_CURRENT_UNIT: CurrentUnit = 'pA';
const DEFAULT_VOLTAGE_UNIT: VoltageUnit = 'mV';

const currentUnitAtom = atomWithStorage<CurrentUnit>(
  'ephysViewer.currentUnit',
  DEFAULT_CURRENT_UNIT,
);

export default function InteractivePlot({
  recordingType,
  reset,
  setSelectedSweeps,
  sweeps: { selectedSweeps, previewSweep, allSweeps, colorMap, sweepDataMap },
}: PlotProps) {
  const [currentUnit, setCurrentUnit] = useAtom(currentUnitAtom);
  const [zoomRanges, setZoomRanges] = useState<ZoomRanges | null>(null);

  useEffect(() => {
    setZoomRanges(null);
  }, []);

  const { config, layout, font, style, antBreakpoints } = useInteractivePlotConfig();

  const [rawData, dataUnit] = useData(
    zoomRanges,
    allSweeps,
    sweepDataMap,
    recordingType,
    colorMap,
    currentUnit,
  );

  const selectedResponse: Partial<PlotData>[] = useMemo(
    () => rawData?.filter((data) => selectedSweeps.includes(data.sweepName)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedSweeps, rawData?.filter],
  );

  const previewDataResponse: Partial<PlotData>[] = useMemo(
    () =>
      rawData?.map((data: { sweepName: string }) => {
        const isSelected = selectedSweeps.includes(data.sweepName);
        const isPreview = data.sweepName === previewSweep;
        const opacity = isPreview || isSelected ? 1 : 0.05;

        return { ...data, opacity };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [previewSweep, rawData?.map, selectedSweeps.includes],
  );

  const onChangeStimulusUnits = (event: any) => {
    setCurrentUnit(event.target.value);
  };

  const handleClick = ({ data, curveNumber }: Readonly<Plotly.LegendClickEvent>): boolean => {
    const value: string = (data[curveNumber] as any).sweepName;
    const isSelected = selectedSweeps.includes(value);
    if (isSelected) {
      setSelectedSweeps(selectedSweeps.filter((sweep) => sweep !== value));
    } else {
      setSelectedSweeps([...selectedSweeps, value]);
    }

    return false;
  };

  const yTitle = dataUnit === 'amperes' ? `Current (${currentUnit})` : 'Membrane potential (mV)';

  const isEmptySelection = !selectedSweeps.length;
  const isEmptySelectionResponse = isEmptySelection ? rawData : selectedResponse;
  return (
    <>
      <Plot
        data={previewSweep ? previewDataResponse : isEmptySelectionResponse}
        onLegendClick={handleClick}
        onDoubleClick={() => false}
        onRelayout={(e) => {
          const {
            'xaxis.range[0]': x1,
            'xaxis.range[1]': x2,
            'yaxis.range[0]': y1,
            'yaxis.range[1]': y2,
          } = e;
          setZoomRanges({ x: [x1, x2], y: [y1, y2] });
        }}
        layout={{
          title: recordingType === RecordingType.STIMULUS ? 'Stimulus' : 'Response',
          xaxis: {
            title: {
              font,
              text: `Time (ms)`,
            },
            range: zoomRanges?.x,
          },
          yaxis: {
            title: {
              font,
              text: yTitle,
            },
            range: zoomRanges?.y,
            zeroline: false,
          },
          ...layout,
        }}
        style={style}
        config={config}
      />
      {dataUnit === 'amperes' && antBreakpoints.md && (
        <Radio.Group
          onChange={onChangeStimulusUnits}
          value={currentUnit}
          size="small"
          className="units"
        >
          <Radio.Button value={DEFAULT_CURRENT_UNIT}>{DEFAULT_CURRENT_UNIT}</Radio.Button>
          <Radio.Button value="nA">nA</Radio.Button>
        </Radio.Group>
      )}
    </>
  );
}

function useData(
  zoomRanges: ZoomRanges | null,
  allSweeps: string[],
  sweepDataMap: Map<string, SweepData>,
  recordingType: RecordingType,
  colorMap: Map<string, string>,
  currentUnit: string,
): [
  data: {
    x: any[];
    y: any[];
    sweepName: string;
    name: string;
    line: { color: string };
  }[],
  unit: string | null,
] {
  return useMemo(() => {
    let deltaTime = 1;
    let dataUnit: string | null = null;
    let conversionFactor = 1;

    const zoom = {
      xstart: zoomRanges?.x[0],
      xend: zoomRanges?.x[1],
    };

    const allSweepsData = allSweeps.map((sweep, idx) => {
      const recordingData = sweepDataMap.get(sweep)?.[recordingType];
      if (!recordingData) {
        throw new Error(`No recording data found for sweep ${sweep}`);
      }

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
      const color = colorMap.get(sweep) as string;

      return {
        name,
        y,
        line: {
          color,
        },
        sweepName: sweep,
      };
    });

    // Downsample the data.
    const optimizedPlotData = optimizePlotData(allSweepsData, deltaTime, zoom) || [];

    // Convert the data to meet the desired units.
    optimizedPlotData.forEach((d) => {
      // eslint-disable-next-line no-param-reassign
      d.y =
        dataUnit === 'amperes'
          ? convertCurrentSeries(
              d.y,
              ensureCurrentUnit(currentUnit, DEFAULT_CURRENT_UNIT),
              conversionFactor,
            )
          : convertVoltageSeries(d.y, DEFAULT_VOLTAGE_UNIT, conversionFactor);
    });

    return [optimizedPlotData, dataUnit];
  }, [zoomRanges?.x, allSweeps, sweepDataMap, recordingType, colorMap, currentUnit]);
}
