/* eslint-disable no-param-reassign */

import { TgdColor, TgdVec4 } from '@tolokoban/tgd';
import { compact, find } from 'es-toolkit/compat';
import { useAtom, useAtomValue } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import React from 'react';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';

import { useAppNotification } from '@/components/notification';
import {
  AppSpeciesBrainRegionConfig,
  useBrainRegionRootHierarchyQuery,
  usePrimaryHierarchySpeciesQuery,
} from '@/features/brain-region-hierarchy/context';
import { useWorkspaceHierarchyRegistry } from '@/features/brain-region-hierarchy/hooks';

import { brainRegionAtlasAtom } from '../context';
import { Painter } from './painter';
import type { SettingsDefinitions } from './settings';
import type { VisibleRegion } from './types';

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
    refPainter.current.uniforms = getAtlasViewerDefaultSettings();
  }

  return refPainter.current;
}

export function useAtlas() {
  return useAtomValue(brainRegionAtlasAtom);
}

export function useVisibleRegions(): {
  region: IBrainRegionHierarchy | undefined;
  regions: VisibleRegion[];
} {
  const { selectedBrainRegion: brainRegionNode, workspaceHierarchyId } =
    useWorkspaceHierarchyRegistry();
  const { result: rootBrainRegions } = useBrainRegionRootHierarchyQuery();
  const { result: brainRegions } = usePrimaryHierarchySpeciesQuery();

  const rootBrainRegionId =
    workspaceHierarchyId === AppSpeciesBrainRegionConfig.Global.DefaultHierarchyId
      ? AppSpeciesBrainRegionConfig.Mouse.RootId
      : AppSpeciesBrainRegionConfig.Human.RootId;

  return React.useMemo(() => {
    const rootBrainRegion = find(rootBrainRegions?.options, {
      value: rootBrainRegionId,
    })?.data;
    const currentBrainRegion = find(brainRegions?.options, {
      value: brainRegionNode?.id,
    })?.data;
    const regions = compact(
      brainRegionNode ? [currentBrainRegion, rootBrainRegion] : [rootBrainRegion]
    );
    return {
      region: regions.find((region) => region.id === brainRegionNode?.id),
      regions: regions.map((region) => ({
        id: region.id,
        name: region.name,
        color: makeColor(`#${region.color_hex_triplet}`),
      })) as VisibleRegion[],
    };
  }, [brainRegions, rootBrainRegions, brainRegionNode, rootBrainRegionId]);
}

export function makeColor(textColor: string): TgdVec4 {
  const color = new TgdColor(textColor);
  return new TgdVec4(color.R, color.G, color.B, 1);
}

export function getAtlasViewerDefaultSettings(): SettingsDefinitions {
  return {
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
      label: 'Specular exponent',
      value: 10,
      min: 0,
      max: 50,
    },
    specularIntensity: {
      label: 'Specular intensity',
      value: 0.05,
    },
    light: {
      label: 'Points luminance',
      value: 1,
    },
    ghostExponent: {
      label: 'X-ray exponent',
      value: 2.5,
      min: 0,
      max: 50,
    },
    ghostIntensity: {
      label: 'X-ray intensity',
      value: 0.7,
      min: 0,
      max: 50,
    },
  };
}

const atlasViewerSettingsAtom = atomWithStorage(
  'AtlasViewerSettings',
  getAtlasViewerDefaultSettings()
);

export function useAtlasViewerSettingsValues(
  painter: Painter
): [values: SettingsDefinitions, setValues: (values: SettingsDefinitions) => void] {
  const [values, setValues] = useAtom(atlasViewerSettingsAtom);
  React.useEffect(() => {
    painter.uniforms = values;
  }, [values, painter]);
  return [values, setValues];
}
