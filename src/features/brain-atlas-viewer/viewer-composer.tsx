import { Fragment, useEffect, useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { unwrap } from 'jotai/utils';
import { useAtomValue } from 'jotai';
import compact from 'es-toolkit/compat/compact';
import groupBy from 'es-toolkit/compat/groupBy';
import find from 'es-toolkit/compat/find';

import BrainRegionMesh from '@/features/brain-atlas-viewer/brain-region-mesh';
import PointCloudMesh from '@/features/brain-atlas-viewer/point-cloud';

import { brainRegionClickEventListener } from '@/features/brain-region-hierarchy/event';
import {
  brainRegionBasicCellGroupsRegionsHierarchyAtom,
  brainRegionRootHierarchyAtom,
  useBrainRegionHierarchy,
  ROOT_BRAIN_REGION_ID,
} from '@/features/brain-region-hierarchy/context';

import type { TBrainRegionClickEvent } from '@/features/brain-region-hierarchy/event';

export default function ViewerComposer({
  dataKey,
  onLoadingChange,
}: {
  dataKey: string;
  onLoadingChange?: (type: 'mesh' | 'pointCloud', loading: boolean) => void;
}) {
  const { scene } = useThree();
  const { node: brainRegionNode } = useBrainRegionHierarchy({ dataKey });
  const rootBrainRegions = useAtomValue(useMemo(() => unwrap(brainRegionRootHierarchyAtom), []));

  const brainRegions = useAtomValue(
    useMemo(() => unwrap(brainRegionBasicCellGroupsRegionsHierarchyAtom), [])
  );

  useLayoutEffect(() => {
    return () => {
      scene.clear();
    };
  }, [scene]);

  useEffect(() => {
    const handler = (event: CustomEvent<TBrainRegionClickEvent>) => {
      if (event.detail.dataKey === dataKey) {
        const brainRegionId = event.detail.node.id;
        const grouped = groupBy(scene.children, (o) =>
          [brainRegionId, ROOT_BRAIN_REGION_ID].includes(o.userData.brainRegionId)
            ? 'toDisplayInViewer'
            : 'toRemoveFromViewer'
        );

        (grouped.toRemoveFromViewer ?? []).forEach((o) => {
          scene.remove(o);
        });
      }
    };

    const unsubscribe = brainRegionClickEventListener(handler);

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, dataKey]);

  const rootBrainRegion = find(rootBrainRegions?.options, { value: ROOT_BRAIN_REGION_ID })?.data;
  const currentBrainRegion = find(brainRegions?.options, { value: brainRegionNode.id })?.data;

  const regions = compact(
    brainRegionNode ? [currentBrainRegion, rootBrainRegion] : [rootBrainRegion]
  );

  if (!brainRegions) return null;

  return regions.map((brainRegion) => {
    return (
      <Fragment key={brainRegion.id}>
        <BrainRegionMesh
          brainRegionId={brainRegion.id}
          color={`#${brainRegion?.color_hex_triplet}`}
          dataKey={dataKey}
          regionName={brainRegion.name}
          onLoadingChange={(type, loading) => onLoadingChange?.(type, loading)}
        />
        {brainRegion.id !== ROOT_BRAIN_REGION_ID && (
          <PointCloudMesh
            brainRegionId={brainRegionNode.id}
            brainRegionAnnotationValue={brainRegionNode.annotation_value}
            color={`#${brainRegion?.color_hex_triplet}`}
            dataKey={dataKey}
            regionName={brainRegion.name}
            onLoadingChange={(type, loading) => onLoadingChange?.(type, loading)}
          />
        )}
      </Fragment>
    );
  });
}
