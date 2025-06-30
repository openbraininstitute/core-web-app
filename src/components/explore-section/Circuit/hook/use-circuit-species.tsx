import { useEffect, useState } from 'react';
import { CircuitSchemaProps } from '../type';

export const useCircuitSpecies = () => {
  const [species, setSpecies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpecies = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/circuits/ALL_CIRCUITS.json');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: CircuitSchemaProps[] = await response.json();

        const uniqueSpecies = Array.from(new Set(data.map((circuit) => circuit.species))).filter(
          (specie): specie is string => specie !== undefined
        );

        setSpecies(uniqueSpecies);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch circuit species');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpecies();
  }, []);

  return { species, isLoading, error };
};
