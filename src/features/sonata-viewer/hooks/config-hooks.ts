import useBreakpoint from 'antd/lib/grid/hooks/useBreakpoint';

import type { Config, Font, Layout } from 'plotly.js-dist-min';
import type { CSSProperties } from 'react';

interface UseConfigResponse {
  layout: Partial<Layout>;
  config: Partial<Config>;
  antBreakpoints?: ReturnType<typeof useBreakpoint>;
  font?: Partial<Font>;
  style?: CSSProperties;
}

export const useInteractivePlotConfig = (
  units: string,
  variableName?: string
): UseConfigResponse => {
  const antBreakpoints = useBreakpoint();

  return {
    antBreakpoints,
    config: {
      displayModeBar: antBreakpoints.md,
      responsive: true,
      displaylogo: false,
    },
    layout: {
      autosize: true,
      showlegend: false,
      margin: antBreakpoints.md ? { l: 55, r: 0, t: 30, b: 50 } : { l: 45, r: 0, t: 20, b: 35 },
      xaxis: {
        title: { text: 'Time (ms)' },
        zeroline: false,
      },
      yaxis: {
        title: {
          text: `${variableName ?? getUnitLabel(units)} (${units})`,
          standoff: 12,
        },
        zeroline: false,
        automargin: true,
        exponentformat: 'e',
      },
    },
    font: antBreakpoints.md ? {} : { size: 12 },
    style: {
      width: '100%',
      height: '40vh',
    },
  };
};

export const useOverviewPlotConfig = ({
  datarevision,
  units,
  variableName,
}: {
  datarevision: number;
  units: string;
  variableName?: string;
}): UseConfigResponse => {
  return {
    layout: {
      datarevision,
      autosize: true,
      shapes: [
        {
          type: 'rect',
          xref: 'paper',
          yref: 'paper',
          x0: 0,
          y0: 0,
          x1: 1,
          y1: 1,
          line: { color: '#808080', width: 1 },
        },
      ],
      showlegend: false,
      font: { size: 10 },
      margin: { l: 52, r: 0, t: 0, b: 42 },
      xaxis: {
        automargin: true,
        tickcolor: 'black',
        exponentformat: 'e',
        ticklen: 6,
        ticks: 'outside',
        tickwidth: 1,
        title: { font: { size: 10 }, text: 'Time (ms)' },
        zeroline: false,
      },
      yaxis: {
        automargin: true,
        tickcolor: 'black',
        ticklen: 4,
        ticks: 'outside',
        tickwidth: 1,
        exponentformat: 'e',
        title: {
          font: { size: 10 },
          text: `${variableName ?? getUnitLabel(units)} (${units})`,
          standoff: 12,
        },
        zeroline: false,
      },
    },
    config: { displaylogo: false, staticPlot: true, responsive: true },
  };
};

function getUnitLabel(units: string): string {
  switch (units) {
    case 'mV':
      return 'Voltage';
    case 'nA':
    case 'pA':
      return 'Current';
    default:
      return 'Value';
  }
}
