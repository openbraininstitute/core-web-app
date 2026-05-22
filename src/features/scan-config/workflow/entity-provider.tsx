'use client';

import {
  ScanConfigEntitySourceMode,
  type TResolvedScanConfigEntity,
  type TScanConfigEntitySource,
} from '@/features/scan-config/workflow/types';
import {
  useRouteIdWorkflowEntity,
  useStaticTypeWorkflowEntity,
} from '@/features/scan-config/workflow/use-workflow-entity';

import type { ReactNode } from 'react';
import type { WorkspaceContext } from '@/types/common';

type TScanConfigWorkflowEntityProviderProps = {
  entitySource: TScanConfigEntitySource;
  workspace: WorkspaceContext;
  routeParams: Record<string, string | undefined>;
  children: (entity: TResolvedScanConfigEntity) => ReactNode;
};

function StaticTypeEntityProvider({
  entitySource,
  children,
}: {
  entitySource: Extract<
    TScanConfigEntitySource,
    { mode: typeof ScanConfigEntitySourceMode.StaticType }
  >;
  children: (entity: TResolvedScanConfigEntity) => ReactNode;
}) {
  const entity = useStaticTypeWorkflowEntity(entitySource);
  return children(entity);
}

function RouteIdEntityProvider({
  entitySource,
  workspace,
  routeParams,
  children,
}: TScanConfigWorkflowEntityProviderProps & {
  entitySource: Extract<
    TScanConfigEntitySource,
    { mode: typeof ScanConfigEntitySourceMode.RouteId }
  >;
}) {
  const entity = useRouteIdWorkflowEntity({ entitySource, workspace, routeParams });
  return children(entity);
}

/** Picks the correct entity hook implementation for the workflow definition. */
export function ScanConfigWorkflowEntityProvider({
  entitySource,
  workspace,
  routeParams,
  children,
}: TScanConfigWorkflowEntityProviderProps) {
  if (entitySource.mode === ScanConfigEntitySourceMode.StaticType) {
    return (
      <StaticTypeEntityProvider entitySource={entitySource}>{children}</StaticTypeEntityProvider>
    );
  }

  return (
    <RouteIdEntityProvider
      entitySource={entitySource}
      workspace={workspace}
      routeParams={routeParams}
    >
      {children}
    </RouteIdEntityProvider>
  );
}
