import React from 'react';
import compact from 'lodash/compact';
import find from 'lodash/find';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import { TgdColor, TgdVec4 } from '@tolokoban/tgd';

import { brainRegionAtlasAtom } from '../context';
import { Painter } from './painter';
import { VisibleRegion } from './types';

import {
  brainRegionBasicCellGroupsRegionsHierarchyAtom,
  brainRegionRootHierarchyAtom,
  ROOT_BRAIN_REGION_ID,
  useBrainRegionHierarchy,
} from '@/features/brain-region-hierarchy/context';
import { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';
import { useAppNotification } from '@/components/notification';

export function usePainter(): Painter {
  const notif = useAppNotification();
  const refPainter = React.useRef<Painter | null>(null);
  if (!refPainter.current) {
    refPainter.current = new Painter();
    refPainter.current.eventError.addListener((message) =>
      notif.error({ message, key: '3d-mesh-error' })
    );
  }

  return refPainter.current;
}

export function useAtlas() {
  return useAtomValue(brainRegionAtlasAtom);
}

export function useVisibleRegions(dataKey: string): {
  region: IBrainRegionHierarchy | undefined;
  regions: VisibleRegion[];
} {
  const { node: brainRegionNode } = useBrainRegionHierarchy({ dataKey });
  const rootBrainRegions = useAtomValue(
    React.useMemo(() => unwrap(brainRegionRootHierarchyAtom), [])
  );
  const brainRegions = useAtomValue(
    React.useMemo(() => unwrap(brainRegionBasicCellGroupsRegionsHierarchyAtom), [])
  );
  return React.useMemo(() => {
    const rootBrainRegion = find(rootBrainRegions?.options, { value: ROOT_BRAIN_REGION_ID })?.data;
    const currentBrainRegion = find(brainRegions?.options, { value: brainRegionNode.id })?.data;
    const regions = compact(
      brainRegionNode ? [currentBrainRegion, rootBrainRegion] : [rootBrainRegion]
    );
    return {
      region: regions.find((region) => region.id === brainRegionNode.id),
      regions: regions.map((region) => ({
        id: region.id,
        name: region.name,
        color: makeColor(`#${region.color_hex_triplet}`),
      })) as VisibleRegion[],
    };
  }, [brainRegions, rootBrainRegions, brainRegionNode]);
}

export function makeColor(textColor: string): TgdVec4 {
  const color = new TgdColor(textColor);
  return new TgdVec4(color.R, color.G, color.B, 1);
}
