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

        // Check content type first to detect HTML responses
        const contentType = response.headers.get('content-type') || '';

        // Check if response is OK
        if (!response.ok) {
          const text = await response.text();
          // If response is HTML (error page), provide a more helpful error
          if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
            throw new Error(
              `API returned HTML instead of JSON. Status: ${response.status}. The API route may not be accessible.`
            );
          }
          throw new Error(`Failed to fetch prices: ${response.status} ${response.statusText}`);
        }

        // Check content type to ensure we're getting JSON
        if (!contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(
            `Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`
          );
        }

        const data = await response.json();
        setPrices(data.prices ?? []);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        setPrices([]);
        // eslint-disable-next-line no-console
        console.error('Error fetching prices:', errorMessage, err);
      } finally {
        setLoading(false);
      }
    }

    fetchPrices();
  }, []);

  return { prices, loading, error };
}
