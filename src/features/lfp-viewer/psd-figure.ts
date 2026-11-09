import { byPlace } from '@/features/lfp-viewer/contact-colours';
import { contactTrace } from '@/features/lfp-viewer/field-figures';
import {
  axis,
  BASE_LAYOUT,
  LEGEND_ABOVE,
  MEAN_INK,
} from '@/features/spike-viewer/spike-statistics/figure-kit';

import type { Data } from 'plotly.js-dist-min';
import type { LineColour } from '@/features/lfp-viewer/contact-colours';
import type { Figure } from '@/features/spike-viewer/spike-statistics/figures';

function meanTrace(psd: Float32Array, bands: number, from: number, x: readonly number[]) {
  const total = psd.length / bands;
  return {
    type: 'scatter',
    mode: 'lines',
    name: `Mean of ${total.toLocaleString()} contacts`,
    x,
    y: x.map((_, i) => {
      let sum = 0;
      for (let c = 0; c < total; c++) sum += psd[c * bands + from + i];
      return sum / total;
    }),
    line: { color: MEAN_INK, width: 2 },
    hovertemplate: '%{x:.1f} Hz · %{y:.3g} µV²/Hz<extra>mean</extra>',
  };
}

/**
 * Welch power spectra on log axes: the mean over every contact in slate, and
 * each of `contacts` in a colour of its own. 0 Hz is left out, as a log axis
 * cannot hold it. `psd` holds every contact, or, with `onlyTheseRows`, only
 * `contacts`' in their order, with no mean to draw.
 */
export function psdFigure({
  frequencies,
  psd,
  contacts,
  dtMs,
  onlyTheseRows = false,
  colourOf = byPlace,
}: {
  frequencies: readonly number[];
  /** Contact × frequency, µV²/Hz. */
  psd: Float32Array;
  contacts: readonly number[];
  dtMs: number;
  onlyTheseRows?: boolean;
  colourOf?: LineColour;
}): Figure {
  const bands = frequencies.length;
  const from = frequencies[0] === 0 ? 1 : 0;
  const x = frequencies.slice(from);
  const row = (r: number) => Array.from(psd.subarray(r * bands + from, (r + 1) * bands));
  const nyquist = 1000 / dtMs / 2;

  const data = [
    ...(onlyTheseRows ? [] : [meanTrace(psd, bands, from, x)]),
    ...contacts.map((c, i) =>
      contactTrace(
        c,
        colourOf(c, i),
        x,
        row(onlyTheseRows ? i : c),
        `%{x:.1f} Hz · %{y:.3g} µV²/Hz<extra>e${c}</extra>`
      )
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
