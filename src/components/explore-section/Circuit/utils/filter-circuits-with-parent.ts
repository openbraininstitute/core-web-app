import { CircuitSchemaProps, FilteredCircuit, NumericFilterOptions } from '../type';
import { circuitMatchFilter } from './circuits-match-filter';

export function filterCircuitsWithParents(
  circuits: CircuitSchemaProps[],
  numericFilter: NumericFilterOptions | null,
  minValue: number | undefined,
  maxValue: number | undefined,
  searchQuery: string | undefined,
  hideNonMatchingParents: boolean = false
): FilteredCircuit[] {
  const filtered: FilteredCircuit[] = [];

  // IF NO FILTERS OR SEARCH, RETURN ALL CIRCUITS
  if (!numericFilter && (!searchQuery || searchQuery.trim() === '')) {
    return circuits.map((circuit) => ({
      ...circuit,
      isNonMatchingParent: false,
      subcircuits: circuit.subcircuits
        ? filterCircuitsWithParents(
            circuit.subcircuits,
            numericFilter,
            minValue,
            maxValue,
            searchQuery,
            hideNonMatchingParents
          )
        : [],
    }));
  }

  function shouldIncludeCircuit(circuit: CircuitSchemaProps): {
    include: boolean;
    matches: boolean;
    hasMatchingDescendant: boolean;
  } {
    const matches = circuitMatchFilter(
      circuit,
      numericFilter,
      minValue,
      maxValue,
      searchQuery || ''
    );

    let hasMatchingDescendant = false;
    let filteredSubcircuits: {
      include: boolean;
      matches: boolean;
      hasMatchingDescendant: boolean;
    }[] = [];

    if (circuit.subcircuits && circuit.subcircuits.length > 0) {
      filteredSubcircuits = circuit.subcircuits.map((sub) => shouldIncludeCircuit(sub));
      hasMatchingDescendant = filteredSubcircuits.some(
        (result) => result.matches || result.hasMatchingDescendant
      );
    }

    const include = matches || (!hideNonMatchingParents && hasMatchingDescendant);

    return { include, matches, hasMatchingDescendant };
  }

  for (const circuit of circuits) {
    const { include, matches, hasMatchingDescendant } = shouldIncludeCircuit(circuit);
    if (include) {
      const filteredCircuit: FilteredCircuit = {
        ...circuit,
        isNonMatchingParent: !matches && hasMatchingDescendant,
        subcircuits: circuit.subcircuits
          ? filterCircuitsWithParents(
              circuit.subcircuits,
              numericFilter,
              minValue,
              maxValue,
              searchQuery
            )
          : [],
      };
      filtered.push(filteredCircuit);
    }
  }

  return filtered;
}
