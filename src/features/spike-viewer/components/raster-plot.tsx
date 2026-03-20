'use client';

import { Checkbox, Empty } from 'antd';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';

import type { Layout, PlotData } from 'plotly.js-dist-min';
import type { SpikeData, SpikePopulation } from '@/features/spike-viewer/spike-trace';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Color palette for different populations
const POPULATION_COLORS = [
  '#1f77b4', // blue
  '#d62728', // red
  '#2ca02c', // green
  '#ff7f0e', // orange
  '#9467bd', // purple
  '#8c564b', // brown
  '#e377c2', // pink
  '#7f7f7f', // gray
  '#bcbd22', // olive
  '#17becf', // cyan
];

type RasterPlotProps = {
  data: SpikeData;
};

export default function RasterPlot({ data }: RasterPlotProps) {
  const [selectedPopulations, setSelectedPopulations] = useState<Set<string>>(
    new Set(data.populations.map((p) => p.name))
  );

  const togglePopulation = (name: string, checked: boolean) => {
    setSelectedPopulations((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(name);
      } else {
        next.delete(name);
      }
      return next;
    });
  };

  // Get unique node IDs for y-axis ticks when there are few neurons
  const uniqueNodeIds = useMemo(() => {
    const allNodeIds = new Set<number>();
    data.populations
      .filter((pop) => selectedPopulations.has(pop.name))
      .forEach((pop) => pop.nodeIds.forEach((id) => allNodeIds.add(id)));
    return Array.from(allNodeIds).sort((a, b) => a - b);
  }, [data.populations, selectedPopulations]);

  const showIndividualTicks = uniqueNodeIds.length <= 50;
  const usePointsMode = uniqueNodeIds.length > 20;

  // Check if there are any spikes to display
  const totalSpikes = useMemo(() => {
    return data.populations
      .filter((pop) => selectedPopulations.has(pop.name))
      .reduce((sum, pop) => sum + pop.timestamps.length, 0);
  }, [data.populations, selectedPopulations]);

  const plotData: PlotData[] = useMemo(() => {
    return data.populations
      .filter((pop) => selectedPopulations.has(pop.name))
      .map((pop, idx) => createRasterTrace(pop, idx, usePointsMode));
  }, [data.populations, selectedPopulations, usePointsMode]);

  // Calculate appropriate y-axis padding based on node ID range
  const nodeRange = data.nodeIdRange.max - data.nodeIdRange.min;
  // For single neuron or small range, use fixed padding; otherwise scale with range
  const yPadding = nodeRange === 0 ? 1 : Math.max(1, nodeRange * 0.05);

  // Round end time to a nice multiple if close
  const roundedEndTime = useMemo(() => {
    const maxTime = data.timeRange.max;
    const niceMultiples = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
    for (const mult of niceMultiples) {
      const rounded = Math.ceil(maxTime / mult) * mult;
      // Use rounded value if within 10% of actual max
      if (rounded >= maxTime && rounded <= maxTime * 1.1) {
        return rounded;
      }
    }
    return maxTime;
  }, [data.timeRange.max]);

  // Generate nice tick values including 0 and the end time
  const xTickVals = useMemo(() => {
    const ticks: number[] = [0];
    // Determine a nice tick interval
    const intervals = [10, 20, 25, 50, 100, 200, 250, 500, 1000];
    const targetTicks = 5;
    const idealInterval = roundedEndTime / targetTicks;
    const interval = intervals.find((i) => i >= idealInterval) ?? intervals[intervals.length - 1];

    for (let t = interval; t < roundedEndTime; t += interval) {
      ticks.push(t);
    }
    ticks.push(roundedEndTime);
    return ticks;
  }, [roundedEndTime]);

  const layout: Partial<Layout> = useMemo(
    () => ({
      xaxis: {
        title: { text: 'time (ms)', standoff: 10 },
        range: [0, roundedEndTime],
        showgrid: true,
        gridcolor: '#e8e8e8',
        gridwidth: 1,
        showline: true,
        linecolor: '#888',
        linewidth: 1,
        zeroline: false,
        tickmode: 'array',
        tickvals: xTickVals,
      },
      yaxis: {
        title: { text: 'Neuron ID', standoff: 10 },
        range: [data.nodeIdRange.min - 2, data.nodeIdRange.max + yPadding],
        showgrid: true,
        gridcolor: '#e8e8e8',
        gridwidth: 1,
        tickmode: showIndividualTicks ? 'array' : 'auto',
        tickvals: showIndividualTicks ? uniqueNodeIds : undefined,
        ticktext: showIndividualTicks ? uniqueNodeIds.map(String) : undefined,
        showline: false,
        zeroline: false,
      },
      showlegend: true,
      legend: {
        orientation: 'h',
        y: -0.15,
      },
      hovermode: 'closest',
      autosize: true,
      margin: { t: 50, b: 80, l: 70, r: 20 },
      plot_bgcolor: 'white',
      paper_bgcolor: 'white',
    }),
    [data, yPadding, showIndividualTicks, uniqueNodeIds, roundedEndTime, xTickVals]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap gap-4">
        {data.populations.map((pop, idx) => (
          <Checkbox
            key={pop.name}
            checked={selectedPopulations.has(pop.name)}
            onChange={(e) => togglePopulation(pop.name, e.target.checked)}
          >
            <span style={{ color: POPULATION_COLORS[idx % POPULATION_COLORS.length] }}>
              {pop.name} ({pop.timestamps.length} spikes)
            </span>
          </Checkbox>
        ))}
      </div>
      {totalSpikes === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <Empty description="No spikes recorded during this simulation" />
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <Plot
            data={plotData}
            layout={layout}
            config={{ responsive: true, displayModeBar: true }}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler
          />
        </div>
      )}
    </div>
  );
}

/**
 * Creates a raster plot trace where each spike is a vertical tick mark.
 * Uses 'markers' mode with 'line-ns' symbol to create vertical lines,
 * or simple circle points when there are many neurons.
 */
function createRasterTrace(pop: SpikePopulation, colorIndex: number, usePoints: boolean): PlotData {
  const color = POPULATION_COLORS[colorIndex % POPULATION_COLORS.length];

  return {
    x: pop.timestamps,
    y: pop.nodeIds,
    mode: 'markers',
    type: 'scattergl',
    name: pop.name,
    marker: usePoints
      ? {
          size: 3,
          color,
        }
      : {
          size: 8,
          color,
          symbol: 'line-ns',
          line: {
            width: 1.5,
            color,
          },
        },
    hovertemplate: `Neuron: %{y}<br>Time: %{x:.2f} ms<extra>${pop.name}</extra>`,
  } as PlotData;
}
