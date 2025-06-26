import { useEffect, useState } from 'react';
import { CircuitSchemaProps } from '../type';

export const useBuildCategoryData = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/circuits/ALL_CIRCUITS.json');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: CircuitSchemaProps[] = await response.json();

        const uniqueCategories = Array.from(
          new Set(data.map((circuit) => circuit.buildCategory))
        ).filter((category): category is string => category !== undefined);

        setCategories(uniqueCategories);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch circuit categories');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return { categories, isLoading, error };
};
