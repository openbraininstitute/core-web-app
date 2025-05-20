import { CircuitSchemaProps } from '../type';

export function flattenCircuits(circuits: CircuitSchemaProps[]): CircuitSchemaProps[] {
  const flat: CircuitSchemaProps[] = [];

  function flatten(circuit: CircuitSchemaProps, depth: number = 0) {
    flat.push(circuit);
    if (circuit.subcircuits && circuit.subcircuits.length > 0) {
      circuit.subcircuits.forEach((subCircuit) => flatten(subCircuit, depth + 1));
    }
  }

  circuits.forEach((circuit) => flatten(circuit));
  return flat;
}
