'use client';

import { use } from 'react';

import { ScanConfigWorkflow } from '@/features/scan-config/workflow/components';
import { ScanConfigWorkflowProvider } from '@/features/scan-config/workflow/context';

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

export type ScanConfigWorkflowConfigurePageProps = ServerSideComponentProp<
  ConfigurePageParams,
  ConfigurePageSearchParams
> & {
  definition: TScanConfigWorkflowDefinition;
  aside?: TCreateScanConfigWorkflowPageOptions['aside'];
  children?: React.ReactNode;
};

function DefaultScanConfigWorkflowLayout({ aside }: { aside?: React.ReactNode }) {
  return (
    <ScanConfigWorkflow.Gate>
      <ScanConfigWorkflow.Frame>
        <ScanConfigWorkflow.Editor />
        {aside ? <ScanConfigWorkflow.Aside>{aside}</ScanConfigWorkflow.Aside> : null}
      </ScanConfigWorkflow.Frame>
    </ScanConfigWorkflow.Gate>
  );
}

export function ScanConfigWorkflowConfigurePage({
  definition,
  aside,
  searchParams,
  params,
  children,
}: ScanConfigWorkflowConfigurePageProps) {
  const resolvedSearchParams = use(searchParams);
  const resolvedParams = use(params);
  const { virtualLabId, projectId, ...routeParams } = resolvedParams;

  return (
    <ScanConfigWorkflowProvider
      definition={definition}
      workspace={{ virtualLabId, projectId }}
      routeParams={routeParams}
      searchParams={resolvedSearchParams}
    >
      {children ?? <DefaultScanConfigWorkflowLayout aside={aside} />}
    </ScanConfigWorkflowProvider>
  );
}
