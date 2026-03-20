'use client';

import { useImperativeHandle } from 'react';

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
  ref,
}: {
  className?: string;
  defaultScope?: TWorkspaceScope;
  ref?: React.RefObject<{ changeScope: (value: TWorkspaceScope | null) => void } | null>;
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

  useImperativeHandle(
    ref,
    () => ({
      changeScope,
    }),
    [changeScope]
  );

  return (
    <WorkspaceScopeSelector
      activeTab={activeTab as string}
      onValueChange={onValueChange}
      className={className}
    />
  );
}
