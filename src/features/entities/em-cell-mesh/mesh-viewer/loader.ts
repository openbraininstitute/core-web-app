import React from 'react';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import useWorkspace from '@/ui/hooks/use-workspace';
import { assertType } from '@/util/type-guards';
import { logDebug, logError } from '@/utils/logger';

import { fetchAsset } from './assets';

import type { MorphoViewerOctreeProps } from '@/morpho-viewer';

export function useLoaders(): {
  infoExists: boolean;
  loadInfo: MorphoViewerOctreeProps['loadInfo'];
  loadBlock: MorphoViewerOctreeProps['loadBlock'];
} {
  const [infoExists, setInfoExists] = React.useState(true);
  const ctx = useWorkspace();

  return {
    infoExists,
    loadInfo: async (meshId: string) => {
      setInfoExists(true);
      try {
        const asset = await fetchAsset(ctx, meshId);
        if (asset) {
          const response = await downloadAsset({
            ctx,
            entityId: meshId,
            entityType: 'em_cell_mesh',
            id: asset.id ?? '',
            assetPath: 'lod.json',
            asRawResponse: true,
          });
          const assetData = await response.json();
          assertOctreeInfo(assetData);
          return {
            bbox: assetData.bbox as BBox,
            blockIds: assetData.files.map((name) =>
              name.endsWith('.glb') ? name.slice(0, name.length - 4) : name
            ),
          };
        }
      } catch (ex) {
        logError(`[MorphoViewerOctree] Unable to load mesh #${meshId}:`, ex);
      }

      setInfoExists(false);
      return null;

      // Uncomment the following block if we need a default mesh for testing.

      // const url = resolveInfoURL(meshId);
      // try {
      //   logDebug('Loading fake info:', url);
      //   const resp = await fetch(url);
      //   if (!resp.ok) {
      //     throw new Error(
      //       `Unable to get info file: ${url}!\nError #${resp.status}: ${resp.statusText}`
      //     );
      //   }
      //   const data = await resp.json();
      //   assertOctreeInfo(data);
      //   return {
      //     bbox: data.bbox as BBox,
      //     blockIds: data.files.map((name) =>
      //       name.endsWith('.glb') ? name.slice(0, name.length - 4) : name
      //     ),
      //   };
      // } catch (error) {
      //   logError(`Unable to load info for mesh #${meshId}:`, error);
      //   return null;
      // }
    },
    loadBlock: async (meshId: string, blockId: string) => {
      try {
        const asset = await fetchAsset(ctx, meshId);
        if (asset) {
          const response = await downloadAsset({
            ctx,
            entityId: meshId,
            entityType: 'em_cell_mesh',
            id: asset.id,
            assetPath: `${blockId}.glb`,
            asRawResponse: true,
          });
          return {
            type: 'glb',
            data: await response.arrayBuffer(),
          };
        }
      } catch (error) {
        logError(`Unable to load block ${blockId} for mesh #${meshId}:`, error);
      }
      return null;

      // Uncomment the following block if we need a default mesh for testing.

      // const url = resolveBlockURL(meshId, blockId);
      // try {
      //   logDebug('Loading fake:', url);
      //   const resp = await fetch(url);
      //   if (!resp.ok) {
      //     logError(`Unable to get info file: ${url}!\nError #${resp.status}: ${resp.statusText}`);
      //     return null;
      //   }
      //   return {
      //     type: 'glb',
      //     data: await resp.arrayBuffer(),
      //   };
      // } catch (error) {
      //   logError(`Unable to load block ${blockId} for mesh #${meshId}:`, error);
      //   return null;
      // }
    },
  };
}

// Uncomment the following block if we need a default mesh for testing.

// const BASE_URL = 'https://openbraininstitute.github.io/morphoviewer/assets/octree/1';

// Uncomment the following block if we need a default mesh for testing.

// function resolveBlockURL(_meshId: string, blockId: string) {
//   return `${BASE_URL}/${blockId}.glb`;
// }

interface BBox {
  min: [number, number, number];
  max: [number, number, number];
}

interface OctreeInfo {
  bbox: BBox;
  files: string[];
}

function assertOctreeInfo(data: unknown): asserts data is OctreeInfo {
  assertType(data, {
    bbox: {
      min: ['array', 'number', { min: 3, max: 3 }],
      max: ['array', 'number', { min: 3, max: 3 }],
    },
    files: ['array', 'string'],
  });
}
