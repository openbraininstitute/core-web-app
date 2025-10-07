import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useQueries } from '@tanstack/react-query';
import { match, P } from 'ts-pattern';
import { ReactNode } from 'react';
import get from 'es-toolkit/compat/get';

import { listProjectMembers } from '@/api/virtual-lab-svc/queries/member';
import { getProjectStats } from '@/api/virtual-lab-svc/queries/stats';
import { Card, CardContent } from '@/ui/molecules/card';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import type { MembersResponse, VlmProjectStatsResponse } from '@/api/virtual-lab-svc/queries/types';
import type { WorkspaceContext } from '@/types/common';

type Props = WorkspaceContext & {
  cls?: {
    container?: React.ComponentProps<'div'>['className'];
    label?: React.ComponentProps<'span'>['className'];
    value?: React.ComponentProps<'span'>['className'];
    content?: React.ComponentProps<'div'>['className'];
    body?: React.ComponentProps<'div'>['className'];
    error?: React.ComponentProps<'div'>['className'];
  };
  loadingComponent: ReactNode;
};

export function Metrics({ virtualLabId, projectId, cls, loadingComponent }: Props) {
  const [
    { isLoading: isStatsLoading, data: statsData, error: isStatsError, error: statesError },
    { isLoading: isMembersLoading, data: membersData, error: isMembersError },
  ] = useQueries({
    queries: [
      {
        queryKey: keyBuilder.metrics({ virtualLabId, projectId }),
        queryFn: () => getProjectStats(virtualLabId, projectId),
        select: (res: VlmProjectStatsResponse) => res.data,
        retry: false,
      },
      {
        queryKey: keyBuilder.listProjectTeam({ virtualLabId, projectId }),
        queryFn: () => listProjectMembers({ virtualLabId, projectId }),
        select: (res: MembersResponse) => res.data,
      },
    ],
  });

  const isLoading = isStatsLoading || isMembersLoading;
  const isError = Boolean(isStatsError || isMembersError);
  const ownerId = membersData?.owner_id;
  const ownerIdObject = membersData?.users.find((p) => p.id === ownerId);
  const owner = ownerIdObject
    ? `${ownerIdObject.first_name} ${ownerIdObject.last_name}` || ownerIdObject.username
    : 'Unknown';

  const metrics = [
    {
      label: 'Project bookmarks',
      count: statsData?.total_bookmarks ?? 0,
    },
    {
      label: 'Project notebooks',
      count: statsData?.total_notebooks ?? 0,
    },
    {
      label: 'Members',
      count: statsData?.total_members ?? 0,
    },
    {
      label: 'Owner',
      count: owner,
    },
  ];

  return match({ isLoading, isError, statesError })
    .with({ isLoading: true }, () => loadingComponent)
    .with({ isLoading: false, isError: true, statesError: P.select() }, (error) => {
      const errorCode = get(error, 'cause.error_code', null);
      if (errorCode === 'NOT_ALLOWED_OP') {
        return (
          <div
            className={cn(
              'my-6 flex w-full flex-col items-center justify-center gap-2',
              cls?.error
            )}
          >
            <ExclamationCircleOutlined className="text-current" />
            <div className="text-current">You are not allowed to see the project statistics</div>
          </div>
        );
      }

      return (
        <div className={cn('flex w-full flex-col items-center justify-center gap-2', cls?.error)}>
          <ExclamationCircleOutlined className="text-current" />
          <div className="text-current">Error loading metrics</div>
        </div>
      );
    })
    .with({ isLoading: false, isError: false }, () => {
      return (
        <Card shadowless className={cn(cls?.container, 'select-none')}>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className={cn(cls?.content)}>
                <div className={cn(cls?.body)}>
                  {metrics.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-2">
                      <span className={cn(cls?.label)}>{item.label}</span>
                      <span className={cn(cls?.value, 'line-clamp-1')}>{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    })
    .exhaustive(() => null);
}

export default Metrics;
