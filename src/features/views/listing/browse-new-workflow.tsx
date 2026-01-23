'use client';

import { compact, omit } from 'es-toolkit/compat';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import { notFound } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import {
  brainRegionBasicCellGroupsRegionsHierarchyAtom,
  useBrainRegionHierarchy,
  useSetSelectedBrainRegion,
} from '@/features/brain-region-hierarchy/context';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  workspace: WorkspaceContext;
  buildType: TExtendedEntitiesTypeDict;
};

export function WorkflowBrowseEntity({ workspace, buildType }: Props) {
  const dataType = getEntityByExtendedType({ type: buildType });
  const dataKey = compact([
    workspace.virtualLabId,
    workspace.projectId,
    WorkspaceSection.SimulateWorkflow,
    buildType,
    WorkspaceScope.Simulate,
  ]).join('/');
  const { updateSelectedBrainRegion } = useSetSelectedBrainRegion();
  const { updateHierarchyConfig } = useBrainRegionHierarchy({
    dataKey,
  });

  const brainRegionHierarchy = useAtomValue(
    useMemo(() => unwrap(brainRegionBasicCellGroupsRegionsHierarchyAtom), [])
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: both functions are stable
  useEffect(() => {
    if (brainRegionHierarchy) {
      const defaultBrainRegion = brainRegionHierarchy?.root;
      updateHierarchyConfig(defaultBrainRegion);
      updateSelectedBrainRegion(omit(defaultBrainRegion, 'children'));
    }
  }, [brainRegionHierarchy]);

  if (!dataType) return notFound();
  return (
    <BrowseEntityScope
      requireMiniDetailView
      requireBrainRegion
      section={WorkspaceSection.SimulateWorkflow}
      classNames={{ container: 'max-h-full' }}
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
