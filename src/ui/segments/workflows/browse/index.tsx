'use client';

import { notFound } from 'next/navigation';
import { use } from 'react';

import { WorkflowNewBrowsePage } from '@/ui/segments/workflows/browse/listing';
import { getWorkflow, workflowAllowsBrowseRoute } from '@/ui/segments/workflows/config';
import { resolveExtendedTypeFromPathParamUrl } from '@/utils/url-builder';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceSection } from '@/constants';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { TActivityValue } from '@/ui/segments/workflows/config/types';
import type { KebabCase } from '@/utils/type';

type WorkflowNewRoutePageProps = ServerSideComponentProp<
  WorkspaceContext & { type: KebabCase<TExtendedEntitiesTypeDict> },
  null
> & {
  activity: TActivityValue;
  section: TWorkspaceSection;
};

export function createWorkflowNewRoutePage({
  activity,
  section,
}: {
  activity: TActivityValue;
  section: TWorkspaceSection;
}) {
  function Page({ params }: WorkflowNewRoutePageProps) {
    const { type } = use(params);
    const { type: targetType } = resolveExtendedTypeFromPathParamUrl({ pathParam: type });
    const workflow = getWorkflow({ activity, targetType });

    if (!workflowAllowsBrowseRoute(workflow)) {
      return notFound();
    }

    return <WorkflowNewBrowsePage activity={activity} section={section} targetType={targetType} />;
  }

  Page.displayName = 'WorkflowNewBrowseRoutePage';
  return Page;
}
