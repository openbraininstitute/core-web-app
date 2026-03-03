'use client';

import { useScope } from '@/ui/hooks/use-scope';
import {
  makeSelectEntityClickEvent,
  useMiniDetailView,
} from '@/ui/segments/mini-detail-view/event';
import { WorkspaceScopeSelector } from '@/ui/segments/shared/scope-selector';

import type { TWorkspaceScope } from '@/constants';

export function WorkflowScopeTabs({
  className,
  defaultScope,
}: {
  className?: string;
  defaultScope?: TWorkspaceScope;
}) {
  const { setMdv } = useMiniDetailView();
  const { scope: activeTab, changeScope } = useScope({ clearOnDefault: false, defaultScope });

  const onTabClick = (value: TWorkspaceScope) => {
    makeSelectEntityClickEvent({ display: false, data: null });
    setMdv(false);
    changeScope(value);
  };

  const onValueChange = (value: string) => {
    onTabClick(value as TWorkspaceScope);
  };

  return (
    <WorkspaceScopeSelector
      activeTab={activeTab as string}
      onValueChange={onValueChange}
      className={className}
    />
  );
}
