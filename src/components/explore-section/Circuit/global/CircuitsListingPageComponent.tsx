'use client';

import { useEffect, useState } from 'react';

import ExploreCircuitTable from '@/components/explore-section/Circuit/ListView/ExploreCircuitTable';
import { CircuitSchemaProps } from '@/components/explore-section/Circuit/type';

export type ColumnType = {
  name: string;
  description: string;
  brainRegion: string;
  createdBy: string;
  creationDate: string;
  hasSubcircuits: boolean;
};

export default function CircuitsListingPageComponent() {
  const [circuitsData, setCircuitsData] = useState<CircuitSchemaProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCircuit = async () => {
      try {
        setLoading(true);
        const response = await fetch('/circuits/ALL_CIRCUITS.json');

        if (!response.ok) {
          throw new Error('Error: ' + response.statusText);
        }

        const data: CircuitSchemaProps[] = await response.json();
        setCircuitsData(data);
      } catch (er) {
        setError(er instanceof Error ? er.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchCircuit();
  }, []);

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
        An error occurred: {error}
      </div>
    );
  }

  return <ExploreCircuitTable data={circuitsData} />;
}
