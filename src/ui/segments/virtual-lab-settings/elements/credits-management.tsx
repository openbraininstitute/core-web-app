import { useQueries } from '@tanstack/react-query';
import { SwapOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import { List } from 'antd';

import { getVirtualLabAccountBalance } from '@/services/virtual-lab/labs';
import { listProjects } from '@/api/virtual-lab-svc/queries/project';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { ProjectBalance } from '@/types/accounting';
import { useUserRole } from '@/hooks/use-user-role';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

type Props = {
  virtualLabId: string;
  onTransferCreditsClick?: (args: { virtualLabId: string }) => void;
  onManageProjectCreditsClick?: (args: { virtualLabId: string }) => void;
};

export function CreditsManagement({
  virtualLabId,
  onTransferCreditsClick,
  onManageProjectCreditsClick,
}: Props) {
  const [pagination, setPagination] = useState({ page: 1, pageSize: 5 });
  const { isVirtualLabAdmin: isAdmin } = useUserRole({ virtualLabId });

  const { balanceMap, virtualLabBalance, projects, isLoading } = useQueries({
    queries: [
      {
        queryKey: keyBuilder.accounting({ virtualLabId }),
        queryFn: () => getVirtualLabAccountBalance({ virtualLabId, includeProjects: true }),
        enabled: isAdmin,
      },
      {
        queryKey: keyBuilder.listWorkspaceProjects({ virtualLabId }),
        queryFn: () => listProjects({ virtualLabId, page: 1, size: 20 }),
        enabled: isAdmin,
      },
    ],
    combine([accountingQuery, projectsQuery]) {
      const loading = accountingQuery.isLoading || projectsQuery.isLoading;
      const LabBalance = accountingQuery.data?.data.balance;
      const balanceList = (accountingQuery.data?.data.projects ?? []).reduce(
        (map, p) => map.set(p.proj_id, p),
        new Map<string, ProjectBalance>()
      );
      return {
        isLoading: loading,
        balanceMap: balanceList,
        virtualLabBalance: LabBalance,
        projects: projectsQuery.data?.data?.results ?? [],
      };
    },
  });

  const list = useMemo(
    () =>
      projects.map((project) => ({
        id: project.id,
        name: project.name,
        balance: balanceMap.get(project.id)?.balance ?? 0,
      })),
    [projects, balanceMap]
  );

  const handlePageChange = (page: number, size: number) => {
    setPagination({ page, pageSize: size });
  };

  if (!isAdmin) return null;

  return (
    <div className="w-full">
      <div className="my-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          <span className="text-primary-3">Credits:</span>
          <span className="font-bold text-white">{virtualLabBalance}</span>
        </div>
        <div className="ml-auto flex items-center justify-center gap-4">
          <Button
            rounded
            className="border-primary-4 group bg-primary-9 hover:text-primary-4 px-4 text-white select-none hover:border-white"
            size="md"
            variant="outline"
            onClick={() => onManageProjectCreditsClick?.({ virtualLabId })}
          >
            <div className="flex items-center justify-between gap-5">
              Manage credits
              <SwapOutlined className="text-primary-4 group-hover:text-white" />
            </div>
          </Button>
          <Button
            rounded
            size="md"
            variant="outline"
            className="border-primary-4 group bg-primary-9 hover:text-primary-4 px-4 text-white select-none hover:border-white"
            onClick={() => onTransferCreditsClick?.({ virtualLabId })}
          >
            <div className="flex items-center justify-between gap-5">
              Buy credits
              <SwapOutlined className="text-primary-4 group-hover:text-white" />
            </div>
          </Button>
        </div>
      </div>
      <List
        bordered
        id="credit-management-list"
        className={cn(
          'border-primary-4 b bg-primary-9 [&_.ant-list-item]:border-b-primary-4 rounded-md border px-4 pt-4!',
          '[&_.ant-spin-blur]:opacity-0!'
        )}
        loading={isLoading}
        itemLayout="horizontal"
        dataSource={list}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: list.length,
          onChange: handlePageChange,
          showSizeChanger: false,
          hideOnSinglePage: true,
          className: cn(
            '[&_.ant-pagination-item]:bg-primary-9! [&_.ant-pagination-item_a]:text-white! [&_.ant-pagination-item-active]:bg-white! [&_.ant-pagination-item-active_a]:text-primary-9!',
            '[&_.ant-pagination-disabled_button]:text-neutral-1 [&_button.ant-pagination-item-link]:text-white'
          ),
        }}
        renderItem={(item) => (
          <List.Item className="text-white">
            <List.Item.Meta
              className="[&_.ant-list-item-meta-title]:text-white!"
              title={item.name}
              description={
                <div className="flex gap-1.5">
                  <span className="text-primary-3">Credits:</span>
                  <span className="font-bold text-white">{item.balance}</span>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
}
