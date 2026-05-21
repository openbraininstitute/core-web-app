import { downloadAsset, getAssets } from '@/api/entitycore/queries/assets';
import useWorkspace from '@/ui/hooks/use-workspace';
import { assertType } from '@/util/type-guards';
import { logDebug, logError } from '@/utils/logger';

import type { MorphoViewerOctreeProps } from '@bbp/morphoviewer';
import type { WorkspaceContext } from '@/types/common';

export function useLoaders(): {
  loadInfo: MorphoViewerOctreeProps['loadInfo'];
  loadBlock: MorphoViewerOctreeProps['loadBlock'];
} {
  const ctx = useWorkspace();

  return {
    loadInfo: async (meshId: string) => {
      const asset = await fetchAsset(ctx, meshId);
      if (asset) {
        // Uncomment this if you need to list the assets of a directory for debug purpose.
        // const list = await listDirectoryOfAssets({
        //   ctx,
        //   entityId: meshId,
        //   entityType: 'em_cell_mesh',
        //   id: asset.id,
        // });
        // console.log('🐞 [loader@26] list =', list) // @FIXME: Remove this line written on 2026-04-27 at 13:31
        const response = await downloadAsset({
          ctx,
          entityId: meshId,
          entityType: 'em_cell_mesh',
          id: asset.id ?? '',
          assetPath: 'lods/lod.json',
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

      const url = resolveInfoURL(meshId);
      try {
        logDebug('Loading fake info:', url);
        const resp = await fetch(url);
        if (!resp.ok) {
          throw new Error(
            `Unable to get info file: ${url}!\nError #${resp.status}: ${resp.statusText}`
          );
        }
        const data = await resp.json();
        assertOctreeInfo(data);
        return {
          bbox: data.bbox as BBox,
          blockIds: data.files.map((name) =>
            name.endsWith('.glb') ? name.slice(0, name.length - 4) : name
          ),
        };
      } catch (error) {
        logError(`Unable to load info for mesh #${meshId}:`, error);
        return null;
      }
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
            assetPath: `lods/${blockId}.glb`,
            asRawResponse: true,
          });
          return {
            type: 'glb',
            data: await response.arrayBuffer(),
          };
        }
      } catch (error) {
        logError(`Unable to load block ${blockId} for mesh #${meshId}:`, error);
        return null;
      }

      const url = resolveBlockURL(meshId, blockId);
      try {
        logDebug('Loading fake:', url);
        const resp = await fetch(url);
        if (!resp.ok) {
          logError(`Unable to get info file: ${url}!\nError #${resp.status}: ${resp.statusText}`);
          return null;
        }
        return {
          type: 'glb',
          data: await resp.arrayBuffer(),
        };
      } catch (error) {
        logError(`Unable to load block ${blockId} for mesh #${meshId}:`, error);
        return null;
      }
    },
  };
}

const BASE_URL = 'https://openbraininstitute.github.io/morphoviewer/assets/octree/1';

function resolveInfoURL(_meshId: string) {
  return `${BASE_URL}/lod.json`;
}

function resolveBlockURL(_meshId: string, blockId: string) {
  return `${BASE_URL}/${blockId}.glb`;
}

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

async function fetchAsset(ctx: WorkspaceContext | undefined, meshId: string) {
  const assets = await getAssets({
    ctx,
    entityId: meshId,
    entityType: 'em_cell_mesh',
  });
  const asset = assets.data.find((item) => item.label === 'lod_mesh_block');
  return asset;
}
