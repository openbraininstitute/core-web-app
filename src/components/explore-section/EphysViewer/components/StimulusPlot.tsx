import { useState, useMemo, useEffect } from 'react';
import Plotly, { PlotData } from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
import { Radio } from 'antd';
import { atomWithStorage } from 'jotai/utils';

import {
  convertCurrentSeries,
  convertVoltageSeries,
  CurrentUnit,
} from '@/util/explore-section/plotHelpers';
import optimizePlotData from '@/util/explore-section/optimizeTrace';
import useConfig from '@/components/explore-section/EphysViewer/hooks/useConfig';
import { PlotProps } from '@/types/explore-section/application';
import { ZoomRanges } from '@/types/explore-section/misc';
import { useAtom } from 'jotai';

const Plot = createPlotlyComponent(Plotly);

const DEFAULT_CURRENT_UNIT: CurrentUnit = 'pA';
const currentUnitAtom = atomWithStorage<CurrentUnit>(
  'ephysViewer.currentUnit',
  DEFAULT_CURRENT_UNIT
);

function StimulusPlot({
  reset,
  setSelectedSweeps,
  sweeps: { selectedSweeps, previewSweep, allSweeps, colorMap, sweepDataMap },
}: PlotProps) {
  const [stimulusUnit, setStimulusUnit] = useAtom(currentUnitAtom);
  const [zoomRanges, setZoomRanges] = useState<ZoomRanges | null>(null);

  useEffect(() => {
    setZoomRanges(null);
  }, [reset]);

  const { config, layout, font, style, antBreakpoints } = useConfig();

  const [rawData, dataUnit] = useMemo(() => {
    let deltaTime = 1;
    let dataUnit: string | null = null;
    let conversionFactor = 1;

    const zoom = {
      xstart: zoomRanges?.x[0],
      xend: zoomRanges?.x[1],
    };

    const allSweepsData = allSweeps.map((sweep, idx) => {
      const recordingData = sweepDataMap.get(sweep)?.stimulus;
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
      d.y =
        dataUnit === 'amperes'
          ? convertCurrentSeries(d.y, stimulusUnit, conversionFactor)
          : convertVoltageSeries(d.y, 'mV', conversionFactor);
    });

    return [optimizedPlotData, dataUnit];
  }, [zoomRanges, allSweeps, colorMap, stimulusUnit]);

  const selectedResponse: Partial<PlotData>[] = useMemo(
    () => rawData?.filter((data) => selectedSweeps.includes(data.sweepName)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedSweeps, stimulusUnit]
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
    [previewSweep]
  );

  const onChangeStimulusUnits = (event: any) => {
    setStimulusUnit(event.target.value);
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

  const yTitle = dataUnit === 'amperes' ? `Current (${stimulusUnit})` : 'Membrane potential (mV)';

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
          title: 'Stimulus',
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
          autosize: true,
          ...layout,
        }}
        style={style}
        config={{ displaylogo: false, ...config }}
      />
      {antBreakpoints.md && (
        <Radio.Group
          onChange={onChangeStimulusUnits}
          value={stimulusUnit}
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

export default StimulusPlot;
