import { useQuery } from '@tanstack/react-query';

import { listVirtualLabMembers } from '@/api/virtual-lab-svc/queries/member';
import { useAppNotification } from '@/components/notification';
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
  const { data: balanceData } = useQuery({
    queryKey: keyBuilder.wallet({ ...context }),
    queryFn: () => getProjectAccountBalance({ ...context }),
    enabled: !!context.virtualLabId && !!context.projectId,
  });

  const { data: membersData } = useQuery({
    queryKey: keyBuilder.listVirtualLabTeam({ virtualLabId: context.virtualLabId }),
    queryFn: () => listVirtualLabMembers({ virtualLabId: context.virtualLabId }),
    enabled: !!context.virtualLabId && !isVirtualLabAdmin,
  });
  const adminEmailFromQuery = membersData?.data?.users.find((user) => user.role === 'admin')?.email;

  const showInsufficientCreditsError = () => {
    let adminEmail = adminEmailFromQuery;
    if (!adminEmail && context.virtualLabId) {
      try {
        adminEmail = membersData?.data?.users.find((user) => user.role === 'admin')?.email;
      } catch {
        // ignore
      }
    }
    notifyError({
      message,
      description: (
        <div className="flex flex-col gap-2">
          <p>{description}</p>
          {adminEmail ? (
            <a
              href={`mailto:${adminEmail}?subject=Insufficient%20credits%20for%20simulation`}
              className="text-primary-8 border-neutral-300 inline-flex w-fit rounded-full border px-4 py-1.5 no-underline hover:underline"
            >
              Contact administrator
            </a>
          ) : (
            <p className="text-sm text-gray-600">
              Contact your virtual lab administrator to request credits.
            </p>
          )}
        </div>
      ),
      placement: 'topRight',
      duration: 0,
    });
  };

  const projectBalance = balanceData?.balance != null ? Number(balanceData.balance) : null;
  const hasNoCredits = projectBalance !== null && projectBalance <= 0;

  return {
    shouldShowError: hasNoCredits && !isVirtualLabAdmin,
    notifyCredits: showInsufficientCreditsError,
  };
}
