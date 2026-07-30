'use client';

import { useQuery } from '@tanstack/react-query';
import { Empty, Image } from 'antd';
import { useState } from 'react';

import { getEntityCorePresignedUrl } from '@/services/entity-download/pre-singed-url';
import { Skeleton } from '@/ui/molecules/skeleton';
import { keyBuilder } from '@/ui/use-query-keys/third-parties';
import { cn } from '@/utils/css-class';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { TActivityCustomFile } from '@/features/scan-config/types';
import type { WorkspaceContext } from '@/types/common';

type ImageFileViewerProps = {
  file: TActivityCustomFile;
  context: WorkspaceContext;
};

export function ImageFileViewer({ file, context }: ImageFileViewerProps) {
  const { entity, asset, assetPath } = file;
  const [loadedForUrl, setLoadedForUrl] = useState<string | null>(null);

  const { data: imageUrl, isLoading: isLoadingUrl } = useQuery({
    queryKey: keyBuilder.s3presignedUrl({ entityId: entity.id, assetId: asset.id, ...context }),
    queryFn: async () => {
      const { url } = await getEntityCorePresignedUrl({
        entityType: entity.type as TEntityTypeDict,
        entityId: entity.id,
        virtualLabId: context.virtualLabId,
        projectId: context.projectId,
        configAssetId: asset.id,
        assetPath,
      });
      return url;
    },
    enabled: !!entity.id && !!asset.id,
    staleTime: Infinity,
  });

  const imageLoaded = !!imageUrl && loadedForUrl === imageUrl;
  const showLoading = isLoadingUrl || (!!imageUrl && !imageLoaded);

  if (!isLoadingUrl && !imageUrl) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <Empty description="Failed to load image" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      {showLoading ? <Skeleton className="absolute inset-0 size-full rounded-none!" /> : null}

      {imageUrl ? (
        <div
          className={cn('absolute inset-0 flex items-center justify-center', {
            invisible: !imageLoaded,
          })}
        >
          <Image
            alt={asset.path}
            src={imageUrl}
            preview
            onLoad={() => setLoadedForUrl(imageUrl)}
            className="h-auto! w-auto! max-h-full max-w-full object-contain"
            rootClassName="flex max-h-full max-w-full items-center justify-center"
          />
        </div>
      ) : null}
    </div>
  );
}
