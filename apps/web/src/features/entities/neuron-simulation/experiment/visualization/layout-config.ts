import type Plotly from 'plotly.js-dist-min';

export const PLOT_LAYOUT: Partial<Plotly.Layout> = {
  plot_bgcolor: '#fff',
  paper_bgcolor: '#fff',
  autosize: true,
  xaxis: {
    automargin: true,
    color: '#003A8C',
    zeroline: false,
    showline: true,
    linecolor: '#888888',
    title: { text: 'Time [ms]', font: { size: 12 }, standoff: 6 },
  },
  yaxis: {
    automargin: true,
    color: '#003A8C',
    zeroline: false,
    showline: true,
    linecolor: '#888888',
    title: { text: 'Current [nA]', font: { size: 12 }, standoff: 6 },
  },
  showlegend: false,
  height: 320,
  margin: { t: 20, r: 20, b: 50, l: 60 },
  legend: {
    orientation: 'h',
    yanchor: 'top',
    xanchor: 'center',
    x: 0.5,
    y: 1.15,
  },
};

export const PLOT_CONFIG: Partial<Plotly.Config> = {
  displayModeBar: false,
  responsive: true,
  displaylogo: false,
};
