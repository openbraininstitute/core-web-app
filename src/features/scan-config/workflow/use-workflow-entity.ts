'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getSupportedEntityTypesForScanConfiguration } from '@/features/scan-config/types';
import {
  getPrimarySelectionRef,
  readWorkflowSelection,
} from '@/features/scan-config/workflow/selection';

import type {
  TWorkflowSelectionPayload,
  TWorkflowSelectionRef,
} from '@/features/scan-config/workflow/selection/types';
import type {
  ScanConfigEntitySourceMode,
  TResolvedScanConfigEntity,
  TScanConfigEntitySource,
} from '@/features/scan-config/workflow/types';
import type { WorkspaceContext } from '@/types/common';

function readRouteSessionId(
  routeParams: Record<string, string | undefined>,
  param = 'id'
): string | undefined {
  return routeParams[param];
}

export function useStaticTypeWorkflowEntity(
  entitySource: Extract<
    TScanConfigEntitySource,
    { mode: typeof ScanConfigEntitySourceMode.StaticType }
  >
): TResolvedScanConfigEntity {
  return useMemo(
    () => ({
      entity: null,
      entityType: entitySource.entityType,
      workflowSelection: null,
    }),
    [entitySource.entityType]
  );
}

export function useSessionSelectionOnlyWorkflowEntity({
  routeParams,
  param = 'id',
}: {
  routeParams: Record<string, string | undefined>;
  param?: string;
}): TResolvedScanConfigEntity {
  const sessionId = readRouteSessionId(routeParams, param);
  const workflowSelection = sessionId ? readWorkflowSelection(sessionId) : null;
  const primaryRef = workflowSelection ? getPrimarySelectionRef(workflowSelection) : null;

  return useMemo(
    () => ({
      entity: null,
      entityType: primaryRef?.type ?? ExtendedEntitiesTypeDict.UniversalCellMorphology,
      entityId: primaryRef?.id,
      workflowSelection,
    }),
    [primaryRef?.id, primaryRef?.type, workflowSelection]
  );
}

export function useSessionWithQueryWorkflowEntity({
  entitySource,
  workspace,
  primaryRef,
  workflowSelection,
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
  primaryRef: TWorkflowSelectionRef;
  workflowSelection: TWorkflowSelectionPayload;
}): TResolvedScanConfigEntity {
  const { data: entity } = useSuspenseQuery({
    queryKey: entitySource.query.queryKey({ context: workspace, id: primaryRef.id }),
    queryFn: () => entitySource.query.queryFn({ context: workspace, id: primaryRef.id }),
  });

  return {
    entity,
    entityType: getSupportedEntityTypesForScanConfiguration({ entity }),
    entityId: entity.id,
    workflowSelection,
  };
}

export function readSessionSelectionFromRoute(
  routeParams: Record<string, string | undefined>,
  param = 'id'
): {
  sessionId: string | undefined;
  workflowSelection: TWorkflowSelectionPayload | null;
  primaryRef: TWorkflowSelectionRef | null;
} {
  const sessionId = readRouteSessionId(routeParams, param);
  const workflowSelection = sessionId ? readWorkflowSelection(sessionId) : null;
  const primaryRef = workflowSelection ? getPrimarySelectionRef(workflowSelection) : null;

  return { sessionId, workflowSelection, primaryRef };
}
