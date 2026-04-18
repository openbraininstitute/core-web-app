'use client';

import { WarningOutlined } from '@ant-design/icons';
import { useQueries } from '@tanstack/react-query';
import { useState } from 'react';
import { match, P } from 'ts-pattern';

import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { CoinsIcon } from '@/components/icons/buttons';
import { makeRoles } from '@/hooks/use-user-membership';
import { getProjectAccountBalance } from '@/services/virtual-lab/projects';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Badge } from '@/ui/molecules/badge';
import { Skeleton } from '@/ui/molecules/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { CreditsTransferModal } from '@/ui/segments/project/credits/credits-transfer-modal';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import type { VlmUserGroupsResponse } from '@/api/virtual-lab-svc/queries/types';
import type { ProjectBalance } from '@/types/accounting';

export function Wallet() {
  const breakpoint = useDefaultBreakpoint();
  const { virtualLabId, projectId } = useWorkspace();
  const [open, setOpen] = useState(false);

  const [{ data, isLoading, isError, isSuccess, error }, { data: roles, isLoading: loadingRoles }] =
    useQueries({
      queries: [
        {
          queryKey: keyBuilder.wallet({ virtualLabId, projectId }),
          queryFn: () => getProjectAccountBalance({ virtualLabId, projectId }),
          select: (res: ProjectBalance) => res.balance,
        },
        {
          queryKey: keyBuilder.membership(),
          queryFn: getUserGroups,
          select: (res: VlmUserGroupsResponse) => makeRoles(res, virtualLabId, projectId),
        },
      ],
    });

  const isAdmin = roles?.isVirtualLabAdmin || roles?.isProjectAdmin;
  const interactive = !!isAdmin && !loadingRoles && !isLoading && !isError;

  const content = match({
    isError,
    isLoading,
    loadingRoles,
    isSuccess,
    data,
    error,
  })
    .with(
      P.when((s) => s.isLoading || s.loadingRoles),
      () => <Skeleton className="h-5 w-14 rounded-full" />
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
        <TooltipTrigger asChild>
          <Badge
            asChild
            rounded
            id="workspace-project-credits"
            className={cn(
              'min-w-16 font-bold bg-background select-none hover:shadow-sm hover:bg-background',
              {
                'cursor-not-allowed': !interactive,
                'cursor-pointer': interactive,
              }
            )}
            variant="outline"
            size={breakpoint === 'xl' ? 'lg' : 'md'}
            aria-disabled={!interactive}
          >
            <button
              type="button"
              onClick={() => interactive && setOpen(true)}
              disabled={!interactive}
              aria-label="View project credits"
            >
              <CoinsIcon />
              <div className="ml-2">{content}</div>
            </button>
          </Badge>
        </TooltipTrigger>
        <TooltipContent
          avoidCollisions
          side="bottom"
          sideOffset={1}
          collisionPadding={{ bottom: 20 }}
          className="text-primary-8 max-w-[200px] bg-white text-base text-balance shadow-lg"
          arrowClassName="bg-white"
        >
          <div className="font-bold">Project Credits</div>
          <p className="hyphens-auto">Credits transferred to this project from the virtual lab.</p>
        </TooltipContent>
      </Tooltip>

      <CreditsTransferModal open={open} onClose={() => setOpen(false)} defaultTab="overview" />
    </>
  );
}
