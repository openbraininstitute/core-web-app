import { CircuitSchemaProps } from '../type';

export type NumericFilterProperty = 'neurons' | 'connections' | 'synapses';
export type NumericFilterType = 'greaterThan' | 'lessThan' | 'between';

export type NumericFilterOptions = {
  property: NumericFilterProperty;
  type: NumericFilterType;
  min?: number;
  max?: number;
};

const filterCircuitsByNumeric = (
  circuits: CircuitSchemaProps[],
  options: NumericFilterOptions
): CircuitSchemaProps[] => {
  const { property, type, min, max } = options;

  return circuits
    .map((circuit: CircuitSchemaProps) => {
      let value: number;

      switch (property) {
        case 'neurons':
          value = circuit.numberOfNeurons;
          break;
        case 'connections':
          value = circuit.numberOfConnections;
          break;
        case 'synapses':
          value = circuit.numberOfSynapses;
          break;
        default:
          value = 0;
      }

      let matches = false;

      switch (type) {
        case 'greaterThan':
          matches = min !== undefined && value > min;
          break;
        case 'lessThan':
          matches = max !== undefined && value < max;
          break;
        case 'between':
          matches = min !== undefined && max !== undefined && value > min && value < max;
          break;
        default:
          matches = false;
      }

      const filteredSubcircuits = circuit.subcircuits
        ? filterCircuitsByNumeric(circuit.subcircuits, options)
        : [];

      if (matches || filteredSubcircuits.length > 0) {
        return {
          ...circuit,
          subcircuit: filteredSubcircuits ?? [],
        };
      }

      return null;
    })
    .filter((circuit): circuit is CircuitSchemaProps => circuit !== null && circuit.subcircuit !== undefined);
};

export default filterCircuitsByNumeric;
