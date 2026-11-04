import { match } from 'ts-pattern';

import type { NumberFilter, TextFilter } from '@/features/circuit-nodes/types';

/** The values of an Equals filter, which matches any of them: "3, 5, 9" for numbers. */
export function listedValues(text: string, separator: RegExp = /[\s,;]+/): string[] {
  return text
    .split(separator)
    .map((v) => v.trim())
    .filter((v) => v !== '');
}

export function textTest(f: TextFilter): (value: string) => boolean {
  const q = (f.filter ?? '').toLowerCase();
  // Text can hold spaces, so only commas part its values.
  const any = new Set(listedValues(q, /,/));
  return match(f.type)
    .with('contains', () => (v: string) => v.toLowerCase().includes(q))
    .with('equals', () => (v: string) => any.has(v.toLowerCase()))
    .with('notEqual', () => (v: string) => v.toLowerCase() !== q)
    .with('startsWith', () => (v: string) => v.toLowerCase().startsWith(q))
    .with('endsWith', () => (v: string) => v.toLowerCase().endsWith(q))
    .exhaustive();
}

export function numberTest(f: NumberFilter): (v: number) => boolean {
  const q = Number(f.filter);
  const q2 = Number(f.filterTo ?? f.filter);
  const lo = Math.min(q, q2);
  const hi = Math.max(q, q2);
  const any = new Set(
    listedValues(f.filter ?? '')
      .map(Number)
      .filter((v) => !Number.isNaN(v))
  );
  return match(f.type)
    .with('equals', () => (v: number) => any.has(v))
    .with('notEqual', () => (v: number) => v !== q)
    .with('lessThan', () => (v: number) => v < q)
    .with('lessThanOrEqual', () => (v: number) => v <= q)
    .with('greaterThan', () => (v: number) => v > q)
    .with('greaterThanOrEqual', () => (v: number) => v >= q)
    .with('inRange', () => (v: number) => v >= lo && v <= hi)
    .exhaustive();
}
