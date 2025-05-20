import { Key } from 'react';
import { CircuitSchemaProps } from '../type';

function collectExpandableKeys(circuits: CircuitSchemaProps[]): Key[] {
  const keys: Key[] = [];

  for (const circuit of circuits) {
    if (circuit.subcircuits && circuit.subcircuits.length > 0) {
      keys.push(circuit.key);
      keys.push(...collectExpandableKeys(circuit.subcircuits));
    }
  }
  return keys;
}

export default collectExpandableKeys;
