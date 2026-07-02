'use client';

import { useQueryClient } from '@tanstack/react-query';
import { TgdColor, TgdVec4 } from '@tolokoban/tgd';
import { compact, find } from 'es-toolkit/compat';
import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import React from 'react';

import { notify } from '@/components/notification';
import { ATLAS_3D_VIEWER_ERROR_MESSAGE_KEY } from '@/features/brain-atlas-viewer/brain-atlas-viewer-gltf/constants';
import { Painter } from '@/features/brain-atlas-viewer/brain-atlas-viewer-gltf/painter';
import {
  useBrainRegionRootHierarchyQuery,
  usePrimaryHierarchyOfCurrentSpeciesQuery,
} from '@/features/brain-region-hierarchy/context';
import { useWorkspaceHierarchyRegistry } from '@/features/brain-region-hierarchy/hooks';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';
import type { SettingsDefinitions } from '@/features/brain-atlas-viewer/brain-atlas-viewer-gltf/settings';
import type { VisibleRegion } from '@/features/brain-atlas-viewer/brain-atlas-viewer-gltf/types';

export function usePainter({
  atlasId,
  loading,
}: {
  atlasId?: string;
  loading: boolean;
}): Painter | null {
  const queryClient = useQueryClient();
  const refPainter = React.useRef<Painter | null>(null);
  const refAtlasId = React.useRef<string>(atlasId);

  // recreate the Painter when atlasId changes (species switch).
  // the old Painter holds a stale AtlasID, so we must discard it.
  if (refPainter.current && refAtlasId.current !== atlasId) {
    refPainter.current = null;
    refAtlasId.current = atlasId;
  }

  if (loading || !atlasId) return null;
  if (!refPainter.current) {
    refPainter.current = new Painter(atlasId, queryClient);
    refAtlasId.current = atlasId;
    refPainter.current.eventError.addListener((message) => {
      notify.warning({
        title: 'Atlas viewer',
        description: message,
        key: ATLAS_3D_VIEWER_ERROR_MESSAGE_KEY,
        duration: 2,
      });
    });
    refPainter.current.uniforms = getAtlasViewerDefaultSettings();
  }

  return refPainter.current;
}

export function useVisibleRegions(): {
  region: IBrainRegionHierarchy | undefined;
  regions: VisibleRegion[];
} {
  const { selectedBrainRegion: brainRegionNode } = useWorkspaceHierarchyRegistry();
  const { result: rootBrainRegions } = useBrainRegionRootHierarchyQuery();
  const { result: brainRegions } = usePrimaryHierarchyOfCurrentSpeciesQuery();

  const rootBrainRegionId = rootBrainRegions?.root?.id;

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
    minSizeInPixels: {
      label: 'Minimal size (pixel)',
      value: 5,
      min: 0,
      max: 20,
      step: 1,
    },
    radiusMultiplier: {
      label: 'Radius multiplier',
      value: 1,
      min: 0.1,
      max: 2,
      step: 0.1,
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
  painter: Painter | null
): [values: SettingsDefinitions, setValues: (values: SettingsDefinitions) => void] {
  const [values, setValues] = useAtom(atlasViewerSettingsAtom);
  React.useEffect(() => {
    if (!painter) return;
    painter.uniforms = values;
  }, [values, painter]);
  return [values, setValues];
}
