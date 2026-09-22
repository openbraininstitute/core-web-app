'use client';

import { notFound } from 'next/navigation';
import { use, useMemo } from 'react';

import { ScanConfigWorkflowConfigurePage } from '@/features/scan-config/workflow/page-template';
import { getSimulateCircuitWorkflow } from '@/features/scan-config/workflow/simulate-circuit-workflows';
import {
  ScanConfigEntitySourceMode,
  type TCreateScanConfigWorkflowPageOptions,
  type TScanConfigWorkflowDefinition,
} from '@/features/scan-config/workflow/types';
import {
  findScanConfigRegistryByDefinition,
  getWorkflow,
} from '@/ui/segments/workflows/config/helpers';
import { resolveExtendedTypeFromPathParamUrl } from '@/utils/url-builder';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { TActivityValue } from '@/ui/segments/workflows/config/types';
import type { KebabCase } from '@/utils/type';

type ConfigurePageParams = WorkspaceContext & { id?: string; type?: string };
type ConfigurePageSearchParams = {
  origin?: string;
  [key: string]: string | string[] | undefined;
};

function resolveScanConfigRegistryOrNotFound(definition: TScanConfigWorkflowDefinition) {
  const scanConfig = findScanConfigRegistryByDefinition(definition);
  if (!scanConfig) {
    notFound();
  }
  return scanConfig;
}

/**
 * factory for workflow configure routes
 * keeps page files to a single declarative export
 *
 * @example
 * export default createScanConfigWorkflowPage(simulateSmallMicrocircuitWorkflow);
 */
export function makeScanConfigWorkflowPage(
  definition: TScanConfigWorkflowDefinition,
  options?: TCreateScanConfigWorkflowPageOptions
) {
  function Page(props: ServerSideComponentProp<ConfigurePageParams, ConfigurePageSearchParams>) {
    const scanConfig = resolveScanConfigRegistryOrNotFound(definition);

    return (
      <ScanConfigWorkflowConfigurePage
        definition={definition}
        scanConfig={scanConfig}
        aside={options?.aside}
        {...props}
      />
    );
  }

  Page.displayName = `ScanConfigWorkflowPage(${definition.id})`;
  return Page;
}

/**
 * shared `/simulate/configure/circuit/[id]` page
 * resolves the workflow definition from `?dataType=`, then delegates to {@link makeScanConfigWorkflowPage}
 */
export function makeSimulateCircuitScanConfigPage(options?: TCreateScanConfigWorkflowPageOptions) {
  function Page(props: ServerSideComponentProp<ConfigurePageParams, ConfigurePageSearchParams>) {
    const searchParams = use(props.searchParams);
    const rawDataType = searchParams.dataType;
    const dataType = typeof rawDataType === 'string' ? rawDataType : undefined;

    if (!dataType) {
      notFound();
    }

    const definition = getSimulateCircuitWorkflow(dataType as TExtendedEntitiesTypeDict);
    if (!definition) {
      notFound();
    }

    const ConfiguredPage = useMemo(
      () => makeScanConfigWorkflowPage(definition, options),
      [definition]
    );

    return <ConfiguredPage {...props} />;
  }

  Page.displayName = 'SimulateCircuitScanConfigPage';
  return Page;
}

/**
 * Per-activity catch-all: `/workflows/{activity}/configure/[type]/[id]`
 * `[type]` = kebab `targetType` from the hub; `[id]` = workflow session id (`wf_…`).
 */
export function makeActivityScanConfigConfigureCatchAllPage(activity: TActivityValue) {
  function Page(
    props: ServerSideComponentProp<
      WorkspaceContext & { type: string; id: string },
      ConfigurePageSearchParams
    >
  ) {
    const resolvedParams = use(props.params);
    const { type: typeParam } = resolvedParams;
    const { type: targetType } = resolveExtendedTypeFromPathParamUrl({
      pathParam: typeParam as KebabCase<TExtendedEntitiesTypeDict>,
    });

    const workflow = getWorkflow({ activity, targetType });

    if (!workflow?.isScanConfig || !workflow.scanConfig) {
      notFound();
    }

    const { definition, schemaName, configureBinding } = workflow.scanConfig;

    if (definition.entity.mode === ScanConfigEntitySourceMode.StaticType) {
      notFound();
    }

    return (
      <ScanConfigWorkflowConfigurePage
        definition={definition}
        scanConfig={{ configureBinding, schemaName }}
        {...props}
      />
    );
  }

  Page.displayName = `ActivityScanConfigConfigureCatchAllPage__${activity}`;
  return Page;
}
