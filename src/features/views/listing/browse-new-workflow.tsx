'use client';

import { notFound } from 'next/navigation';

import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceSection } from '@/constants';

type Props = {
  section: TWorkspaceSection;
  baseModelType: TExtendedEntitiesTypeDict;
};

export function WorkflowBrowseEntity({ section, baseModelType }: Props) {
  const dataType = getEntityByExtendedType({ type: baseModelType });

  if (!dataType) return notFound();
  return (
    <BrowseEntityScope
      requireMiniDetailView
      requireBrainRegion={false}
      section={section}
      classNames={{ container: 'max-h-full', miniView: 'max-h-[calc(100vh-15rem)]' }}
      dataType={baseModelType}
      mainTableProps={{
        selectionType: undefined,
      }}
      miniViewProps={{
        section,
      }}
    />
  );
}
