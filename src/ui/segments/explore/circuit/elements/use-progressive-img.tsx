import { CloseCircleFilled } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image as AntdImage, Empty, Progress } from 'antd';
import { isNumber } from 'es-toolkit/compat';
import NextImage from 'next/image';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { match, P } from 'ts-pattern';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { keyBuilder } from '@/ui/use-query-keys/data';
import type { DetailViewVariant } from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';
import { trackDownloadProgress } from '@/utils/track-download-progress';

import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

interface Props {
  bordered?: boolean;
  alt: string;
  entityId: string;
  asset: IAsset | undefined;
  assetPath?: string;
  width?: number | string;
  height?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
  className?: string;
  yPadding: number;
  xPadding: number;
  clsx?: {
    progress?: {
      strokeColor?: string;
      className?: string;
    };
    error?: {
      text?: string;
    };
  };
  optimized?: boolean; // whether to use next/image optimization or not (default: true)
  variant?: DetailViewVariant;
}

interface ImageCacheEntry {
  blob: Blob;
  dimensions: { width: number; height: number };
}

export function ProgressiveEntityImage({
  entityId,
  asset,
  assetPath,
  className,
  width = '100%',
  height = '100%',
  maxWidth = 1200,
  maxHeight = 800,
  bordered = true,
  yPadding,
  xPadding,
  clsx,
  optimized = true,
  variant = 'light',
}: Props) {
  const onPrimary = variant === 'onPrimary';
  const context = useParams<WorkspaceContext>();
  const queryClient = useQueryClient();
  const [downloadProgress, setDownloadProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [ratioHeight, setRatioHeight] = useState(maxHeight as number);

  const computeResponsiveSize = useCallback(
    (naturalWidth: number, naturalHeight: number) => {
      const aspectRatio = naturalWidth / naturalHeight;

      let finalWidth = naturalWidth;
      let finalHeight = naturalHeight;

      if (isNumber(maxWidth) && finalWidth > maxWidth) {
        finalWidth = maxWidth;
        finalHeight = finalWidth / aspectRatio;
      }

      if (isNumber(maxHeight) && finalHeight > maxHeight) {
        finalHeight = maxHeight;
        finalWidth = finalHeight * aspectRatio;
      }

      return { width: Math.round(finalWidth), height: Math.round(finalHeight) };
    },
    [maxWidth, maxHeight]
  );

  const queryKey = keyBuilder.asset({
    assetId: asset?.id ?? '',
    entityId,
    assetPath,
    assetType: EntityTypeDict.Circuit,
    context,
    asRawResponse: true,
  });

  const {
    data: cacheEntry,
    isLoading,
    error,
    refetch,
  } = useQuery<ImageCacheEntry>({
    queryKey,
    queryFn: async () => {
      setDownloadProgress(0);

      const response = await trackDownloadProgress(
        () =>
          downloadAsset({
            entityId,
            assetPath,
            entityType: EntityTypeDict.Circuit,
            id: asset!.id,
            ctx: context,
            asRawResponse: true,
          }),
        (progress) => {
          setDownloadProgress(progress);
        }
      );
      const blob = new Blob(response as BlobPart[], { type: 'image/webp' });
      const tempUrl = URL.createObjectURL(blob);
      return new Promise<ImageCacheEntry>((resolve, reject) => {
        const tempImg = new Image();
        tempImg.onload = () => {
          const dimensions = computeResponsiveSize(tempImg.naturalWidth, tempImg.naturalHeight);
          URL.revokeObjectURL(tempUrl);
          resolve({ blob, dimensions });
        };
        tempImg.onerror = () => {
          URL.revokeObjectURL(tempUrl);
          reject(new Error('Failed to decode image'));
        };
        tempImg.src = tempUrl;
      });
    },
    enabled: !!asset,
    staleTime: Infinity,
    retry: false,
  });

  // create a blob URL from the cached Blob for this mount
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!cacheEntry?.blob) {
      setImageUrl(null);
      return;
    }

    const url = URL.createObjectURL(cacheEntry.blob);
    setImageUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [cacheEntry?.blob]);

  // responsive height calculation
  useEffect(() => {
    const updateHeight = () => {
      const aspectRatio =
        Number(cacheEntry?.dimensions?.width) / Number(cacheEntry?.dimensions?.height);
      if (containerRef.current) {
        const newWidth = containerRef.current.offsetWidth;
        setRatioHeight(newWidth / aspectRatio!);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);

    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, [cacheEntry?.dimensions]);

  const missingAsset = !asset;
  const status = missingAsset
    ? 'missing-asset'
    : isLoading
      ? 'loading'
      : error
        ? 'error'
        : imageUrl
          ? 'loaded'
          : 'idle';

  const retryDownload = () => {
    queryClient.removeQueries({ queryKey });
    refetch();
  };

  return match({ status, asset })
    .with({ status: 'idle' }, () => (
      <div
        className={cn(
          'flex w-full flex-col items-center justify-center border p-4',
          onPrimary ? 'border-white/20 bg-white/10' : 'border-gray-300 bg-gray-100'
        )}
        style={{ width, height }}
      >
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="" />
      </div>
    ))
    .with({ status: 'missing-asset' }, () => (
      <div
        className={cn('flex flex-col items-center justify-center border border-red-50 bg-red-50')}
        style={{ width, height }}
      >
        <div className="space-y-4 text-center">
          <CloseCircleFilled allowTransparency className="mx-auto text-5xl text-rose-700" />
          <div className="space-y-2">
            <p className={cn('text-base font-bold text-red-600', clsx?.error?.text)}>
              Failed to load image
            </p>
            <p className={cn('text-xs text-red-500', clsx?.error?.text)}>
              The asset for this entity is missing, please contact support.
            </p>
          </div>
        </div>
      </div>
    ))
    .with({ status: 'loading' }, () => (
      <div
        className={cn(
          'flex flex-col items-center justify-center border',
          onPrimary ? 'border-white/20 bg-white/10' : 'border-gray-100 bg-gray-100/20'
        )}
        style={{ width, height }}
      >
        <div className="space-y-4 text-center">
          <div className="space-y-2">
            <Progress
              showInfo
              type="circle"
              percent={Math.round(downloadProgress)}
              size={64}
              strokeColor={clsx?.progress?.strokeColor || (onPrimary ? '#fff' : '#096dd9')}
              className={cn(
                onPrimary
                  ? '[&_.ant-progress-text]:text-white!'
                  : '[&_.ant-progress-text]:text-primary-8!',
                clsx?.progress?.className
              )}
            />
          </div>
        </div>
      </div>
    ))
    .with({ status: 'error' }, () => (
      <div
        className={cn('flex flex-col items-center justify-center border border-red-50 bg-red-50')}
        style={{ width, height }}
      >
        <div className="space-y-4 text-center">
          <CloseCircleFilled allowTransparency className="mx-auto text-5xl text-rose-700" />
          <div className="space-y-2">
            <p className={cn('text-base font-bold text-red-600', clsx?.error?.text)}>
              Failed to load image
            </p>
            <p className={cn('text-xs text-red-500', clsx?.error?.text)}>
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
          <button
            type="button"
            onClick={retryDownload}
            className={cn(
              'rounded bg-red-500 px-4 py-2 text-sm text-white transition-colors hover:bg-red-600',
              clsx?.error?.text
            )}
          >
            Retry Download
          </button>
        </div>
      </div>
    ))
    .with({ status: 'loaded', asset: P.not(P.nullish).select() }, (value) => {
      const aspectRatio =
        Number(cacheEntry?.dimensions?.width) / Number(cacheEntry?.dimensions?.height);
      const hasNumericMaxHeight = isNumber(maxHeight);

      return (
        <div
          className={cn(
            'w-full',
            bordered && (onPrimary ? 'border border-neutral-2' : 'border border-gray-300'),
            className
          )}
          style={{
            paddingTop: yPadding,
            paddingBottom: yPadding,
            paddingLeft: xPadding,
            paddingRight: xPadding,
          }}
        >
          <div
            ref={containerRef}
            className="relative transition-all duration-200 ease-in-out"
            style={{
              height: hasNumericMaxHeight ? ratioHeight : undefined,
              maxHeight: hasNumericMaxHeight ? maxHeight : undefined,
              aspectRatio: !hasNumericMaxHeight && aspectRatio ? aspectRatio : undefined,
            }}
          >
            {optimized ? (
              <NextImage
                fill
                ref={imageRef}
                src={imageUrl || ''}
                alt={`${value.path}`}
                style={{ aspectRatio }}
                objectFit="contain"
                className="h-full w-full transition-all duration-200 ease-in-out"
              />
            ) : (
              <AntdImage
                src={imageUrl || ''}
                alt={`${value.path}`}
                style={{ aspectRatio }}
                rootClassName="w-full h-full flex items-center justify-center [&_.ant-image-preview-mask]:bg-white!"
                className="h-full w-full object-contain transition-all duration-200 ease-in-out"
                preview={{ maskClassName: 'bg-white' }}
              />
            )}
          </div>
        </div>
      );
    })
    .otherwise(() => null);
}
