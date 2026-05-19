'use client';

import { ScanConfigWorkflowConfigurePage } from '@/features/scan-config/workflow/page-template';

import type {
  TCreateScanConfigWorkflowPageOptions,
  TScanConfigWorkflowDefinition,
} from '@/features/scan-config/workflow/types';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

type ConfigurePageParams = WorkspaceContext & { id?: string };
type ConfigurePageSearchParams = {
  initialCampaignId?: string;
  [key: string]: string | string[] | undefined;
};

/**
 * factory for workflow configure routes.
 * keeps page files to a single declarative export
 *
 * @example
 * export default createScanConfigWorkflowPage(simulateCircuitWorkflow);
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
  function Page(props: ServerSideComponentProp<ConfigurePageParams, ConfigurePageSearchParams>) {
    return (
      <ScanConfigWorkflowConfigurePage definition={definition} aside={options?.aside} {...props} />
    );
  }

  Page.displayName = `ScanConfigWorkflowPage(${definition.id})`;
  return Page;
}
