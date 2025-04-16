'use client';

import { useEffect, useState } from 'react';
import CircuitTable from '../../../global/CircuitTable';
import { CircuitSchemaProps } from '../../../type';
import { buildCircuitMap } from '../../../utils/circuits-map';

export default function Subcircuits({ content }: { content: CircuitSchemaProps }) {
  const [subcircuitsData, setSubcircuitsData] = useState<CircuitSchemaProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubcircuits = async () => {
      try {
        setLoading(true);
        const response = await fetch('/circuits/ALL_CIRCUITS.json');

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const circuits: CircuitSchemaProps[] = await response.json();
        const circuitMap = buildCircuitMap(circuits);
        const matchingCircuit = circuitMap.get(content.key);

        if (!matchingCircuit) {
          throw new Error(`Circuit with key "${content.key}" not found`);
        }

        setSubcircuitsData(matchingCircuit.subcircuit || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchSubcircuits();
  }, [content.key]);

  if (loading) {
    return (
      <div className="relative flex h-[50vh] w-full items-center justify-center text-lg font-normal text-primary-9">
        Loading subcircuits...
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

  if (subcircuitsData.length === 0) {
    return (
      <div className="relative flex h-[50vh] w-full items-center justify-center text-lg font-normal text-primary-9">
        No subcircuits available for this circuit
      </div>
    );
  }

  return (
    <div className="relative flex w-full flex-col">
      <CircuitTable data={subcircuitsData} downloadable={false} hasSearch={false} />
    </div>
  );
}
