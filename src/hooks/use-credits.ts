'use client';

import { useEffect, useState } from 'react';

import type { CreditsPack } from '@/app/api/help/credits/route';

interface UseCreditsReturn {
  creditsPacks: CreditsPack[];
  loading: boolean;
  error: string | null;
}

export function useCredits(): UseCreditsReturn {
  const [creditsPacks, setCreditsPacks] = useState<CreditsPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCredits() {
      try {
        setLoading(true);
        const response = await fetch('/api/help/credits');

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
          throw new Error(
            `Failed to fetch credits packs: ${response.status} ${response.statusText}`
          );
        }

        // Check content type to ensure we're getting JSON
        if (!contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(
            `Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`
          );
        }

        const data = await response.json();
        setCreditsPacks(data.creditsPacks ?? []);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        setCreditsPacks([]);
        // eslint-disable-next-line no-console
        console.error('Error fetching credits:', errorMessage, err);
      } finally {
        setLoading(false);
      }
    }

    fetchCredits();
  }, []);

  return { creditsPacks, loading, error };
}
