'use client';

import { compact, omit } from 'es-toolkit/compat';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import { notFound } from 'next/navigation';
import { useEffect, useMemo } from 'react';

import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import {
  brainRegionBasicCellGroupsRegionsHierarchyAtom,
  useBrainRegionHierarchy,
  useSetSelectedBrainRegion,
} from '@/features/brain-region-hierarchy/context';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { useScope } from '@/ui/hooks/use-scope';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceSection } from '@/constants';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  section: TWorkspaceSection;
  workspace: WorkspaceContext;
  baseModelType: TExtendedEntitiesTypeDict;
};

export function WorkflowBrowseEntity({ section, workspace, baseModelType }: Props) {
  const dataType = getEntityByExtendedType({ type: baseModelType });
  const { scope } = useScope({ clearOnDefault: false });

  const dataKey = compact([
    workspace.virtualLabId,
    workspace.projectId,
    section,
    baseModelType,
    scope,
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
