'use client';

import { useQuery } from '@tanstack/react-query';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getAsset } from '@/api/entitycore/selectors/assets';
import { AssetLabel } from '@/api/entitycore/types/shared/global';

import type { Ipynb } from '@jupyter-kit/core';
import type { TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

export function useNotebookContent({
  entityType,
  entityId,
  assets,
  ctx,
  enabled = true,
}: {
  entityType: TEntityTypeDict;
  entityId: string;
  assets: IAsset[];
  ctx?: WorkspaceContext | null;
  /** gate the download — used to lazily fetch only when a row is in view */
  enabled?: boolean;
}) {
  const asset = getAsset({
    assets,
    label: AssetLabel.jupyter_notebook,
  }).getOneOrNull();

  const query = useQuery({
    queryKey: ['notebook-content', entityType, { entityId, notebookAssetId: asset?.id }],
    enabled: enabled && Boolean(asset),
    staleTime: 60 * 60 * 1000, // 1 hour
    queryFn: async (): Promise<Ipynb> => {
      if (!asset) throw new Error('Notebook has no jupyter_notebook asset');
      const response = await downloadAsset({
        entityType,
        entityId,
        id: asset.id,
        ctx: ctx ?? undefined,
        asRawResponse: true,
      });
      return JSON.parse(await response.text()) as Ipynb;
    },
  });

  return { ...query, hasAsset: Boolean(asset) };
}
