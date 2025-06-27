import { CircuitSchemaProps, NumericFilterOptions } from '../type';
import { circuitMatchFilter } from './circuits-match-filter';

export function filterCircuitsWithParents(
  circuits: CircuitSchemaProps[],
  numericFilter: NumericFilterOptions | null,
  minValue: number | undefined,
  maxValue: number | undefined,
  searchQuery: string,
  scaleFilter: string | null,
  buildCategoryFilter: string | null
) {
  let count = 0;

  function shouldIncludeCircuit(circuit: CircuitSchemaProps): CircuitSchemaProps | null {
    const circuitMatches = circuitMatchFilter(
      circuit,
      numericFilter,
      minValue,
      maxValue,
      searchQuery,
      scaleFilter,
      buildCategoryFilter
    );

    // Recursively filter subcircuits
    const filteredSubcircuits = (circuit.subcircuits || [])
      .map(shouldIncludeCircuit)
      .filter(Boolean) as CircuitSchemaProps[];

    if (circuitMatches || filteredSubcircuits.length > 0) {
      count += 1;
      return {
        ...circuit,
        subcircuits: filteredSubcircuits,
      };
    }

    return null;
  }

  const filteredTree = circuits.map(shouldIncludeCircuit).filter(Boolean) as CircuitSchemaProps[];

  return {
    filteredTree,
    count,
  };
}
