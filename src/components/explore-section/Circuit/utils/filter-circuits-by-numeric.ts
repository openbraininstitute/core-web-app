import { CircuitSchemaProps, NumericFilterProperty, NumericFilterType } from '../type';

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
        case 'numberOfNeurons':
          value = circuit.numberOfNeurons;
          break;
        case 'numberOfConnections':
          value = circuit.numberOfConnections;
          break;
        case 'numberOfSynapses':
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

      const filteredsubcircuits = circuit.subcircuits
        ? filterCircuitsByNumeric(circuit.subcircuits, options)
        : [];

      if (matches || filteredsubcircuits.length > 0) {
        return {
          ...circuit,
          subcircuits: filteredsubcircuits ?? [],
        };
      }

      return null;
    })
    .filter((circuit): circuit is CircuitSchemaProps => circuit !== null);
};

export default filterCircuitsByNumeric;
