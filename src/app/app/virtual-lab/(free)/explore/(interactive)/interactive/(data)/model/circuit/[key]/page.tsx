'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import MainDetailViewCore from '@/components/explore-section/Circuit/DetailView/MainDetailViewCore';
import { CircuitSchemaProps } from '@/components/explore-section/Circuit/type';
import { buildCircuitMap } from '@/components/explore-section/Circuit/utils/circuits-map';

export default function CircuitDetailPage() {
  const [circuitData, setCircuitData] = useState<CircuitSchemaProps | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const params = useParams();
  const circuitKey = params?.key as string | undefined;

  useEffect(() => {
    const fetchCircuit = async () => {
      if (!circuitKey) {
        setError('No existing circuit');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch('/api/circuits/data', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error || !Array.isArray(data.circuits)) {
          throw new Error(data.error || 'Invalid response from API');
        }

        const { circuits } = data;
        const circuitMap = buildCircuitMap(circuits);
        const matchingCircuit = circuitMap.get(circuitKey);

        if (!matchingCircuit) {
          throw new Error(`Circuit with key ${circuitKey} not found!`);
        }

        setCircuitData(matchingCircuit);
      } catch (er) {
        setError(
          er instanceof Error ? er.message : 'An error occurred while fetching the circuit data'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCircuit();
  }, [circuitKey]);

  if (loading) {
    return (
      <div className="relative flex h-[50vh] w-full items-center justify-center text-lg font-normal text-primary-9">
        Loading...
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
      {circuitData && <MainDetailViewCore content={circuitData} />}
    </div>
  );
}
