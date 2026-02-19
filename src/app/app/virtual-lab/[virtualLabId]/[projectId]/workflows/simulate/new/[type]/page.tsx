'use client';

import snakeCase from 'es-toolkit/compat/snakeCase';
import { notFound } from 'next/navigation';
import { use } from 'react';

import { WorkspaceSection } from '@/constants';
import { WorkflowBrowseEntity } from '@/features/views/listing/browse-new-workflow';
import { getBaseModelTypeFromActivityType } from '@/ui/segments/workflows/elements/helpers';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { KebabCase } from '@/utils/type';

export default function Page({
  params,
}: ServerSideComponentProp<
  WorkspaceContext & { type: KebabCase<TExtendedEntitiesTypeDict> },
  null
>) {
  const { type, virtualLabId, projectId } = use(params);

  const dataType = snakeCase(type) as TExtendedEntitiesTypeDict;
  const baseModelType = getBaseModelTypeFromActivityType({
    type: dataType,
    section: WorkspaceSection.SimulateWorkflow,
  });

  if (!baseModelType) return notFound();
  return (
    <WorkflowBrowseEntity
      workspace={{ virtualLabId, projectId }}
      baseModelType={baseModelType}
      section={WorkspaceSection.SimulateWorkflow}
    />
  );
}
