import { CircuitSchemaProps, NumericFilterOptions } from '../type';

export function circuitMatchFilter(
  circuit: CircuitSchemaProps,
  filter: NumericFilterOptions | null,
  minValue: number | undefined,
  maxValue: number | undefined,
  searchQuery: string
): boolean {
  let numericMatch = true;

  if (filter) {
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

  let searchMatch = true;
  if (searchQuery) {

    const query = searchQuery.toLowerCase().trim();
    searchMatch =
      circuit.name?.toLowerCase().includes(query) ||
      false ||
      circuit.brainRegion?.toLowerCase().includes(query) ||
      false;
  }

  const result = numericMatch && searchMatch;

  return result;
}
