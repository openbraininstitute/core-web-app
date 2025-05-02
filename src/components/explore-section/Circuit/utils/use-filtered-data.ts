import { useMemo } from 'react';
import { CircuitSchemaProps } from '../type';
import { filterCircuits } from './filter-circuits';
import filterCircuitsByNumeric, {
  NumericFilterProperty,
  NumericFilterType,
} from './filter-circuits-by-numeric';

type NumericFilterOptions = {
  property: NumericFilterProperty;
  type: NumericFilterType;
  min?: number;
  max?: number;
};

export type FilterOptionsProps = {
  searchQuery?: string;
  numericFilter?: NumericFilterOptions | null;
};

export const useFilteredData = (circuits: CircuitSchemaProps[], options: FilterOptionsProps) => {
  const { searchQuery, numericFilter } = options;

  return useMemo(() => {
    let filteredData = searchQuery ? filterCircuits(circuits, searchQuery) : circuits;

    if (numericFilter) {
      filteredData = filterCircuitsByNumeric(filteredData, {
        property: numericFilter.property,
        type: numericFilter.type,
        min: numericFilter.min,
        max: numericFilter.max,
      });
    }

    return filteredData;
  }, [circuits, searchQuery, numericFilter]);
};
