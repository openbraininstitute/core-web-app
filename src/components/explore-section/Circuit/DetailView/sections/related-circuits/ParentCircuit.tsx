'use client';

import { useEffect, useState } from 'react';
import CircuitTable from '../../../global/CircuitTable';
import { CircuitSchemaProps } from '../../../type';
import { buildCircuitMap } from '../../../utils/circuits-map';

export default function ParentCircuit({ content }: { content: CircuitSchemaProps }) {
  const [parentCircuitData, setParentCircuitData] = useState<CircuitSchemaProps | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchParentCircuit = async () => {
      const parentKey = content.parent;

      if (!parentKey) {
        setError(`Circuit with key "${content.key}" has no parent`);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch('/circuits/ALL_CIRCUITS.json');

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const circuits: CircuitSchemaProps[] = await response.json();
        const circuitMap = buildCircuitMap(circuits);
        const parentCircuit = circuitMap.get(parentKey);

        if (!parentCircuit) {
          throw new Error(`Parent circuit with key "${parentKey}" not found`);
        }

        setParentCircuitData(parentCircuit);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchParentCircuit();
  }, [content]);

  if (loading) {
    return (
      <div className="relative flex h-[50vh] w-full items-center justify-center text-lg font-normal text-primary-9">
        Loading parent circuit...
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex h-[50vh] w-full items-center justify-center text-lg font-normal text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="relative flex w-full flex-col">
      <CircuitTable
        data={parentCircuitData ? [parentCircuitData] : []}
        hasSearch={false}
        downloadable={false}
      />
    </div>
  );
}
