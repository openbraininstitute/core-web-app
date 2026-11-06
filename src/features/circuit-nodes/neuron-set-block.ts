import { NodePopulationType } from '@/api/entitycore/types/entities/circuit';

import { ColumnKindDict } from './types';

import type { ColumnMeta, ColumnValues, FilterModel, NodePopulation } from './types';

/** A block for a scan config's neuron sets, as obi-one's schema has it. */
export type NeuronSetBlock = Record<string, unknown>;

/**
 * What a property neuron set's form can show of a population: each property it offers, with the
 * values it offers (`NodePropertyUniqueValuesByPopulation`). obi-one leaves out a property with too
 * many values, so a set saying it would open empty.
 */
export type OfferedProperties = Readonly<Record<string, readonly string[]>>;

/** The properties kept longest when a selection is said by its cells' values, the most telling first. */
const TELLING = [
  'mtype',
  'etype',
  'layer',
  'synapse_class',
  'morph_class',
  'cell_class',
  'super_class',
  'superclass',
  'class',
  'cell_type',
  'type',
  'region',
];
/** A property taking more of its values than this to say the selection reads as a list, not a description. */
const MOST_VALUES = 40;
/**
 * The most cells an ID neuron set may hold: its ids go in the scan config, so the form, its
 * validation and the saved JSON all carry each one. The form stays responsive with this many.
 */
export const MAX_ID_SET_CELLS = 250_000;

/** obi-one's neuron set types come by the kind of population they select from. */
function typePrefix(population: NodePopulation): string {
  if (population.type === NodePopulationType.Biophysical) return 'BiophysicalPopulation';
  if (population.type === NodePopulationType.Virtual) return 'VirtualPopulation';
  return 'PointPopulation';
}

function propertyBlock(population: NodePopulation, filterDict: Record<string, string[]>) {
  return {
    type: `${typePrefix(population)}PropertyNeuronSet`,
    population: population.name,
    sample_percentage: 100,
    sample_seed: 1,
    property_filter: { type: 'NeuronPropertyFilter', filter_dict: filterDict },
  };
}

function idBlock(population: NodePopulation, cells: Uint32Array) {
  return {
    type: `${typePrefix(population)}IDNeuronSet`,
    population: population.name,
    sample_percentage: 100,
    sample_seed: 1,
    neuron_ids: {
      type: 'NamedTuple',
      name: `${cells.length}_selected_neurons`,
      elements: Array.from(cells),
    },
  };
}

/** Whether the form can show `property` with all of `values`; it drops blank values. */
function canShow(offered: OfferedProperties, property: string, values: readonly string[]): boolean {
  const listed = offered[property];
  return listed !== undefined && values.every((v) => v.trim() !== '' && listed.includes(v));
}

/**
 * A filter made only of value lists on categorical columns the form can show, as a property
 * filter: the same cells by definition.
 */
function filterAsProperties(
  filterModel: FilterModel,
  columns: readonly ColumnMeta[],
  offered: OfferedProperties
): Record<string, string[]> | null {
  const entries = Object.entries(filterModel);
  if (entries.length === 0) return null;
  const categorical = new Set(
    columns.filter((c) => c.kind === ColumnKindDict.Categorical).map((c) => c.name)
  );
  const dict: Record<string, string[]> = {};
  for (const [column, filter] of entries) {
    if (filter.filterType !== 'set' || !categorical.has(column)) return null;
    if (!canShow(offered, column, filter.values)) return null;
    dict[column] = [...filter.values];
  }
  return dict;
}

/** How a categorical column narrows to the selection: a flag per value of its library, and how many are on. */
type Narrowing = {
  name: string;
  library: string[];
  codes: Uint32Array;
  kept: Uint8Array;
  count: number;
};

/** The cells that every narrowing keeps, counted, stopping once past `limit`. */
function countKept(narrowings: readonly Narrowing[], rowCount: number, limit: number): number {
  let count = 0;
  for (let row = 0; row < rowCount; row++) {
    if (narrowings.every((n) => n.kept[n.codes[row]] === 1)) {
      count += 1;
      if (count > limit) return count;
    }
  }
  return count;
}

/**
 * The neuron set for the cells a table leaves on show, a property set wherever the values the form
 * can show say exactly which cells they are, else their ids. Where the table's filter is only lists
 * of those values, they are the property set. Otherwise each categorical property on offer is
 * narrowed to the values the cells have; where nothing else has those values, the properties that
 * add nothing are dropped, the least telling first, and the rest are the set. Cells only their ids
 * can say, past `MAX_ID_SET_CELLS` of them, make no set: `block` is null.
 */
export async function neuronSetBlock({
  population,
  cells,
  rowCount,
  ticked,
  filterModel,
  columns,
  offered,
  getColumn,
}: {
  population: NodePopulation;
  /** The cells on show, by node index, sorted. */
  cells: Uint32Array;
  rowCount: number;
  /** Whether rows are ticked: the cells are then the ticks, whatever the filter. */
  ticked: boolean;
  filterModel: FilterModel;
  columns: readonly ColumnMeta[];
  offered: OfferedProperties;
  getColumn: (name: string) => Promise<ColumnValues>;
}): Promise<{ block: NeuronSetBlock; by: 'property' | 'id' } | { block: null; by: null }> {
  const asFiltered = ticked ? null : filterAsProperties(filterModel, columns, offered);
  if (asFiltered) return { block: propertyBlock(population, asFiltered), by: 'property' };

  const narrowings: Narrowing[] = [];
  for (const meta of columns.filter(
    (c) => c.kind === ColumnKindDict.Categorical && c.name in offered
  )) {
    const values = await getColumn(meta.name);
    if (values.kind !== 'categorical') continue;
    const kept = new Uint8Array(values.library.length);
    let count = 0;
    for (const cell of cells) {
      const code = values.indices[cell];
      if (kept[code] === 0) {
        kept[code] = 1;
        count += 1;
      }
    }
    // A property the cells take every value of says nothing; one they take most of, too much.
    const taken = values.library.filter((_, code) => kept[code] === 1);
    if (
      count < values.library.length &&
      count <= MOST_VALUES &&
      canShow(offered, meta.name, taken)
    ) {
      narrowings.push({
        name: meta.name,
        library: values.library,
        codes: values.indices,
        kept,
        count,
      });
    }
  }
  const exact = (kept: readonly Narrowing[]) =>
    kept.length > 0 && countKept(kept, rowCount, cells.length) === cells.length;
  if (!exact(narrowings)) {
    return cells.length > MAX_ID_SET_CELLS
      ? { block: null, by: null }
      : { block: idBlock(population, cells), by: 'id' };
  }

  // The least telling are tried first: a property not among them, then theirs from the last.
  const rank = (name: string) => {
    const at = TELLING.indexOf(name);
    return at === -1 ? TELLING.length : at;
  };
  let kept = narrowings;
  for (const dropped of [...narrowings].sort((a, b) => rank(b.name) - rank(a.name))) {
    const without = kept.filter((n) => n !== dropped);
    if (exact(without)) kept = without;
  }
  const filterDict = Object.fromEntries(
    kept.map((n) => [n.name, n.library.filter((_, code) => n.kept[code] === 1)])
  );
  return { block: propertyBlock(population, filterDict), by: 'property' };
}
