import { contactTrace } from '@/features/lfp-viewer/field-figures';
import {
  axis,
  BASE_LAYOUT,
  LEGEND_ABOVE,
  MEAN_INK,
} from '@/features/spike-viewer/spike-statistics/figure-kit';

import type { Data } from 'plotly.js-dist-min';
import type { Figure } from '@/features/spike-viewer/spike-statistics/figures';

/**
 * Welch power spectra on log axes: the mean over every contact in slate, and
 * each of `contacts` in a colour of its own. 0 Hz is left out, as a log axis
 * cannot hold it.
 */
export function psdFigure({
  frequencies,
  psd,
  contacts,
  dtMs,
}: {
  frequencies: readonly number[];
  /** Contact × frequency, µV²/Hz. */
  psd: Float32Array;
  contacts: readonly number[];
  dtMs: number;
}): Figure {
  const bands = frequencies.length;
  const total = psd.length / bands;
  const from = frequencies[0] === 0 ? 1 : 0;
  const x = frequencies.slice(from);
  const row = (c: number) => Array.from(psd.subarray(c * bands + from, (c + 1) * bands));
  const mean = x.map((_, i) => {
    let sum = 0;
    for (let c = 0; c < total; c++) sum += psd[c * bands + from + i];
    return sum / total;
  });
  const nyquist = 1000 / dtMs / 2;

  const data = [
    {
      type: 'scatter',
      mode: 'lines',
      name: `Mean of ${total.toLocaleString()} contacts`,
      x,
      y: mean,
      line: { color: MEAN_INK, width: 2 },
      hovertemplate: '%{x:.1f} Hz · %{y:.3g} µV²/Hz<extra>mean</extra>',
    },
    ...contacts.map((c, i) =>
      contactTrace(c, i, x, row(c), `%{x:.1f} Hz · %{y:.3g} µV²/Hz<extra>e${c}</extra>`)
    ),
  ];

  return {
    data: data as Data[],
    layout: {
      ...BASE_LAYOUT,
      showlegend: true,
      legend: LEGEND_ABOVE,
      xaxis: axis(`Frequency (Hz) · Nyquist ${Number(nyquist.toPrecision(4))} Hz`, { type: 'log' }),
      yaxis: axis('Power (µV²/Hz)', { type: 'log', exponentformat: 'power' }),
    },
  };
}
