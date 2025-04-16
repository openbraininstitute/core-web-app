import { useMemo } from 'react';
import { CircuitSchemaProps } from '../type';
import { FilterOptionsProps, useFilteredData } from './use-filtered-data';

export const useFlatCircuitMap = (circuits: CircuitSchemaProps[], options: FilterOptionsProps) => {
  const filteredData = useFilteredData(circuits, options);

  return useMemo(() => {
    const circuitMap = new Map<string, CircuitSchemaProps>();

    const flattenCircuits = (circuitArray: CircuitSchemaProps[]) => {
      for (const circuit of circuitArray) {
        circuitMap.set(circuit.key, circuit);
        if (circuit.subcircuit && circuit.subcircuit.length > 0) {
          flattenCircuits(circuit.subcircuit);
        }
      }
    };

    flattenCircuits(filteredData);

    return circuitMap;
  }, [filteredData]);
};
