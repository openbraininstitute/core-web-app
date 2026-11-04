'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAppNotification } from '@/components/notification';
import { errorMessage } from '@/utils/error';

import type { QueryKey } from '@tanstack/react-query';

export type AdminWriteOptions<Args, Result> = {
  write: (args: Args) => Promise<Result>;
  done: string;
  failed: string;
  onSuccess?: (result: Result) => void;
};

export function useAdminWrite<Args, Result>({
  refreshes,
  write,
  done,
  failed,
  onSuccess,
}: AdminWriteOptions<Args, Result> & { refreshes: QueryKey }) {
  const notification = useAppNotification();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: write,
    // Awaited so a dialog stays pending until the page shows the new data.
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: refreshes });
      notification.success({ message: done, placement: 'topRight' });
      onSuccess?.(result);
    },
    onError: (error) =>
      notification.error({
        message: failed,
        description: errorMessage(error),
        placement: 'topRight',
      }),
  });
}
