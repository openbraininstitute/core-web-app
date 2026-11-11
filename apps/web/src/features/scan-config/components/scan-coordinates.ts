import type { ISimulation } from '@/api/entitycore/types/entities/simulation';

/** A scan value's identity across simulations, objects included. */
export function scanValueId(value: unknown): string {
  return JSON.stringify(value) ?? 'undefined';
}

/** Every parameter a campaign sweeps - takes more than one value - with its values in order, numbers by size. */
export function sweptParameters(simulations: ISimulation[]) {
  const byKey = new Map<string, Map<string, unknown>>();
  for (const simulation of simulations) {
    for (const [key, value] of Object.entries(simulation.scan_parameters ?? {})) {
      let values = byKey.get(key);
      if (!values) {
        values = new Map();
        byKey.set(key, values);
      }
      values.set(scanValueId(value), value);
    }
  }
  return [...byKey]
    .filter(([, values]) => values.size > 1)
    .map(([key, values]) => {
      const entries = [...values].map(([id, value]) => ({ id, value }));
      const numeric = entries.every((e) => typeof e.value === 'number');
      entries.sort((a, b) =>
        numeric
          ? (a.value as number) - (b.value as number)
          : a.id.localeCompare(b.id, undefined, { numeric: true })
      );
      return { key, values: entries };
    });
}

/**
 * The simulation at the scan values `fixed` names, by id per parameter, that
 * keeps the most of `from`'s other values: the very point in a full grid, the
 * closest there is in a sparse one; null where none has those values.
 */
export function nearestSimulation(
  simulations: ISimulation[],
  from: ISimulation,
  fixed: Record<string, string>
): ISimulation | null {
  const others = Object.entries(from.scan_parameters ?? {}).filter(([k]) => !(k in fixed));
  let best: ISimulation | null = null;
  let bestShared = -1;
  for (const simulation of simulations) {
    const params = simulation.scan_parameters ?? {};
    if (Object.entries(fixed).some(([k, id]) => scanValueId(params[k]) !== id)) continue;
    const shared = others.filter(([k, v]) => scanValueId(params[k]) === scanValueId(v)).length;
    if (shared > bestShared) {
      best = simulation;
      bestShared = shared;
    }
  }
  return best;
}
