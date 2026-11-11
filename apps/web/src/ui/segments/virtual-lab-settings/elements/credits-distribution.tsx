'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { listProjects } from '@/api/virtual-lab-svc/queries/project';
import { useWorkspaceMembership } from '@/hooks/use-user-membership';
import { getVirtualLabAccountBalance } from '@/services/virtual-lab/labs';
import { EmptyMinimal, ErrorMinimal } from '@/ui/molecules/feedback-card';
import { ListPagination } from '@/ui/molecules/list-pagination';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import type { ProjectBalance } from '@/types/accounting';

const PAGE_SIZE = 7;

function formatCreditsDisplay(balance: string | number) {
  const n = typeof balance === 'number' ? balance : Number(balance);
  return Number.isFinite(n) ? n.toLocaleString() : String(balance);
}

function ProjectCreditsCard({ name, balance }: { name: string; balance: string | number }) {
  return (
    <article
      className={cn(
        'rounded-2xl border border-gray-100 bg-white px-4 py-4',
        'text-primary-9',
        'hover:bg-gray-50'
      )}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 content-start items-start">
        <div className="min-w-0">
          <p className="text-gray-500 text-xs font-medium">Project</p>
          <p className="text-primary-9 line-clamp-3 text-sm font-bold" title={name}>
            {name}
          </p>
        </div>
        <div className="flex flex-col items-end justify-start">
          <p className="text-gray-500 text-xs font-medium">Credits</p>
          <p className="text-primary-9 text-sm font-bold tabular-nums">
            {formatCreditsDisplay(balance)}
          </p>
        </div>
      </div>
    </article>
  );
}

type Props = {
  virtualLabId: string;
};

export function CreditsDistribution({ virtualLabId }: Props) {
  const { isVirtualLabAdmin: isAdmin } = useWorkspaceMembership({ virtualLabId });
  const [page, setPage] = useState(1);

  const { data: accountingData, isLoading: accountingLoading } = useQuery({
    queryKey: keyBuilder.accounting({ virtualLabId }),
    queryFn: () => getVirtualLabAccountBalance({ virtualLabId, includeProjects: true }),
    enabled: isAdmin,
  });

  const { data: projectsResponse, isLoading: projectsLoading } = useQuery({
    queryKey: keyBuilder.listWorkspaceProjects({
      virtualLabId,
      pagination: { page, page_size: PAGE_SIZE },
    }),
    queryFn: () =>
      listProjects({
        virtualLabId,
        pagination: { page, page_size: PAGE_SIZE },
      }),
    enabled: isAdmin,
  });

  const balanceMap = useMemo(() => {
    return (accountingData?.data?.projects ?? []).reduce(
      (map, p) => map.set(p.proj_id, p),
      new Map<string, ProjectBalance>()
    );
  }, [accountingData]);

  const projects = projectsResponse?.data ?? [];
  const totalItems = projectsResponse?.pagination?.total_items ?? 0;

  const list = useMemo(
    () =>
      projects.map((project) => ({
        id: project.id,
        name: project.name,
        balance: balanceMap.get(project.id)?.balance ?? 0,
      })),
    [projects, balanceMap]
  );

  const isLoading = accountingLoading || (isAdmin && projectsLoading);

  if (!isAdmin) {
    return (
      <ErrorMinimal
        tag="Access Denied"
        title="You are not authorized to view this section"
        description="You are not authorized to view this section. You may need additional access to view this content. Please contact the virtual lab administrator for help."
        classNames={{
          container: 'border border-gray-100 rounded-2xl',
        }}
      />
    );
  }

  return (
    <div
      id="credit-distribution-list"
      data-testid="credit-distribution-list"
      className="flex min-h-0 w-full flex-1 flex-col"
    >
      <div
        className={cn(
          'secondary-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden pr-1'
        )}
      >
        {isLoading ? (
          <div className="text-primary-9 flex min-h-32 flex-1 items-center justify-center rounded-2xl bg-white">
            <LoadingOutlined spin className="text-2xl" />
          </div>
        ) : list.length === 0 ? (
          <EmptyMinimal
            title="No projects yet"
            description="There are no projects in this virtual lab to show credit balances for."
            classNames={{
              container: 'border border-gray-100 rounded-2xl',
            }}
          />
        ) : (
          list.map((item) => (
            <ProjectCreditsCard key={item.id} name={item.name ?? ''} balance={item.balance} />
          ))
        )}
      </div>
      <ListPagination current={page} pageSize={PAGE_SIZE} total={totalItems} onChange={setPage} />
    </div>
  );
}
