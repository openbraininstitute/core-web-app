import { CircuitSchemaProps } from '../type';

const calculateSubcircuitsForParent = (
  row: CircuitSchemaProps,
  matchesFilters: (circuit: CircuitSchemaProps) => boolean,
  hasMatchingSubcircuit: (circuit: CircuitSchemaProps) => boolean
): number => {
  if (!row.subcircuits || row.subcircuits.length === 0) return 0;

  let count = 0;
  for (const sub of row.subcircuits) {
    if (matchesFilters(sub) || hasMatchingSubcircuit(sub)) {
      count += 1;
      count += calculateSubcircuitsForParent(sub, matchesFilters, hasMatchingSubcircuit);
    }
  }
  return count;
};

export default calculateSubcircuitsForParent;
