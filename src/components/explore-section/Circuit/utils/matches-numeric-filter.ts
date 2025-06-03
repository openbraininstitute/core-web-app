import { CircuitSchemaProps, NumericFilterOptions } from '../type';

const matchesNumericFilter = (
  circuit: CircuitSchemaProps,
  filter: NumericFilterOptions | null
): boolean => {
  if (!filter || filter.property !== 'numberOfNeurons') return true;

  const value = circuit.numberOfNeurons;
  if (filter.type === 'greaterThan' && filter.min !== undefined) {
    return value > filter.min;
  }
  if (filter.type === 'lessThan' && filter.max !== undefined) {
    return value < filter.max;
  }
  if (filter.type === 'between' && filter.min !== undefined && filter.max !== undefined) {
    return value >= filter.min && value <= filter.max;
  }
  return true;
};

export default matchesNumericFilter;
