import useBreakpoint from 'antd/lib/grid/hooks/useBreakpoint';

import type { Config, Font, Layout } from 'plotly.js-dist-min';
import type { CSSProperties } from 'react';

interface UseConfigResponse {
  layout: Partial<Layout>;
  config: Partial<Config>;
  antBreakpoints?: any;
  font?: Partial<Font>;
  style?: CSSProperties;
}

export const useInteractivePlotConfig = (): UseConfigResponse => {
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
      legend: antBreakpoints.md
        ? {}
        : {
            x: 1,
            xanchor: 'right',
            y: 1,
          },
      margin: antBreakpoints.md ? { l: 55, r: 0, t: 50, b: 50 } : { l: 45, r: 0, t: 30, b: 35 },
    },
    font: antBreakpoints.md
      ? {}
      : {
          size: 12,
        },
    style: {
      width: '100%',
      height: '40vh',
    },
  };
};

export const useOverviewPlotConfig = ({
  datarevision,
  xTitle,
  yTitle,
}: {
  datarevision: number;
  xTitle: string;
  yTitle: string;
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
          text: xTitle,
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
    },
    config: { displaylogo: false, staticPlot: true, responsive: true },
  };
};
