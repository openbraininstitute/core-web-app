'use client';

import { useEffect, useState } from 'react';
import CircuitTable from '../../../global/CircuitTable';
import { CircuitSchemaProps } from '../../../type';
import { buildCircuitMap } from '../../../utils/circuits-map';

export default function DerivedCircuits({ content }: { content: CircuitSchemaProps }) {
  const [derivedCircuits, setDerivedCircuits] = useState<CircuitSchemaProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDerivedCircuits = async () => {
      try {
        setLoading(true);

        if (!content.derivedFrom || content.derivedFrom.length === 0) {
          setDerivedCircuits([]);
          return;
        }

        const response = await fetch('/circuits/ALL_CIRCUITS.json');

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const circuits: CircuitSchemaProps[] = await response.json();
        const circuitMap = buildCircuitMap(circuits);

        const derived = content.derivedFrom
          .map((key) => circuitMap.get(key))
          .filter((circuit): circuit is CircuitSchemaProps => !!circuit);

        if (derived.length === 0) {
          throw new Error(`No derived circuits found for keys: ${content.derivedFrom.join(', ')}`);
        }

        setDerivedCircuits(derived);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchDerivedCircuits();
  }, [content.derivedFrom]);

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

  if (derivedCircuits.length === 0) {
    return (
      <div className="relative flex h-[50vh] w-full items-center justify-center text-lg font-normal text-primary-9">
        No subcircuits available for this circuit
      </div>
    );
  }

  return (
    <div className="relative flex w-full flex-col">
      <CircuitTable data={derivedCircuits} downloadable={false} hasSearch={false} />
    </div>
  );
}
