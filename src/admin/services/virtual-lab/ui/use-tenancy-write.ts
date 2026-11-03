'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAppNotification } from '@/components/notification';
import { errorMessage } from '@/utils/error';

import { adminQueryKeys } from '../../../shared/query-keys';

// Labs, projects, members and users all show each other's data, so a write refreshes them all.
export function useTenancyWrite<Args>({
  write,
  done,
  failed,
  onSuccess,
}: {
  write: (args: Args) => Promise<unknown>;
  done: string;
  failed: string;
  onSuccess?: () => void;
}) {
  const notification = useAppNotification();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: write,
    // Awaited so a dialog stays pending until the page shows the new data.
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.tenancy() });
      notification.success({ message: done, placement: 'topRight' });
      onSuccess?.();
    },
    onError: (error) =>
      notification.error({
        message: failed,
        description: errorMessage(error),
        placement: 'topRight',
      }),
  });
}
