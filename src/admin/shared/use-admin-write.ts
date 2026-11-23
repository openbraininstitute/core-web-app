'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAppNotification } from '@/components/notification';

import { errorReason } from './errors';

import type { QueryKey } from '@tanstack/react-query';

export type AdminWriteOptions<Args, Result = unknown> = {
  write: (args: Args) => Promise<Result>;
  done: string | ((result: Result) => string);
  failed: string;
  onSuccess?: (result: Result) => void;
};

// `refreshes` is the query key prefix of everything the write can change, if the page shows any.
export function useAdminWrite<Args, Result = unknown>({
  refreshes,
  write,
  done,
  failed,
  onSuccess,
}: AdminWriteOptions<Args, Result> & { refreshes?: QueryKey }) {
  const notification = useAppNotification();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: write,
    // Awaited so a dialog stays pending until the page shows the new data.
    onSuccess: async (result) => {
      if (refreshes) await queryClient.invalidateQueries({ queryKey: refreshes });
      notification.success({
        message: typeof done === 'string' ? done : done(result),
        placement: 'topRight',
      });
      onSuccess?.(result);
    },
    onError: (error) =>
      notification.error({
        message: failed,
        description: errorReason(error),
        placement: 'topRight',
      }),
  });
}
