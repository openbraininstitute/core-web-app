import { CircuitSchemaProps } from '@/components/explore-section/Circuit/type';

export type CircuitSearchResult = {
  circuit: CircuitSchemaProps | null;
  parent: CircuitSchemaProps | null;
};

const findCircuitParent = (circuit: CircuitSchemaProps[], key: string) => {
  const result: CircuitSearchResult = { circuit: null, parent: null };

  function search(
    circuitList: CircuitSchemaProps[],
    parentCircuit: CircuitSchemaProps | null = null
  ) {
    for (const circuits of circuitList) {
      if (circuits.key === key) {
        result.circuit = circuits;
        result.parent = parentCircuit;
        return;
      }
      if (circuits.subcircuit && circuits.subcircuit.length > 0) {
        search(circuits.subcircuit, circuits);
      }
    }
  }

  search(circuit);
  return result;
};

export default findCircuitParent;
