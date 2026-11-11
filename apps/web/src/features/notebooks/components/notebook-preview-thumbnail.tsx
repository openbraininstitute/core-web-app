'use client';

import { Empty, Skeleton } from 'antd';
import Image from 'next/image';
import { useMemo } from 'react';
import { useInView } from 'react-intersection-observer';

import { useNotebookImages } from '@/features/notebooks/hooks/use-notebook-images';

import type { TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import type { IAsset } from '@/api/entitycore/types/shared/global';

type NotebookEntityLike = {
  id: string;
  name?: string;
  type: TEntityTypeDict;
  assets: IAsset[];
};

const PREVIEW_WIDTH = 184;
const PREVIEW_HEIGHT = 116;

// stable pick: same row always shows the same figure across renders, but the
// choice varies between rows so the listing shows a variety of figures.
function pickIndex(seed: string, length: number): number {
  if (length <= 1) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % length;
}

export function NotebookPreviewThumbnail({ record }: { record: NotebookEntityLike }) {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });
  const { images, isLoading, isError, hasAsset } = useNotebookImages(record, { enabled: inView });

  const chosen = useMemo(() => {
    if (images.length === 0) return null;
    return images[pickIndex(record.id, images.length)];
  }, [images, record.id]);

  const noPreview = !hasAsset || isError || (inView && !isLoading && images.length === 0);

  let content: React.ReactNode;
  if (noPreview) {
    content = (
      <Empty
        description="No preview"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        className="m-0 flex h-full! w-full! flex-col items-center justify-center rounded-none!"
        style={{ height: PREVIEW_HEIGHT, width: PREVIEW_WIDTH }}
      />
    );
  } else if (!inView || isLoading || !chosen) {
    content = (
      <Skeleton.Image
        active
        className="h-full! w-full! rounded-none!"
        rootClassName="m-0 flex h-full! w-full! flex-col items-center justify-center rounded-none!"
        style={{ height: PREVIEW_HEIGHT, width: PREVIEW_WIDTH }}
      />
    );
  } else {
    content = (
      <Image
        alt={record.name ? `${record.name} preview` : 'Notebook preview'}
        src={chosen.src}
        width={PREVIEW_WIDTH}
        height={PREVIEW_HEIGHT}
        unoptimized
        className="border-neutral-3 h-full border object-contain"
      />
    );
  }

  return (
    <div
      ref={ref}
      data-testid="notebook-preview-thumbnail"
      className="flex items-center justify-center"
      style={{ height: PREVIEW_HEIGHT, width: PREVIEW_WIDTH }}
    >
      {content}
    </div>
  );
}
