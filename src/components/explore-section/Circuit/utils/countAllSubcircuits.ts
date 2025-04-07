import { CircuitSchemaProps } from '../type';

export function countAllSubcircuits(
  circuit: CircuitSchemaProps,
  circuitMap: Map<string, CircuitSchemaProps>
): number {
  let count = 0;

  if (circuit.subcircuit) {
    count += circuit.subcircuit.length;

    for (const subcircuit of circuit.subcircuit) {
      const subcircuitData = circuitMap.get(subcircuit.key);
      if (subcircuitData) {
        count += countAllSubcircuits(subcircuitData, circuitMap);
      }
    }
  }

  return count;
}
