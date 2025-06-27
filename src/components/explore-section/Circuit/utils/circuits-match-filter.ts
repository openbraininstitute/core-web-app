import { CircuitSchemaProps, NumericFilterOptions } from '../type';

export function circuitMatchFilter(
  circuit: CircuitSchemaProps,
  numericFilter: NumericFilterOptions | null,
  minValue: number | undefined,
  maxValue: number | undefined,
  searchQuery: string,
  scaleFilter: string | null,
  buildCategoryFilter: string | null
): boolean {
  if (!numericFilter && !searchQuery && !scaleFilter && !buildCategoryFilter) {
    return true;
  }

  let matchesFilter = true;

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    const name = circuit.name ? circuit.name.toLowerCase() : '';
    const brainRegion = circuit.brainRegion ? circuit.brainRegion.toLowerCase() : '';
    matchesFilter = matchesFilter && (name.includes(query) || brainRegion.includes(query));
  }

  if (scaleFilter) {
    if (!circuit.scale) {
      matchesFilter = false;
    } else {
      matchesFilter = matchesFilter && circuit.scale.toLowerCase() === scaleFilter.toLowerCase();
    }
  }

  if (buildCategoryFilter) {
    matchesFilter = matchesFilter && circuit.buildCategory === buildCategoryFilter;
  }

  if (numericFilter) {
    const { property, type } = numericFilter;
    const min = minValue !== undefined ? minValue : numericFilter.min;
    const max = maxValue !== undefined ? maxValue : numericFilter.max;

    if (property === 'numberOfNeurons') {
      const value = circuit.numberOfNeurons;
      if (type === 'greaterThan' && min !== undefined) {
        matchesFilter = matchesFilter && value > min;
      } else if (type === 'lessThan' && max !== undefined) {
        matchesFilter = matchesFilter && value < max;
      } else if (type === 'between' && min !== undefined && max !== undefined) {
        matchesFilter = matchesFilter && value >= min && value <= max;
      } else {
        matchesFilter = false;
      }
    } else if (property === 'numberOfConnections') {
      const value = circuit.numberOfConnections;
      if (type === 'greaterThan' && min !== undefined) {
        matchesFilter = matchesFilter && value > min;
      } else if (type === 'lessThan' && max !== undefined) {
        matchesFilter = matchesFilter && value < max;
      } else if (type === 'between' && min !== undefined && max !== undefined) {
        matchesFilter = matchesFilter && value >= min && value <= max;
      } else {
        matchesFilter = false;
      }
    } else if (property === 'numberOfSynapses') {
      const value = circuit.numberOfSynapses;
      if (type === 'greaterThan' && min !== undefined) {
        matchesFilter = matchesFilter && value > min;
      } else if (type === 'lessThan' && max !== undefined) {
        matchesFilter = matchesFilter && value < max;
      } else if (type === 'between' && min !== undefined && max !== undefined) {
        matchesFilter = matchesFilter && value >= min && value <= max;
      } else {
        matchesFilter = false;
      }
    }
  }

  return matchesFilter;
}
