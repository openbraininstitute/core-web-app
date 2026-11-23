import { NodePopulationType } from '@/api/entitycore/types/entities/circuit';

import { canShow } from './property-filter';
import { ColumnKindDict } from './types';

import type {
  ColumnMeta,
  FilterModel,
  NodePopulation,
  TOfferedProperties,
  TPropertyFilter,
} from './types';

/** A block for a scan config's neuron sets, as obi-one's schema has it. */
export type NeuronSetBlock = Record<string, unknown>;

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

/**
 * A filter made only of value lists on categorical columns the form can show, as a property
 * filter: the same cells by definition.
 */
function filterAsProperties(
  filterModel: FilterModel,
  columns: readonly ColumnMeta[],
  offered: TOfferedProperties
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

/** The cells on show as a property neuron set where values say them, else by id; null past `MAX_ID_SET_CELLS` ids. */
export async function neuronSetBlock({
  population,
  cells,
  ticked,
  filterModel,
  columns,
  offered,
  propertyFilter,
}: {
  population: NodePopulation;
  /** The cells on show, by node index, sorted. */
  cells: Uint32Array;
  /** Whether rows are ticked: the cells are then the ticks, whatever the filter. */
  ticked: boolean;
  filterModel: FilterModel;
  columns: readonly ColumnMeta[];
  offered: TOfferedProperties;
  propertyFilter: (
    cells: Uint32Array,
    offered: TOfferedProperties
  ) => Promise<TPropertyFilter | null>;
}): Promise<{ block: NeuronSetBlock; by: 'property' | 'id' } | { block: null; by: null }> {
  const asFiltered = ticked ? null : filterAsProperties(filterModel, columns, offered);
  if (asFiltered) return { block: propertyBlock(population, asFiltered), by: 'property' };

  const byValues = Object.keys(offered).length > 0 ? await propertyFilter(cells, offered) : null;
  if (byValues) return { block: propertyBlock(population, byValues), by: 'property' };
  return cells.length > MAX_ID_SET_CELLS
    ? { block: null, by: null }
    : { block: idBlock(population, cells), by: 'id' };
}
