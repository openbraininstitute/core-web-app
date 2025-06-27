import { CircuitSchemaProps, NumericFilterOptions } from '../type';

export function circuitMatchFilter(
  circuit: CircuitSchemaProps,
  filter: NumericFilterOptions | null,
  brainRegionSet?: Set<string>
): boolean {
  if (!filter && !brainRegionSet) {
    return true;
  }

  let matchesFilter = true;
  let matchesBrainRegion = true;

  if (brainRegionSet) {
    if (!circuit.brainRegion) {
      matchesBrainRegion = false;
    } else {
      matchesBrainRegion = brainRegionSet.has(circuit.brainRegion.trim().toLowerCase());
    }
  }

  if (filter) {
    const { property, type, min, max } = filter;

    if (property === 'scaleType') {
      matchesFilter = circuit.scale === type;
    } else if (property === 'buildCategory') {
      matchesFilter = circuit.buildCategory === type;
    } else if (property === 'numberOfNeurons') {
      const value = circuit.numberOfNeurons;
      if (type === 'greaterThan' && min !== undefined) {
        matchesFilter = value > min;
      } else if (type === 'lessThan' && max !== undefined) {
        matchesFilter = value < max;
      } else if (type === 'between' && min !== undefined && max !== undefined) {
        matchesFilter = value >= min && value <= max;
      } else {
        matchesFilter = false;
      }
    } else if (property === 'numberOfConnections') {
      const value = circuit.numberOfConnections;
      if (type === 'greaterThan' && min !== undefined) {
        matchesFilter = value > min;
      } else if (type === 'lessThan' && max !== undefined) {
        matchesFilter = value < max;
      } else if (type === 'between' && min !== undefined && max !== undefined) {
        matchesFilter = value >= min && value <= max;
      } else {
        matchesFilter = false;
      }
    } else if (property === 'numberOfSynapses') {
      const value = circuit.numberOfSynapses;
      if (type === 'greaterThan' && min !== undefined) {
        matchesFilter = value > min;
      } else if (type === 'lessThan' && max !== undefined) {
        matchesFilter = value < max;
      } else if (type === 'between' && min !== undefined && max !== undefined) {
        matchesFilter = value >= min && value <= max;
      } else {
        matchesFilter = false;
      }
    }
  }

  return matchesFilter && matchesBrainRegion;
}
