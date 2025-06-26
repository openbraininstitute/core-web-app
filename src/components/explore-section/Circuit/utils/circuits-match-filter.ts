import { CircuitSchemaProps, NumericFilterOptions } from '../type';

export function circuitMatchFilter(
  circuit: CircuitSchemaProps,
  filter: NumericFilterOptions | null,
  minValue: number | undefined,
  maxValue: number | undefined,
  searchQuery: string,
  scaleFilter: 'smallMicrocircuit' | 'microcircuit' | null = null,
  buildCategoryFilter: string | null = null
): boolean {
  let numericMatch = true;

  if (filter && filter.property !== 'scaleType' && filter.property !== 'buildCategory') {
    const { property, type } = filter;
    const value = circuit[property];

    if (typeof value !== 'number' || Number.isNaN(value)) {
      numericMatch = false;
    } else {
      if (type === 'greaterThan' && minValue !== undefined) {
        numericMatch = value > minValue;
      }
      if (type === 'lessThan' && maxValue !== undefined) {
        numericMatch = value < maxValue;
      }
      if (type === 'between' && minValue !== undefined && maxValue !== undefined) {
        numericMatch = value >= minValue && value <= maxValue;
      }
    }
  }

  let scaleMatch = true;
  if (scaleFilter) {
    scaleMatch = circuit.scale.toLowerCase() === scaleFilter.toLowerCase();
  }

  let buildCategoryMatch = true;
  if (buildCategoryFilter) {
    buildCategoryMatch = circuit.buildCategory.toLowerCase() === buildCategoryFilter.toLowerCase();
  }

  let searchMatch = true;
  if (searchQuery) {
    const query = searchQuery.toLowerCase().trim();
    searchMatch =
      circuit.name?.toLowerCase().includes(query) ||
      circuit.brainRegion?.toLowerCase().includes(query) ||
      false;
  }

  const result = numericMatch && scaleMatch && buildCategoryMatch && searchMatch;

  return result;
}
