'use client';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  ScanConfigEntitySourceMode,
  type TResolvedScanConfigEntity,
  type TScanConfigEntitySource,
} from '@/features/scan-config/workflow/types';
import {
  readSessionSelectionFromRoute,
  useSessionSelectionOnlyWorkflowEntity,
  useSessionWithQueryWorkflowEntity,
  useStaticTypeWorkflowEntity,
} from '@/features/scan-config/workflow/use-workflow-entity';
import { log } from '@/utils/logger';

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

function SessionWithQueryEntityProvider({
  entitySource,
  workspace,
  routeParams,
  children,
}: TScanConfigWorkflowEntityProviderProps & {
  entitySource: Extract<
    TScanConfigEntitySource,
    { mode: typeof ScanConfigEntitySourceMode.Session }
  > & {
    query: NonNullable<
      Extract<TScanConfigEntitySource, { mode: typeof ScanConfigEntitySourceMode.Session }>['query']
    >;
  };
}) {
  log('debug', '[SessionWithQueryEntityProvider]', { entitySource, workspace, routeParams });
  const param = entitySource.param ?? 'id';
  const { workflowSelection, primaryRef } = readSessionSelectionFromRoute(routeParams, param);

  if (!workflowSelection || !primaryRef) {
    return children({
      entity: null,
      entityType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
      workflowSelection: null,
    });
  }

  return (
    <SessionWithQueryEntityLoaded
      entitySource={entitySource}
      workspace={workspace}
      primaryRef={primaryRef}
      workflowSelection={workflowSelection}
    >
      {children}
    </SessionWithQueryEntityLoaded>
  );
}

function SessionWithQueryEntityLoaded({
  entitySource,
  workspace,
  primaryRef,
  workflowSelection,
  children,
}: {
  entitySource: Extract<
    TScanConfigEntitySource,
    { mode: typeof ScanConfigEntitySourceMode.Session }
  > & {
    query: NonNullable<
      Extract<TScanConfigEntitySource, { mode: typeof ScanConfigEntitySourceMode.Session }>['query']
    >;
  };
  workspace: WorkspaceContext;
  primaryRef: NonNullable<ReturnType<typeof readSessionSelectionFromRoute>['primaryRef']>;
  workflowSelection: NonNullable<
    ReturnType<typeof readSessionSelectionFromRoute>['workflowSelection']
  >;
  children: (entity: TResolvedScanConfigEntity) => ReactNode;
}) {
  const entity = useSessionWithQueryWorkflowEntity({
    entitySource,
    workspace,
    primaryRef,
    workflowSelection,
  });
  return children(entity);
}

function SessionSelectionOnlyEntityProvider({
  entitySource,
  routeParams,
  children,
}: Pick<TScanConfigWorkflowEntityProviderProps, 'entitySource' | 'routeParams' | 'children'> & {
  entitySource: Extract<
    TScanConfigEntitySource,
    { mode: typeof ScanConfigEntitySourceMode.Session }
  >;
}) {
  const entity = useSessionSelectionOnlyWorkflowEntity({
    routeParams,
    param: entitySource.param,
  });
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

  if (entitySource.query) {
    return (
      <SessionWithQueryEntityProvider
        entitySource={{ ...entitySource, query: entitySource.query }}
        workspace={workspace}
        routeParams={routeParams}
      >
        {children}
      </SessionWithQueryEntityProvider>
    );
  }

  return (
    <SessionSelectionOnlyEntityProvider entitySource={entitySource} routeParams={routeParams}>
      {children}
    </SessionSelectionOnlyEntityProvider>
  );
}
