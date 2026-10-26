import { scanValueId } from '@/features/scan-config/components/scan-coordinates';

import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type {
  SimulationSummary,
  TimeCourseSeries,
} from '@/features/spike-viewer/campaign-statistics/campaign-summaries';

/**
 * Where the campaign's plots stand on a swept parameter on neither axis: at
 * one of its values (by id), the mean over all of them, or a plot for each.
 */
export const MEAN = '__mean__';
export const EACH = '__each__';

/** A random seed: its values run the same simulation again, so the plots average over it at first. */
export function isSeedParameter(key: string): boolean {
  return /(^|[._])seed$/i.test(key);
}

/** A swept parameter's name as the plots say it: its last part, or its last two where another shares it. */
export function parameterLabel(key: string, keys: readonly string[]): string {
  const last = (k: string) => k.split('.').at(-1) ?? k;
  if (keys.filter((k) => last(k) === last(key)).length < 2) return last(key);
  return key.split('.').slice(-2).join(' ');
}

/** The swept parameters in the order the plots' axes take them: seeds last. */
export function axisOrder<T extends { key: string }>(swept: readonly T[]): T[] {
  return [
    ...swept.filter((p) => !isSeedParameter(p.key)),
    ...swept.filter((p) => isSeedParameter(p.key)),
  ];
}

/** The simulations at the scan values `fixed` names, by id per parameter, whatever their others. */
export function simulationsMatching(
  simulations: readonly ISimulation[],
  fixed: Readonly<Record<string, string>>
): ISimulation[] {
  return simulations.filter((s) =>
    Object.entries(fixed).every(([key, id]) => scanValueId(s.scan_parameters?.[key]) === id)
  );
}

/** Each measure's mean over `summaries`, a simulation's NaN left out of it. */
export function meanSummary(summaries: readonly SimulationSummary[]): SimulationSummary {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const summary of summaries) {
    for (const [key, value] of Object.entries(summary)) {
      const total = totals.get(key) ?? { sum: 0, count: 0 };
      if (!Number.isNaN(value)) {
        total.sum += value;
        total.count += 1;
      }
      totals.set(key, total);
    }
  }
  return Object.fromEntries(
    [...totals].map(([key, { sum, count }]) => [key, count ? sum / count : Number.NaN])
  );
}

/** The mean of courses over the same times; those over others are left out. */
export function meanCourse(courses: readonly TimeCourseSeries[]): TimeCourseSeries | undefined {
  const [first] = courses;
  if (!first) return undefined;
  const n = first.x.length;
  const alike = courses.filter(
    (c) => c.x.length === n && c.x[0] === first.x[0] && c.x[n - 1] === first.x[n - 1]
  );
  const y = new Float64Array(first.y.length);
  for (const course of alike) for (let i = 0; i < y.length; i++) y[i] += course.y[i];
  for (let i = 0; i < y.length; i++) y[i] /= alike.length;
  return { x: first.x, y };
}

/** Every combination of the values of `parameters`, a value id per parameter. */
export function combinations(
  parameters: readonly { key: string; values: readonly { id: string }[] }[]
): Record<string, string>[] {
  return parameters.reduce<Record<string, string>[]>(
    (combos, { key, values }) =>
      combos.flatMap((combo) => values.map((v) => ({ ...combo, [key]: v.id }))),
    [{}]
  );
}
