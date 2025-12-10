/* eslint-disable no-param-reassign */
import React from 'react';
import compact from 'es-toolkit/compat/compact';
import find from 'es-toolkit/compat/find';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import { TgdColor, TgdVec4 } from '@tolokoban/tgd';

import { brainRegionAtlasAtom } from '../context';
import { Painter } from './painter';
import { SettingsDefinitions } from './settings';
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
    refPainter.current.eventError.addListener((message) => {
      notif.warning({
        message,
        key: '3d-mesh-error',
      });
    });
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

const SETTINGS: SettingsDefinitions = {
  shadowIntensity: {
    label: 'Shadow strength',
    value: 0.1,
  },
  shadowThickness: {
    label: 'Shadow spread',
    min: 0,
    max: 2,
    value: 1,
  },
  specularExponent: {
    label: 'specularExponent',
    value: 10,
    min: -20,
    max: 20,
  },
  specularIntensity: {
    label: 'specularIntensity',
    value: 0,
  },
  light: {
    label: 'light',
    value: 1,
  },
  ghostExponent: {
    label: 'X-ray exponent',
    value: 2,
    min: 0,
    max: 50,
  },
  ghostIntensity: {
    label: 'X-ray intensity',
    value: 1,
    min: 0,
    max: 10,
  },
};

export function useSettingsValues(
  painter: Painter
): [values: SettingsDefinitions, setValues: (values: SettingsDefinitions) => void] {
  const [values, setValues] = React.useState(SETTINGS);
  React.useEffect(() => {
    painter.uniforms = values;
  }, [values, painter]);
  return [values, setValues];
}
