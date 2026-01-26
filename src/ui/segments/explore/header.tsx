'use client';

import { PlusOutlined } from '@ant-design/icons';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { config } from '@/config';
import { type TWorkspaceScope, WorkspaceScope } from '@/constants';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useScope } from '@/ui/hooks/use-scope';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { makeSelectContributionEntityClickEvent } from '@/ui/segments/contribute/event';
import {
  makeSelectEntityClickEvent,
  useMiniDetailView,
} from '@/ui/segments/mini-detail-view/event';
import { WorkspaceScopeSelector } from '@/ui/segments/shared/scope-selector';

export function DataScopeTabs() {
  const navigate = useRouter().push;
  const pathname = usePathname();
  const { setMdv } = useMiniDetailView();
  const { virtualLabId, projectId } = useWorkspace();
  const { scope: activeTab, changeScope: onChangeTab } = useScope({ clearOnDefault: false });

  const onTabClick = (value: TWorkspaceScope) => {
    makeSelectEntityClickEvent({ display: false, data: null });
    setMdv(false);
    if (
      pathname === `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data` ||
      pathname.startsWith(`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/browse/entity`)
    ) {
      onChangeTab(value);
    } else navigate(`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data?scope=${value}`);
  };

  const handleValueChange = (value: string) => {
    onTabClick(value as TWorkspaceScope);
  };

  return (
    <WorkspaceScopeSelector activeTab={activeTab as string} onValueChange={handleValueChange} />
  );
}

export function DataHeader() {
  const searchParams = useSearchParams();
  const scope = (searchParams.get('scope') as TWorkspaceScope) ?? WorkspaceScope.Public;
  const breakpoint = useDefaultBreakpoint();

  const onContribute = () => {
    makeSelectContributionEntityClickEvent({
      display: true,
      entityType: null,
      sessionId: crypto.randomUUID(),
    });
  };

  return (
    <div className="flex w-full items-center justify-between gap-4 px-3 [grid-area:header]">
      <div className="flex max-w-1/2 items-center justify-center gap-2">
        <DataScopeTabs />
      </div>
      {scope === WorkspaceScope.Project && (
        <div className="max-w-1/2" id="upload-data-selector" data-testid="upload-data-selector">
          <Button
            rounded
            variant="success"
            size={breakpoint === 'xl' ? 'lg' : 'md'}
            type="button"
            className="px-8"
            onClick={onContribute}
          >
            <div className="flex items-center justify-between gap-5">
              <span>Upload data</span>
              <PlusOutlined className="ml-auto text-sm" />
            </div>
          </Button>
        </div>
      )}
    </div>
  );
}
