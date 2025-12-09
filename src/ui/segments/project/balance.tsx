import { LoadingOutlined, WarningOutlined } from '@ant-design/icons';
import { useQueries } from '@tanstack/react-query';
import { match, P } from 'ts-pattern';
import { useState } from 'react';

import { CreditsTransferModal } from '@/ui/segments/project/credits/credits-transfer-modal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { getProjectAccountBalance } from '@/services/virtual-lab/projects';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { CoinsIcon } from '@/components/icons/buttons';
import { makeRoles } from '@/hooks/use-user-role';
import { Badge } from '@/ui/molecules/badge';
import { cn } from '@/utils/css-class';
import { ProjectBalance } from '@/types/accounting';
import { VlmUserGroupsResponse } from '@/api/virtual-lab-svc/queries/types';

export function Wallet() {
  const breakpoint = useDefaultBreakpoint();
  const { virtualLabId, projectId } = useWorkspace();
  const [showCreditsManagement, setShowCreditsManagement] = useState(false);
  const handleTransferCredits = () => setShowCreditsManagement((prev) => !prev);

  const [{ data, isLoading, isError, isSuccess, error }, { data: roles, isLoading: loadingRoles }] =
    useQueries({
      queries: [
        {
          queryKey: keyBuilder.wallet({ virtualLabId, projectId }),
          queryFn: () => getProjectAccountBalance({ virtualLabId, projectId }),
          select: (res: ProjectBalance) => res.balance,
        },
        {
          queryKey: keyBuilder.roles(),
          queryFn: getUserGroups,
          select: (res: VlmUserGroupsResponse) => makeRoles(res, virtualLabId, projectId),
        },
      ],
    });

  const isAdmin = roles?.isVirtualLabAdmin;

  const content = match({ isError, isLoading, loadingRoles, isSuccess, data, error })
    .with(
      P.when((s) => s.isLoading || s.loadingRoles),
      () => <LoadingOutlined spin />
    )
    .with({ isError: true, error: P.select() }, (err) => (
      <Tooltip>
        <TooltipTrigger asChild>
          <WarningOutlined />
        </TooltipTrigger>
        <TooltipContent side="bottom" showArrow={false} className="max-w-48 text-wrap">
          {err?.message}
        </TooltipContent>
      </Tooltip>
    ))
    .with({ isSuccess: true, data: P.select() }, (balance) => <>{balance}</>)
    .otherwise(() => null);

  return (
    <>
      <Tooltip>
        <TooltipTrigger>
          <Badge
            rounded
            id="workspace-project-credits"
            className={cn('min-w-16 cursor-pointer font-bold select-none', {
              'pointer-events-none cursor-not-allowed!': !isAdmin,
            })}
            variant="outline"
            size={breakpoint === 'xl' ? 'lg' : 'md'}
            aria-disabled={!isAdmin || loadingRoles || isLoading || isError}
            onClick={isAdmin ? handleTransferCredits : undefined}
          >
            <CoinsIcon />
            {content}
          </Badge>
        </TooltipTrigger>
        {!isAdmin && (
          <TooltipContent
            avoidCollisions
            side="bottom"
            sideOffset={5}
            collisionPadding={{ bottom: 20 }}
            className="text-primary-8 max-w-2xs bg-white text-base shadow-lg"
            arrowClassName="bg-white"
          >
            For more information, please contact the Virtual lab administrators.
          </TooltipContent>
        )}
      </Tooltip>
      <CreditsTransferModal open={showCreditsManagement} onClose={handleTransferCredits} />
    </>
  );
}
