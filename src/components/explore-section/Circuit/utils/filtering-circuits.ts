import { CircuitSchemaProps, NumericFilterOptions } from '../type';
import matchesNumericFilter from './matches-numeric-filter';

const filteringCircuits = (
  circuits: CircuitSchemaProps[],
  filter: NumericFilterOptions | null,
  searchQuery: string
): CircuitSchemaProps[] => {
  return circuits
    .map((circuit) => {
      const matchesSearch =
        searchQuery === '' ||
        circuit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        circuit.brainRegion.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = matchesNumericFilter(circuit, filter);

      const filteredSubcircuits =
        circuit.subcircuits && circuit.subcircuits.length > 0
          ? filteringCircuits(circuit.subcircuits, filter, searchQuery)
          : [];

      const includeCircuit = (matchesSearch && matchesFilter) || filteredSubcircuits.length > 0;

      if (!includeCircuit) return null;

      return {
        ...circuit,
        subcircuits: filteredSubcircuits,
      };
    })
    .filter((circuit): circuit is CircuitSchemaProps => circuit !== null);
};

export default filteringCircuits;
