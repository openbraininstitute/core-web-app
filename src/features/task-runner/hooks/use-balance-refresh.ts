'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { usePrevious } from '@/hooks/hooks';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import { isTerminalActivityStatus } from '../status';

import type { QueryClient } from '@tanstack/react-query';
import type { TActivityStatus } from '@/api/entitycore/types/entities/task-activity';
import type { WorkspaceContext } from '@/types/common';

/**
 * Refetches the project balance: virtual-lab accounting balance + project wallet.
 * Both keys are needed — `BalanceCard` reads `accounting`, the top-nav `Wallet` reads `wallet`.
 */
export function invalidateProjectBalance({
  queryClient,
  context,
}: {
  queryClient: QueryClient;
  context: WorkspaceContext;
}) {
  // Build keys from explicit fields: `context` may carry extra route params, and extra
  // properties in the filter key would prevent React Query's partial matching.
  // `cancelRefetch: false` lets concurrent calls (several task rows finishing on the same
  // poll tick) share one in-flight refetch instead of cancel-restarting it.
  const { virtualLabId, projectId } = context;
  return Promise.all([
    queryClient.invalidateQueries(
      { queryKey: keyBuilder.accounting({ virtualLabId }) },
      { cancelRefetch: false }
    ),
    queryClient.invalidateQueries(
      { queryKey: keyBuilder.wallet({ virtualLabId, projectId }) },
      { cancelRefetch: false }
    ),
  ]);
}

/**
 * Refetches the project balance once when a task transitions in-session from a non-terminal
 * status into a terminal one (DONE releases the reservation into a charge; ERROR/CANCELLED
 * return it to the balance). Does not fire when a status first loads already terminal, so
 * revisiting a page of finished tasks doesn't trigger refetches.
 */
export function useBalanceRefreshOnTaskCompletion({
  status,
  context,
}: {
  status: TActivityStatus | undefined;
  context: WorkspaceContext;
}) {
  const queryClient = useQueryClient();
  const prevStatus = usePrevious(status);

  useEffect(() => {
    const wasActive = prevStatus !== undefined && !isTerminalActivityStatus(prevStatus);
    if (wasActive && status && isTerminalActivityStatus(status)) {
      invalidateProjectBalance({ queryClient, context });
    }
  }, [prevStatus, status, context, queryClient]);
}
