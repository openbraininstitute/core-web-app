'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type {
  ScanConfigEntitySourceMode,
  TResolvedScanConfigEntity,
  TScanConfigEntitySource,
} from '@/features/scan-config/workflow/types';
import type { WorkspaceContext } from '@/types/common';

function readRouteEntityId(
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
    }),
    [entitySource.entityType]
  );
}

export function useRouteIdWorkflowEntity({
  entitySource,
  workspace,
  routeParams,
}: {
  entitySource: Extract<
    TScanConfigEntitySource,
    { mode: typeof ScanConfigEntitySourceMode.RouteId }
  >;
  workspace: WorkspaceContext;
  routeParams: Record<string, string | undefined>;
}): TResolvedScanConfigEntity {
  const param = entitySource.param ?? 'id';
  const entityId = readRouteEntityId(routeParams, param);

  if (!entityId) {
    throw new Error(`Missing route param "${param}" for scan config workflow entity`);
  }

  const { data: entity } = useSuspenseQuery({
    queryKey: entitySource.query.queryKey({ context: workspace, id: entityId }),
    queryFn: () => entitySource.query.queryFn({ context: workspace, id: entityId }),
  });

  return {
    entity,
    entityType: entity.type,
    entityId: entity.id,
  };
}
