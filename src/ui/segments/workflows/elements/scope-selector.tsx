'use client';

import type { TWorkspaceScope } from '@/constants';
import { useScope } from '@/ui/hooks/use-scope';
import {
  makeSelectEntityClickEvent,
  useMiniDetailView,
} from '@/ui/segments/mini-detail-view/event';
import { WorkspaceScopeSelector } from '@/ui/segments/shared/scope-selector';

export function WorkflowScopeTabs({ className }: { className?: string }) {
  const { setMdv } = useMiniDetailView();
  const { scope: activeTab, changeScope } = useScope({ clearOnDefault: false });

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
