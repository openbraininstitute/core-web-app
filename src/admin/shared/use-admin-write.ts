'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAppNotification } from '@/components/notification';

import { errorReason } from './errors';

import type { QueryKey } from '@tanstack/react-query';

export type AdminWriteOptions<Args> = {
  write: (args: Args) => Promise<unknown>;
  done: string;
  failed: string;
  onSuccess?: () => void;
};

// `refreshes` is the query key prefix of everything the write can change.
export function useAdminWrite<Args>({
  refreshes,
  write,
  done,
  failed,
  onSuccess,
}: AdminWriteOptions<Args> & { refreshes: QueryKey }) {
  const notification = useAppNotification();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: write,
    // Awaited so a dialog stays pending until the page shows the new data.
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: refreshes });
      notification.success({ message: done, placement: 'topRight' });
      onSuccess?.();
    },
    onError: (error) =>
      notification.error({
        message: failed,
        description: errorReason(error),
        placement: 'topRight',
      }),
  });
}
