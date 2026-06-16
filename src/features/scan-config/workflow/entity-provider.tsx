'use client';

import {
  ScanConfigEntitySourceMode,
  type TResolvedScanConfigEntity,
  type TScanConfigEntitySource,
} from '@/features/scan-config/workflow/types';
import {
  useSessionWorkflowEntity,
  useStaticTypeWorkflowEntity,
} from '@/features/scan-config/workflow/use-workflow-entity';

import type { ReactNode } from 'react';
import type { TScanConfigConfigureBinding } from '@/ui/segments/workflows/config/scan-config-binding';

type TScanConfigWorkflowEntityProviderProps = {
  entitySource: TScanConfigEntitySource;
  routeParams: Record<string, string | undefined>;
  configureBinding?: TScanConfigConfigureBinding;
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

function SessionEntityProvider({
  entitySource,
  routeParams,
  configureBinding,
  children,
}: {
  entitySource: Extract<
    TScanConfigEntitySource,
    { mode: typeof ScanConfigEntitySourceMode.Session }
  >;
  routeParams: Record<string, string | undefined>;
  configureBinding: TScanConfigConfigureBinding;
  children: (entity: TResolvedScanConfigEntity) => ReactNode;
}) {
  const entity = useSessionWorkflowEntity({ entitySource, routeParams, configureBinding });
  return children(entity);
}

/** Picks the correct entity hook implementation for the workflow definition. */
export function ScanConfigWorkflowEntityProvider({
  entitySource,
  routeParams,
  configureBinding,
  children,
}: TScanConfigWorkflowEntityProviderProps) {
  if (entitySource.mode === ScanConfigEntitySourceMode.StaticType) {
    return (
      <StaticTypeEntityProvider entitySource={entitySource}>{children}</StaticTypeEntityProvider>
    );
  }

  if (!configureBinding) {
    throw new Error('Session scan-config workflows require configureBinding from workflow config');
  }

  return (
    <SessionEntityProvider
      entitySource={entitySource}
      routeParams={routeParams}
      configureBinding={configureBinding}
    >
      {children}
    </SessionEntityProvider>
  );
}
