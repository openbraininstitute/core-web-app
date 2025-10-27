import { TgdColor } from '@tolokoban/tgd';

export function createPalette(colorsCount: number) {
  const palette: string[] = [];
  const modulo = findNextPrime(colorsCount);
  const step = computeStep(modulo);
  let hue = 0.667; // Blue
  for (let index = 0; index < colorsCount; index++) {
    const color = new TgdColor();
    color.H = hue;
    color.S = 0.7;
    color.L = 0.6;
    color.hsl2rgb();
    palette.push(color.toString());
    hue += step;
  }
  return palette;
}

function findNextPrime(value: number) {
  let prime = value;
  while (!isPrime(prime)) prime++;
  return prime;
}

function isPrime(value: number) {
  if (value < 3) return false;

  const max = Math.ceil(Math.sqrt(value));
  for (let divisor = 3; divisor <= max; divisor++) {
    if (value % divisor === 0) return false;
  }
  return true;
}

function computeStep(value: number) {
  const step = Math.ceil(value / 3);
  return (step < value ? step : 1) / value;
}
