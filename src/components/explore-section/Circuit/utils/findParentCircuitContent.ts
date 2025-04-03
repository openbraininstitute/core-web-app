import { CircuitWithCount } from '../content/circuits_flat';
import { CircuitSchemaProps } from '../type';

export const findParentContent = (
  key: string,
  flattened: { [key: string]: CircuitWithCount }
): CircuitSchemaProps | null => {
  const circuitEntry = flattened[key];
  if (!circuitEntry) return null;

  const { circuit } = circuitEntry;

  const parentKey = circuit.parent;

  if (!parentKey) return null;

  const parentEntry = flattened[parentKey];
  return parentEntry ? parentEntry.circuit : null;
};
