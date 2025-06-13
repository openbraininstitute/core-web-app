import { CircuitSchemaProps } from '../type';

export const filterCircuits = (
  circuits: CircuitSchemaProps[],
  query: string
): CircuitSchemaProps[] => {
  const lowerCaseQuery = query.toLowerCase();

  return circuits
    .map((circuit: CircuitSchemaProps) => {
      const matches =
        (circuit.name?.toLowerCase().includes(lowerCaseQuery) ?? false) ||
        (circuit.brainRegion?.toLowerCase().includes(lowerCaseQuery) ?? false);

      const filteredSubcircuits = circuit.subcircuits
        ? filterCircuits(circuit.subcircuits, query)
        : [];

      if (matches || filteredSubcircuits.length > 0) {
        return {
          ...circuit,
          subcircuit: filteredSubcircuits,
        };
      }

      return null;
    })
    .filter((circuit) => circuit !== null);
};
