import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, isNil } from 'es-toolkit/compat';
import { useSession } from 'next-auth/react';

import {
  getOnboardingStatus,
  updateOnboardingStatus,
} from '@/api/virtual-lab-svc/queries/onboarding';

import type {
  TOnboardingFeature,
  VlmOnboardingResponse,
} from '@/api/virtual-lab-svc/queries/types';

export const onboardingKeys = {
  all: ['onboarding'] as const,
  status: () => [...onboardingKeys.all, 'status'] as const,
};

/**
 * fetching onboarding status
 */
export function useOnboardingStatus() {
  const session = useSession();

  const query = useQuery({
    queryKey: onboardingKeys.status(),
    queryFn: getOnboardingStatus,
    staleTime: Infinity,
    retry: 2,
    enabled: session.status === 'authenticated',
    select: (response: VlmOnboardingResponse) => response.data,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetched: query.isFetched,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * updating onboarding status
 */
export function useUpdateOnboardingStatus() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      tour,
      completed,
      current_step,
      dismissed,
    }: {
      tour: TOnboardingFeature;
      completed?: boolean;
      current_step?: number | null;
      dismissed?: boolean;
    }) => {
      const payload: {
        completed?: boolean | null;
        current_step?: number | null;
        dismissed?: boolean | null;
      } = {};

      if (!isNil(completed)) {
        payload.completed = completed;
      }
      if (!isNil(current_step)) {
        payload.current_step = current_step;
      }
      if (!isNil(dismissed)) {
        payload.dismissed = dismissed;
      }

      return updateOnboardingStatus({ feature: tour, payload });
    },
    onError() {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.status() });
    },
    onSuccess: (data, vars) => {
      const tourStatus = get(data.data, `${vars.tour}`, null);
      const isDone = tourStatus?.completed || tourStatus?.dismissed;
      if (isDone) {
        queryClient.invalidateQueries({ queryKey: onboardingKeys.status() });
      }
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
