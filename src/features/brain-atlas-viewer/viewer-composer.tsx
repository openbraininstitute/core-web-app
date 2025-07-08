import { ErrorInfo, Fragment, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { unwrap, useResetAtom } from 'jotai/utils';
import { useAtomValue, useSetAtom } from 'jotai';
import { useThree } from '@react-three/fiber';
import compact from 'lodash/compact';
import groupBy from 'lodash/groupBy';
import find from 'lodash/find';
import get from 'lodash/get';

import BrainRegionMesh from '@/features/brain-atlas-viewer/brain-region-mesh';
import PointCloudMesh from '@/features/brain-atlas-viewer/point-cloud';

import { brainRegionClickEventListener } from '@/features/brain-region-hierarchy/event';
import { meshVisibilityAtom } from '@/features/brain-atlas-viewer/state';
import { SuspenseWithStatus } from '@/components/suspense-with-status';
import { useAppNotification } from '@/components/notification';
import { messages } from '@/i18n/en/atlas';

import {
  brainRegionBasicCellGroupsRegionsHierarchyAtom,
  brainRegionRootHierarchyAtom,
  useBrainRegionHierarchy,
  ROOT_BRAIN_REGION_ID,
} from '@/features/brain-region-hierarchy/context';

import type { TBrainRegionClickEvent } from '@/features/brain-region-hierarchy/event';
import type { VisibilityType } from '@/features/brain-atlas-viewer/types';
import type { TSuspenseStatus } from '@/components/suspense-with-status';

export default function ViewerComposer({
  dataKey,
  onMeshLoadingStatusChange,
  onPointCloudLoadingStatusChange,
}: {
  dataKey: string;
  onMeshLoadingStatusChange: (status: TSuspenseStatus) => void;
  onPointCloudLoadingStatusChange: (status: TSuspenseStatus) => void;
}) {
  const notification = useAppNotification();
  const { scene } = useThree();
  const { node: brainRegionNode } = useBrainRegionHierarchy({ dataKey });
  const rootBrainRegions = useAtomValue(useMemo(() => unwrap(brainRegionRootHierarchyAtom), []));
  const brainRegions = useAtomValue(
    useMemo(() => unwrap(brainRegionBasicCellGroupsRegionsHierarchyAtom), [])
  );
  const setMeshVisibility = useSetAtom(meshVisibilityAtom(dataKey));
  const resetMeshVisibility = useResetAtom(meshVisibilityAtom(dataKey));

  useLayoutEffect(() => {
    return () => {
      // when component unmounts, resetting the mesh visibility since the meshes are not displayed anymore
      resetMeshVisibility();
      scene.clear();
    };
  }, [resetMeshVisibility, scene]);

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

  const rootBrainRegion = find(rootBrainRegions?.options, { value: ROOT_BRAIN_REGION_ID })?.data;
  const currentBrainRegion = find(brainRegions?.options, { value: brainRegionNode.id })?.data;

  const regions = compact(
    brainRegionNode ? [currentBrainRegion, rootBrainRegion] : [rootBrainRegion]
  );

  const onPointCloudLoadingErrorHandler = useCallback((error: Error, _: ErrorInfo) => {
    notification.warning({
      message: get(messages, error.message, messages.default),
      placement: 'topRight',
      key: 'point-cloud-warning',
    });
  }, []);

  const onMeshLoadingErrorHandler = useCallback((error: Error, _: ErrorInfo) => {
    notification.warning({
      message: get(messages, error.message, messages.default),
      placement: 'topRight',
      key: 'mesh-warning',
    });
  }, []);

  if (!brainRegions) return null;

  return regions.map((brainRegion) => {
    return (
      <Fragment key={brainRegion.id}>
        <SuspenseWithStatus
          withErrorBoundary={false}
          id={`mesh-loading-${dataKey}-${brainRegion.id}`}
          onStatusChange={onMeshLoadingStatusChange}
          onErrorHandler={onMeshLoadingErrorHandler}
        >
          <BrainRegionMesh
            brainRegionId={brainRegion.id}
            color={`#${brainRegion?.color_hex_triplet}`}
            dataKey={dataKey}
          />
        </SuspenseWithStatus>
        {brainRegion.id !== ROOT_BRAIN_REGION_ID && (
          <SuspenseWithStatus
            withErrorBoundary={false}
            id={`point-cloud-loading-${dataKey}-${brainRegionNode.id}`}
            onStatusChange={onPointCloudLoadingStatusChange}
            onErrorHandler={onPointCloudLoadingErrorHandler}
          >
            <PointCloudMesh
              brainRegionId={brainRegionNode.id}
              brainRegionAnnotationValue={brainRegionNode.annotation_value}
              color={`#${brainRegion?.color_hex_triplet}`}
              dataKey={dataKey}
            />
          </SuspenseWithStatus>
        )}
      </Fragment>
    );
  });
}
