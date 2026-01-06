'use client';

import { useEffect, useState } from 'react';

import type { PlanV2 } from '@/types/pricing/planv2';

interface UsePlanV2Return {
  plans: PlanV2[];
  loading: boolean;
  error: string | null;
}

export function usePlanV2(): UsePlanV2Return {
  const [plans, setPlans] = useState<PlanV2[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlans() {
      try {
        setLoading(true);
        const response = await fetch('/api/sanity/pricing', {
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
          },
        });

        const contentType = response.headers.get('content-type') || '';

        if (!response.ok) {
          const text = await response.text();
          if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
            throw new Error(
              `API returned HTML instead of JSON. Status: ${response.status}. The API route may not be accessible.`
            );
          }
          throw new Error(`Failed to fetch plans: ${response.status} ${response.statusText}`);
        }

        if (!contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(
            `Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`
          );
        }

        const data = await response.json();
        // eslint-disable-next-line no-console
        console.log('usePlanV2: API response', { data, plans: data.plans });
        setPlans(data.plans ?? []);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        setPlans([]);
        // eslint-disable-next-line no-console
        console.error('Error fetching plans:', errorMessage, err);
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
  }, []);

  return { plans, loading, error };
}
