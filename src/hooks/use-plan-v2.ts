'use client';

import { useEffect, useState } from 'react';

import { getPricingContent } from '@/services/sanity';

import type { PlanV2 } from '@/types/virtual-lab/pricing';

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
        const data = await getPricingContent();
        setPlans(data ?? []);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        setPlans([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
  }, []);

  return { plans, loading, error };
}
