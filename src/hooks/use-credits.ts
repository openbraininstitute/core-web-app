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
        if (!response.ok) {
          throw new Error('Failed to fetch credits packs');
        }
        const data = await response.json();
        setCreditsPacks(data.creditsPacks ?? []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setCreditsPacks([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCredits();
  }, []);

  return { creditsPacks, loading, error };
}
