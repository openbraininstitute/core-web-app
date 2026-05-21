'use client';

import { notFound } from 'next/navigation';
import { use } from 'react';

import { ScanConfigWorkflowConfigurePage } from '@/features/scan-config/workflow/page-template';
import { getWorkflow, getWorkflowConfigurePageAside } from '@/ui/segments/workflows/config/helpers';
import { resolveWorkflowTargetTypeFromRoute } from '@/ui/segments/workflows/config/routes';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { TActivityValue } from '@/ui/segments/workflows/config/types';
import type { KebabCase } from '@/utils/type';

type TConfigurePageSearchParams = {
  dataType?: string;
  originId?: string;
  [key: string]: string | string[] | undefined;
};

type TActivityConfigureCatchAllParams = WorkspaceContext & {
  type: string;
  id: string;
};

/**
 * per-activity catch-all configure route factory
 *
 * resolves `[type]` → workflow descriptor → `scanConfig.definition`, then renders
 * {@link ScanConfigWorkflowConfigurePage}. Session id is the `[id]` path segment.
 *
 * @example
 * export default makeActivityScanConfigConfigureCatchAllPage('simulate');
 */
export function makeActivityScanConfigConfigureCatchAllPage(activity: TActivityValue) {
  function Page(
    props: ServerSideComponentProp<TActivityConfigureCatchAllParams, TConfigurePageSearchParams>
  ) {
    const resolvedParams = use(props.params);
    const targetType = resolveWorkflowTargetTypeFromRoute(
      resolvedParams.type as KebabCase<TExtendedEntitiesTypeDict>
    );
    const workflow = getWorkflow({ activity, targetType });
    const definition = workflow?.scanConfig?.definition;

    if (!workflow?.isScanConfig || !definition) {
      notFound();
    }

    const aside = getWorkflowConfigurePageAside({ activity, targetType });

    return <ScanConfigWorkflowConfigurePage definition={definition} aside={aside} {...props} />;
  }

  Page.displayName = `ActivityScanConfigConfigureCatchAllPage(${activity})`;
  return Page;
}
