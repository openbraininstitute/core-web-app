import { useQuery } from '@tanstack/react-query';

import { useAppNotification } from '@/components/notification';
import { InsufficientCreditsCard } from '@/components/notification/insufficient-credits-card';
import { useInsufficientCredits } from '@/hooks/use-insufficient-credits';
import { getProjectAccountBalance } from '@/services/virtual-lab/projects';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import { useWorkspaceMembership } from './use-user-membership';

import type { WorkspaceContext } from '@/types/common';

export function useCreditsAccessGuard({
  context,
  message,
  description,
}: {
  context: WorkspaceContext;
  message: string;
  description: string;
}) {
  const { error: notifyError } = useAppNotification();

  const { isVirtualLabAdmin } = useWorkspaceMembership({ virtualLabId: context.virtualLabId });
  const { cardProps, creditsModal } = useInsufficientCredits();
  const { data: balanceData } = useQuery({
    queryKey: keyBuilder.wallet({ ...context }),
    queryFn: () => getProjectAccountBalance({ ...context }),
    enabled: !!context.virtualLabId && !!context.projectId,
  });

  const showInsufficientCreditsError = () => {
    const notificationKey = 'insufficient-credits';
    notifyError({
      message,
      description: (
        <InsufficientCreditsCard
          message={description}
          {...cardProps}
          onAddCredits={() => {
            notifyError.destroy?.(notificationKey);
            cardProps.onAddCredits();
          }}
        />
      ),
      key: notificationKey,
      placement: 'topRight',
      duration: 0,
    });
  };

  const projectBalance = balanceData?.balance != null ? Number(balanceData.balance) : null;
  const hasNoCredits = projectBalance !== null && projectBalance <= 0;

  return {
    shouldShowError: hasNoCredits && !isVirtualLabAdmin,
    notifyCredits: showInsufficientCreditsError,
    creditsModal: cardProps.onAddCredits ? creditsModal : null,
  };
}
