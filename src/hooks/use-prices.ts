'use client';

import { useEffect, useState } from 'react';

import type { SinglePrice } from '@/app/api/help/prices/route';

interface UsePricesReturn {
  prices: SinglePrice[];
  loading: boolean;
  error: string | null;
}

export function usePrices(): UsePricesReturn {
  const [prices, setPrices] = useState<SinglePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPrices() {
      try {
        setLoading(true);
        const response = await fetch('/api/help/prices');
        if (!response.ok) {
          throw new Error('Failed to fetch prices');
        }
        const data = await response.json();
        setPrices(data.prices ?? []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setPrices([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPrices();
  }, []);

  return { prices, loading, error };
}
