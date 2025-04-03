import { CircuitSchemaProps } from "../type";

  const calculateSubcircuitsForParent = (row: CircuitSchemaProps): number => {
    const directSubcircuits = row.subcircuit?.length || 0;
    const nestedSubcircuits = row.subcircuit
      ? row.subcircuit.reduce((sum, sub) => sum + calculateSubcircuitsForParent(sub), 0)
      : 0;
    return directSubcircuits + nestedSubcircuits;
  };

  export default calculateSubcircuitsForParent;