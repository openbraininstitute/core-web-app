import CIRCUITS_FULL from '../content/circuits_tree_formatted';
import { CircuitSchemaProps } from '../type';

const circuitMap = new Map<string, CircuitSchemaProps>();

function createCircuitMap(circuits: CircuitSchemaProps[]) {
  for (const circuit of circuits) {
    circuitMap.set(circuit.key, circuit);

    if (circuit.hasSubcircuits && circuit.subcircuit.length > 0) {
      createCircuitMap(circuit.subcircuit);
    }
  }
}

createCircuitMap(CIRCUITS_FULL);

export function findCircuitByKey(key: string): CircuitSchemaProps | null {
  return circuitMap.get(key) || null;
}
