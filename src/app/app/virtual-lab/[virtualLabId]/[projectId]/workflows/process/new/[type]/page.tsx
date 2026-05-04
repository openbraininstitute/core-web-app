'use client';

import { notFound } from 'next/navigation';
import { use } from 'react';

import { WorkflowActivityDictValue, WorkspaceSection } from '@/constants';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { getPrimaryConfigurationInput, getWorkflow } from '@/ui/segments/workflows/config';
import { resolveExtendedTypeFromPathParamUrl } from '@/utils/url-builder';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { KebabCase } from '@/utils/type';

export default function Page({
  params,
}: ServerSideComponentProp<
  WorkspaceContext & { type: KebabCase<TExtendedEntitiesTypeDict> },
  null
>) {
  const { type } = use(params);
  const { type: targetType } = resolveExtendedTypeFromPathParamUrl({ pathParam: type });

  const workflow = getWorkflow({
    activity: WorkflowActivityDictValue.process,
    targetType,
  });

  const primaryInput = getPrimaryConfigurationInput({
    activity: WorkflowActivityDictValue.process,
    targetType,
  });

  const browseType = primaryInput?.type ?? workflow?.sourceType;

  if (!workflow || !browseType) return notFound();

  const extraQueryParams = primaryInput?.filters ?? workflow.filters ?? undefined;
  const section = WorkspaceSection.ProcessWorkflow;

  return (
    <BrowseEntityScope
      requireMiniDetailView
      requireBrainRegion={false}
      section={section}
      classNames={{ container: 'max-h-full', miniView: 'max-h-[calc(100vh-15rem)]' }}
      dataType={browseType}
      extraQueryParams={extraQueryParams}
      mainTableProps={{
        selectionType: undefined,
      }}
      miniViewProps={{
        section,
      }}
    />
  );
}
