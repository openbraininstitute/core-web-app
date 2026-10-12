/** Membrane-potential colour scale: -85 mV (cold) to +45 mV (hot). */

export const V_MIN = -85;
export const V_MAX = 45;

type Stop = [number, number, number, number]; // [value, r, g, b]

const STOPS: Stop[] = [
  [-85, 8, 16, 38],
  [-70, 18, 46, 96],
  [-60, 24, 96, 168],
  [-50, 32, 158, 176],
  [-30, 84, 196, 106],
  [-10, 232, 196, 74],
  [10, 242, 118, 42],
  [30, 236, 62, 66],
  [45, 255, 236, 214],
];

function voltageRGB(v: number): [number, number, number] {
  const x = Math.max(V_MIN, Math.min(V_MAX, v));
  let i = 0;
  while (i < STOPS.length - 2 && x > STOPS[i + 1][0]) i++;
  const [v0, r0, g0, b0] = STOPS[i];
  const [v1, r1, g1, b1] = STOPS[i + 1];
  const f = (x - v0) / (v1 - v0);
  return [
    Math.round(r0 + (r1 - r0) * f),
    Math.round(g0 + (g1 - g0) * f),
    Math.round(b0 + (b1 - b0) * f),
  ];
}

export function voltageColor(v: number, alpha = 1): string {
  const [r, g, b] = voltageRGB(v);
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

/** 0 at rest, 1 at the peak of a spike — used to drive glow effects. */
export function excitation(v: number): number {
  return Math.max(0, Math.min(1, (v + 50) / 70));
}
