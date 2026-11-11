'use client';

import { useMemo } from 'react';

import { useWorkspace } from '@/ui/hooks/use-workspace';

import { useNotebookContent } from './use-notebook-content';

import type { Ipynb } from '@jupyter-kit/core';
import type { TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import type { IAsset } from '@/api/entitycore/types/shared/global';

type NotebookEntityLike = {
  id: string;
  type: TEntityTypeDict;
  assets: IAsset[];
};

export type NotebookImage = {
  /** ready-to-use data URL for an <img src> */
  src: string;
  /** originating cell index — handy for stable keys */
  cellIndex: number;
  outputIndex: number;
};

// nbformat stores rich outputs under `data`, keyed by mime type. Bitmap images
// are base64 (png/jpeg/gif); svg is raw markup. Order here is the display
// preference when a single output carries several representations.
const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'] as const;

function toDataUrl(mime: string, value: string): string {
  // svg is inline XML rather than base64
  if (mime === 'image/svg+xml') {
    return `data:image/svg+xml;utf8,${encodeURIComponent(value)}`;
  }
  return `data:${mime};base64,${value.replace(/\s/g, '')}`;
}

/**
 * Pull every embedded image out of a parsed notebook, in document order.
 * Pure so it can be unit-tested and reused outside React.
 */
export function extractNotebookImages(ipynb: Ipynb | undefined): NotebookImage[] {
  if (!ipynb?.cells?.length) return [];

  const images: NotebookImage[] = [];
  ipynb.cells.forEach((cell, cellIndex) => {
    cell.outputs?.forEach((output, outputIndex) => {
      const data = output.data;
      if (!data) return;
      for (const mime of IMAGE_MIME_TYPES) {
        const raw = data[mime];
        if (typeof raw === 'string' && raw.length > 0) {
          images.push({ src: toDataUrl(mime, raw), cellIndex, outputIndex });
          break; // one image per output; take the highest-preference mime
        }
      }
    });
  });
  return images;
}

/**
 * Loads a notebook's content and returns the images embedded in its outputs.
 * Shares the React Query cache with {@link useNotebookContent}, so the listing
 * thumbnail and the mini-detail gallery never refetch the same notebook.
 */
export function useNotebookImages(
  record: NotebookEntityLike,
  { enabled = true }: { enabled?: boolean } = {}
) {
  const { virtualLabId, projectId } = useWorkspace();
  const { data, isLoading, isError, hasAsset } = useNotebookContent({
    entityType: record.type,
    entityId: record.id,
    assets: record.assets,
    ctx: { virtualLabId, projectId },
    enabled,
  });

  const images = useMemo(() => extractNotebookImages(data), [data]);

  return { images, isLoading, isError, hasAsset };
}
