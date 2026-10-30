import type { ColumnMeta, ColumnValues } from '@/features/circuit-nodes/types';
import type { CompartmentPlaces } from '@/features/sonata-viewer/hooks/use-compartment-places';
import type { PopulationMetadata } from '@/features/sonata-viewer/types';
import type { CellStatistic } from '@/features/spike-viewer/spike-statistics/statistics';

/** What the statistics' menus list a compartment's own variables under. */
export const COMPARTMENT_HEADING = 'Compartment';

/** The compartments' section types, as a grouping of the statistics over them. */
export const SECTION_TYPE_COLUMN = 'compartment:section_type';

const PATH_DISTANCE: CellStatistic = {
  key: 'path_distance',
  column: 'compartment:path_distance',
  heading: COMPARTMENT_HEADING,
  label: 'Path distance',
  short: 'Path distance',
  unit: 'µm',
  format: (value) => value.toFixed(1),
};

const OFFSET: CellStatistic = {
  key: 'offset',
  column: 'compartment:offset',
  heading: COMPARTMENT_HEADING,
  label: 'Offset along its section',
  short: 'Offset',
  format: (value) => value.toFixed(3),
};

/**
 * A compartment report's statistics over its compartments rather than its cells: the
 * report's own, each compartment's, then where it is - its path distance from the soma,
 * once measured, and its offset along its section, where a compartment set says it - as
 * values by trace.
 */
export function compartmentStatistics({
  statistics,
  traceValues,
  traces,
  places,
  offsets,
}: {
  statistics: readonly CellStatistic[];
  traceValues: Readonly<Record<string, Float64Array>>;
  traces: number;
  places: CompartmentPlaces | null;
  offsets: ReadonlyMap<number, number> | undefined;
}): { statistics: CellStatistic[]; values: Record<string, Float64Array> } {
  const byTrace = (known: ReadonlyMap<number, number>) => {
    const values = new Float64Array(traces).fill(Number.NaN);
    for (const [traceIndex, value] of known) values[traceIndex] = value;
    return values;
  };
  const values: Record<string, Float64Array> = { ...traceValues };
  const all = [...statistics];
  if (places && places.distances.size > 0) {
    values[PATH_DISTANCE.key] = byTrace(places.distances);
    all.push(PATH_DISTANCE);
  }
  if (offsets && offsets.size > 0) {
    values[OFFSET.key] = byTrace(offsets);
    all.push(OFFSET);
  }
  return { statistics: all, values };
}

/** The grouping a compartment has of its own, besides its cell's: its section's type. */
export function sectionTypeColumn(places: CompartmentPlaces | null): ColumnMeta[] {
  if (!places || places.types.size === 0) return [];
  return [
    {
      name: SECTION_TYPE_COLUMN,
      kind: 'categorical',
      library: [...new Set(places.types.values())].sort(),
      label: 'Section type',
      heading: COMPARTMENT_HEADING,
    },
  ];
}

/**
 * A column by trace: a compartment's section type, or its cell's value of a node column,
 * so each compartment is grouped and placed as its cell is.
 */
export async function compartmentColumn(
  name: string,
  population: PopulationMetadata,
  places: CompartmentPlaces | null,
  nodeColumn: (name: string) => Promise<ColumnValues>
): Promise<ColumnValues> {
  const { traces } = population;
  if (name === SECTION_TYPE_COLUMN) {
    const library = [...new Set(places?.types.values() ?? [])].sort();
    const unknown = library.length;
    return {
      kind: 'categorical',
      library: [...library, 'Unknown'],
      indices: Uint32Array.from(traces, (_, traceIndex) => {
        const type = places?.types.get(traceIndex);
        return type === undefined ? unknown : library.indexOf(type);
      }),
    };
  }
  const column = await nodeColumn(name);
  if (column.kind === 'categorical') {
    return {
      kind: 'categorical',
      library: column.library,
      indices: Uint32Array.from(traces, (trace) => column.indices[trace.nodeId]),
    };
  }
  if (column.kind === 'string') {
    return { kind: 'string', values: traces.map((trace) => column.values[trace.nodeId]) };
  }
  return {
    kind: 'numeric',
    values: Float64Array.from(traces, (trace) => column.values[trace.nodeId]),
  };
}
