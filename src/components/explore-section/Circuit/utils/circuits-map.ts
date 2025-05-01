import { CircuitSchemaProps } from '../type';

export const buildCircuitMap = (
  circuits: CircuitSchemaProps[],
  map: Map<string, CircuitSchemaProps> = new Map()
): Map<string, CircuitSchemaProps> => {
  for (const circuit of circuits) {
    map.set(circuit.key, circuit);
    if (circuit.subcircuits && circuit.subcircuits.length > 0) {
      buildCircuitMap(circuit.subcircuits, map);
    }
  }
  return map;
};