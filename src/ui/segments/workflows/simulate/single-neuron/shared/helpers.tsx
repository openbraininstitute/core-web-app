import range from 'lodash/range';
import round from 'lodash/round';

import { cn } from '@/utils/css-class';

export const MAX_AMPERAGE_STEPS = 15;

export function calculateRangeOutput(start: number, end: number, step: number) {
  if (step <= 0) return [];
  if (start === end) return [start];

  let values: number[];

  if (step === 1) {
    values = [(start + end) / 2];
  } else if (step === 2) {
    values = [start, end];
  } else {
    const steps = (end - start) / (step - 1);
    values = [...range(start, end, steps), end];
  }

  return values.map((v) => roundToSignificantFigures(v, 4));
}

export function roundToSignificantFigures(num: number, sigFigs: number) {
  if (num === 0) return 0;
  const multiplier = 10 ** (sigFigs - Math.ceil(Math.log10(Math.abs(num))));
  return round(num * multiplier) / multiplier;
}

export const label = (text: string, required: boolean = false, cls?: string) => (
  <span className={cn('text-neutral-4/80 text-sm leading-5 font-light uppercase', cls)}>
    {text} {required && <sup className="text-lg text-red-400">*</sup>}
  </span>
);

export function getSessionKey(prefix: string, sessionId: string) {
  return `${prefix}-${sessionId}`;
}
