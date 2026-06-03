'use client';

import { useMemo } from 'react';

import {
  isWorkflowSessionId,
  readWorkflowSessionSelection,
  resolvePrimarySessionEntityId,
} from '@/features/scan-config/workflow/workflow-session-selection';

import type {
  ScanConfigEntitySourceMode,
  TResolvedScanConfigEntity,
  TScanConfigEntitySource,
} from '@/features/scan-config/workflow/types';
import type { TScanConfigConfigureBinding } from '@/ui/segments/workflows/config/scan-config-binding';

function readRouteParam(
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

export function useSessionWorkflowEntity({
  entitySource,
  routeParams,
  configureBinding,
}: {
  entitySource: Extract<
    TScanConfigEntitySource,
    { mode: typeof ScanConfigEntitySourceMode.Session }
  >;
  routeParams: Record<string, string | undefined>;
  configureBinding: TScanConfigConfigureBinding;
}): TResolvedScanConfigEntity {
  const param = entitySource.param ?? 'id';
  const sessionId = readRouteParam(routeParams, param);

  if (!sessionId || !isWorkflowSessionId(sessionId)) {
    throw new Error(`Missing or invalid workflow session id in route param "${param}"`);
  }

  const workflowSessionSelection = readWorkflowSessionSelection(sessionId);

  return useMemo(() => {
    const entityId = workflowSessionSelection
      ? resolvePrimarySessionEntityId(workflowSessionSelection, configureBinding.browseType)
      : undefined;

    return {
      entity: null,
      entityType: configureBinding.scanConfigEntityType,
      entityId,
      workflowSessionSelection,
    };
  }, [
    configureBinding.browseType,
    configureBinding.scanConfigEntityType,
    workflowSessionSelection,
  ]);
}
