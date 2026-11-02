'use client';

import { RiArrowRightLine } from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { getEmCellMesh } from '@/api/entitycore/queries/experimental/em-cell-mesh';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkflowActivityDictValue } from '@/constants';
import { EmCellMeshViewer } from '@/features/entities/em-cell-mesh/viewer/em-mesh-viewer';
import { meshAsset } from '@/features/entities/em-cell-mesh/viewer/mesh-asset';
import { CANVAS_WHITE } from '@/features/scan-config/components/color-by/contrast';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Skeleton } from '@/ui/molecules/skeleton';
import {
  STAGE_VIEW_CLASS,
  StageAction,
  StageCaption,
} from '@/ui/segments/project/start/stage-text';
import { buildConfigureUrlForEntity } from '@/ui/segments/workflows/config';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { IMeshExample } from '@/ui/segments/project/start/items';

/** An EM cell mesh in the mesh viewer, on white, with its title and source underneath. */
export function MeshStage({ example }: { example: IMeshExample }) {
  const { virtualLabId, projectId } = useWorkspace();
  const context = { virtualLabId, projectId };
  const { data: mesh, isError } = useQuery({
    queryKey: keyBuilder.entity({ id: example.meshId, context, type: EntityTypeDict.EMCellMesh }),
    queryFn: () => getEmCellMesh({ id: example.meshId, context }),
  });
  const asset = meshAsset(mesh?.assets);
  // The skeletonization workflow with this mesh picked, kept in this tab's session.
  const skeletonizeHref = useMemo(
    () =>
      buildConfigureUrlForEntity({
        activity: WorkflowActivityDictValue.process,
        targetType: ExtendedEntitiesTypeDict.SkeletonizationCampaign,
        workspace: { virtualLabId, projectId },
        entityId: example.meshId,
        entityType: ExtendedEntitiesTypeDict.EMCellMesh,
      }),
    [example.meshId, virtualLabId, projectId]
  );

  return (
    <div className="flex size-full flex-col gap-[14px]">
      <div className={STAGE_VIEW_CLASS}>
        {isError && (
          <div className="flex h-full items-center justify-center p-[22px] text-[13px]">
            The mesh could not be loaded.
          </div>
        )}
        {!isError && !(mesh && asset) && <Skeleton className="size-full rounded-none" />}
        {mesh && asset && (
          <EmCellMeshViewer
            className="h-full"
            entity={{ id: mesh.id, name: example.title }}
            asset={asset}
            defaults={example.viewerDefaults}
            lightCanvas={CANVAS_WHITE}
          />
        )}
      </div>
      <StageCaption title={example.title} details={example.source}>
        <StageAction
          href={`${resolveExploreDetailsPageUrl({ ctx: context, entityId: example.meshId, dataType: ExtendedEntitiesTypeDict.EMCellMesh })}/overview`}
        >
          View in Data
        </StageAction>
        <StageAction primary href={skeletonizeHref}>
          Skeletonize
          <RiArrowRightLine className="size-[14px]" />
        </StageAction>
      </StageCaption>
    </div>
  );
}
