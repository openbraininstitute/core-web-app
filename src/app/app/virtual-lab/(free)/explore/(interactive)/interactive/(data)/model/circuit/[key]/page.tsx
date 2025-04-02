'use client'

import CIRCUITS_FULL from "@/components/explore-section/Circuit/content/circuits_tree_formatted";
import MainDetailViewCore from "@/components/explore-section/Circuit/DetailView/MainDetailViewCore";
import { CircuitSchemaProps } from "@/components/explore-section/Circuit/type";

export function findCircuitByKey(key: string): CircuitSchemaProps | null {
    function search(circuits: CircuitSchemaProps[]): CircuitSchemaProps | null {
      for (const circuit of circuits) {
        if (circuit.key === key) {
          return circuit;
        }
        if (circuit.hasSubcircuits && circuit.subcircuit.length > 0) {
          const found = search(circuit.subcircuit);
          if (found) return found;
        }
      }
      return null;
    }
  
    return search(CIRCUITS_FULL);
  }

export default function CircuitDetailPage({
    params
}:{
    params: {
        key: string;
    };
}) {

    const content = findCircuitByKey(params.key);
    if (!content) {
        return (
            <div className="relative w-full flex flex-col">
                <p>Circuit not found</p>
            </div>
        );
    }

    return (
        <div className="relative w-full flex flex-col">
            <MainDetailViewCore content={content} />
        </div>
    )
}   