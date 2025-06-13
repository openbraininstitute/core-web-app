import { CircuitSchemaProps } from '../type';

const calculateSubcircuitsForParent = (row: CircuitSchemaProps): number => {
  const directSubcircuits = row.subcircuits?.length || 0;
  const nestedSubcircuits = row.subcircuits
    ? row.subcircuits.reduce((sum, sub) => sum + calculateSubcircuitsForParent(sub), 0)
    : 0;
  return directSubcircuits + nestedSubcircuits;
};

export default calculateSubcircuitsForParent;
