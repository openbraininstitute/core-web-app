import { useEffect, useState } from 'react';

import { CircuitSchemaProps } from '@/components/explore-section/Circuit/type';

type CircuitDataType = 'parent' | 'subcircuits' | 'derivedFrom';

export type CircuitDataResponse = {
  parent?: CircuitSchemaProps | null;
  subcircuits?: CircuitSchemaProps[];
  derivedFrom?: CircuitSchemaProps[];
  loading: boolean;
  error: string | null;
}

const buildCircuitMap = (circuits: CircuitSchemaProps[]): Map<string, CircuitSchemaProps> => {
  const circuitMap = new Map<string, CircuitSchemaProps>();
  
  circuits.forEach((circuit) => {
    circuitMap.set(circuit.key, circuit);
  });
  
  return circuitMap;
};

const useCircuitData = (content: CircuitSchemaProps, dataType: CircuitDataType): CircuitDataResponse => {
  const [data, setData] = useState<{
    parent: CircuitSchemaProps | null;
    subcircuits: CircuitSchemaProps[];
    derivedFrom: CircuitSchemaProps[];
  }>({
    parent: null,
    subcircuits: [],
    derivedFrom: [],
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCircuitData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (dataType === 'subcircuits') {
          
          setData((prev) => ({
            ...prev,
            subcircuits: content.subcircuits || [],
          }));
          return;
        }

        if (dataType === 'parent' && !content.parent) {
          setError(`Circuit with key "${content.key}" has no parent`);
          return;
        }

        if (dataType === 'derivedFrom' && (!content.derivedFrom || content.derivedFrom.length === 0)) {
          setError(`Circuit with key "${content.key}" has no derived circuits`);
          return;
        }

        const response = await fetch('/circuits/ALL_CIRCUITS.json');

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const circuits: CircuitSchemaProps[] = await response.json();
        const circuitMap = buildCircuitMap(circuits);

        if (dataType === 'parent') {
          const parentCircuit = circuitMap.get(content.parent!);
          if (!parentCircuit) {
            throw new Error(`Parent circuit with key "${content.parent}" not found`);
          }
          setData((prev) => ({
            ...prev,
            parent: parentCircuit,
          }));
        } else if (dataType === 'derivedFrom') {
          const derivedCircuits = content.derivedFrom
            .map((key) => circuitMap.get(key))
            .filter((circuit): circuit is CircuitSchemaProps => !!circuit);
          if (derivedCircuits.length === 0) {
            throw new Error(`No derived circuits found for keys "${content.derivedFrom.join(', ')}"`);
          }
          setData((prev) => ({
            ...prev,
            derivedFrom: derivedCircuits,
          }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchCircuitData();
  }, [content, dataType]);

  return {
    parent: data.parent,
    subcircuits: data.subcircuits,
    derivedFrom: data.derivedFrom,
    loading,
    error,
  };
};

export default useCircuitData;