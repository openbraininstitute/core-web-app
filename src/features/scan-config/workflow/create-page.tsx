'use client';

import { notFound } from 'next/navigation';
import { use, useMemo } from 'react';

import { ScanConfigWorkflowConfigurePage } from '@/features/scan-config/workflow/page-template';
import { getSimulateCircuitWorkflow } from '@/features/scan-config/workflow/simulate-circuit-workflows';
import { log } from '@/utils/logger';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type {
  TCreateScanConfigWorkflowPageOptions,
  TScanConfigWorkflowDefinition,
} from '@/features/scan-config/workflow/types';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

type ConfigurePageParams = WorkspaceContext & { id?: string };
type ConfigurePageSearchParams = {
  dataType?: string;
  initialCampaignId?: string;
  [key: string]: string | string[] | undefined;
};

/**
 * factory for workflow configure routes
 * keeps page files to a single declarative export
 *
 * @example
 * export default createScanConfigWorkflowPage(simulateSmallMicrocircuitWorkflow);
 *
 * @example
 * export default createScanConfigWorkflowPage(extractCircuitWorkflow, {
 *   aside: <DownloadPanel />,
 * });
 */
export function makeScanConfigWorkflowPage(
  definition: TScanConfigWorkflowDefinition,
  options?: TCreateScanConfigWorkflowPageOptions
) {
  log('debug', '[MakeScanConfigWorkflowPage]', { definition, options });
  function Page(props: ServerSideComponentProp<ConfigurePageParams, ConfigurePageSearchParams>) {
    return (
      <ScanConfigWorkflowConfigurePage definition={definition} aside={options?.aside} {...props} />
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
