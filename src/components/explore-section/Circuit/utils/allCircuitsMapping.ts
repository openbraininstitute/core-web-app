import React from 'react';
import { CircuitSchemaProps } from '../type';

export const useAllCircuitMapping = (circuits: CircuitSchemaProps[]) => {
  return React.useMemo(() => {
    const newMap = new Map<string, CircuitSchemaProps>();

    fillMap(newMap, circuits);

    return newMap;
  }, [circuits]);
};

function fillMap(newMap: Map<string, CircuitSchemaProps>, circuits: CircuitSchemaProps[]) {
  for (const circuit of circuits) {
    newMap.set(circuit.key, circuit);

    if (circuit.subcircuit) {
      fillMap(newMap, circuit.subcircuit);
    }
  }
}
