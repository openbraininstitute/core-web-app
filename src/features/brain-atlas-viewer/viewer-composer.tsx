import { Fragment, Suspense, useEffect, useLayoutEffect, useMemo } from 'react';
import { unwrap, useResetAtom } from 'jotai/utils';
import { useAtomValue, useSetAtom } from 'jotai';
import { useThree } from '@react-three/fiber';

import compact from 'lodash/compact';
import groupBy from 'lodash/groupBy';
import find from 'lodash/find';

import BrainRegionMesh from '@/features/brain-atlas-viewer/brain-region-mesh';
import PointCloudMesh from '@/features/brain-atlas-viewer/point-cloud';

import { brainRegionClickEventListener } from '@/features/brain-region-hierarchy/event';
import { meshVisibilityAtom } from '@/features/brain-atlas-viewer/state';

import {
  brainRegionBasicCellGroupsRegionsHierarchyAtom,
  brainRegionRootHierarchyAtom,
  useBrainRegionHierarchy,
  ROOT_BRAIN_REGION_ID,
} from '@/features/brain-region-hierarchy/context';

import type { TBrainRegionClickEvent } from '@/features/brain-region-hierarchy/event';
import type { VisibilityType } from '@/features/brain-atlas-viewer/types';
import type { ApplicationSection } from '@/types/common';

export default function ViewerComposer({
  section,
  dataKey,
}: {
  section: ApplicationSection;
  dataKey: string;
}) {
  const { scene } = useThree();
  const { node: brainRegionNode } = useBrainRegionHierarchy({ dataKey });
  const rootBrainRegions = useAtomValue(useMemo(() => unwrap(brainRegionRootHierarchyAtom), []));
  const brainRegions = useAtomValue(
    useMemo(() => unwrap(brainRegionBasicCellGroupsRegionsHierarchyAtom), [])
  );
  const setMeshVisibility = useSetAtom(meshVisibilityAtom(section));
  const resetMeshVisibility = useResetAtom(meshVisibilityAtom(section));

  useLayoutEffect(() => {
    return () => {
      // when component unmounts, resetting the mesh visibility since the meshes are not displayed anymore
      resetMeshVisibility();
      scene.clear();
    };
  }, [resetMeshVisibility, scene, section]);

  useEffect(() => {
    const handler = (event: CustomEvent<TBrainRegionClickEvent>) => {
      if (event.detail.dataKey === dataKey) {
        const brainRegionId = event.detail.node.id;
        const grouped = groupBy(scene.children, (o) =>
          [brainRegionId, ROOT_BRAIN_REGION_ID].includes(o.userData.brainRegionId)
            ? 'toDisplayInViewer'
            : 'toRemoveFromViewer'
        );

        const toDisplayInViewer =
          grouped.toDisplayInViewer?.map((o) => ({
            type: o.type as VisibilityType,
            brainRegionId: o.userData.brainRegionId as string,
            sceneId: o.uuid,
          })) ?? [];

        (grouped.toRemoveFromViewer ?? []).forEach((o) => {
          scene.remove(o);
        });

        setMeshVisibility(toDisplayInViewer);
      }
    };

    const unsubscribe = brainRegionClickEventListener(handler);

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  if (!brainRegions) return null;

  const rootBrainRegion = find(rootBrainRegions?.options, { value: ROOT_BRAIN_REGION_ID })?.data;
  const currentBrainRegion = find(brainRegions?.options, { value: brainRegionNode.id })?.data;

  const regions = compact(
    brainRegionNode ? [currentBrainRegion, rootBrainRegion] : [rootBrainRegion]
  );

  return regions.map((brainRegion) => {
    return (
      <Fragment key={brainRegion.id}>
        <Suspense>
          <BrainRegionMesh
            brainRegionId={brainRegion.id}
            section={section}
            color={`#${brainRegion?.color_hex_triplet}`}
          />
        </Suspense>
        {brainRegion.id !== ROOT_BRAIN_REGION_ID && (
          <Suspense>
            <PointCloudMesh
              brainRegionId={brainRegionNode.id}
              brainRegionAnnotationValue={brainRegionNode.annotation_value}
              section={section}
              color={`#${brainRegion?.color_hex_triplet}`}
            />
          </Suspense>
        )}
      </Fragment>
    );
  });
}
