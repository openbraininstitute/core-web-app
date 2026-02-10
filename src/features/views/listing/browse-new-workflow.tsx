'use client';

import { omit } from 'es-toolkit/compat';
import { notFound } from 'next/navigation';
import { useEffect } from 'react';

import { WorkspaceSection } from '@/constants';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import {
  usePrimaryHierarchyOfCurrentSpeciesQuery,
  useSetSelectedBrainRegion,
} from '@/features/brain-region-hierarchy/context';
import { useWorkspaceHierarchyRegistry } from '@/features/brain-region-hierarchy/hooks';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

type Props = {
  buildType: TExtendedEntitiesTypeDict;
};

export function WorkflowBrowseEntity({ buildType }: Props) {
  const dataType = getEntityByExtendedType({ type: buildType });
  const { updateSelectedBrainRegion } = useSetSelectedBrainRegion();
  const { changeBrainRegion } = useWorkspaceHierarchyRegistry();
  const { result: brainRegionHierarchy } = usePrimaryHierarchyOfCurrentSpeciesQuery();

  useEffect(() => {
    if (brainRegionHierarchy) {
      const defaultBrainRegion = brainRegionHierarchy?.root;
      changeBrainRegion(defaultBrainRegion);
      updateSelectedBrainRegion(omit(defaultBrainRegion, 'children'));
    }
  }, [brainRegionHierarchy, changeBrainRegion, updateSelectedBrainRegion]);

  if (!dataType) return notFound();
  return (
    <BrowseEntityScope
      requireMiniDetailView
      requireBrainRegion={false}
      section={WorkspaceSection.SimulateWorkflow}
      classNames={{ container: 'max-h-full', miniView: 'max-h-[calc(100vh-15rem)]' }}
      dataType={buildType}
      mainTableProps={{
        selectionType: undefined,
      }}
      miniViewProps={{
        section: WorkspaceSection.SimulateWorkflow,
      }}
    />
  );
}
