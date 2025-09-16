import { useState, useRef, useEffect, useCallback } from 'react';
import { CloseCircleFilled } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import { Progress, Empty } from 'antd';
import { match, P } from 'ts-pattern';

import isNumber from 'lodash/isNumber';
import NextImage from 'next/image';

import { trackDownloadProgress } from '@/utils/track-download-progress';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeEnum } from '@/api/entitycore/types';
import { classNames } from '@/util/utils';

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
}: Props) {
  const context = useParams<WorkspaceContext>();
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle'); // idle, loading, loaded, error
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<{
    message: string;
    type: 'download' | 'missing-asset';
  } | null>(null);

  const [calculatedDimensions, setCalculatedDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
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

  const downloadImage = useCallback(
    async () => {
      if (!asset) {
        setStatus('error');
        setError({
          message: 'The asset for this entity is missing, please contact support.',
          type: 'missing-asset',
        });
        return;
      }
      try {
        setStatus('loading');
        setError(null);
        setDownloadProgress(0);

        const response = await trackDownloadProgress(
          () =>
            downloadAsset({
              entityId,
              assetPath,
              entityType: EntityTypeEnum.Circuit,
              id: asset?.id!,
              ctx: context,
              asRawResponse: true,
            }),
          (progress) => {
            setDownloadProgress(progress);
          }
        );

        const blob = new Blob(response, { type: 'image/webp' });
        const url = URL.createObjectURL(blob);

        const tempImg = new Image();
        tempImg.onload = () => {
          const dimensions = computeResponsiveSize(tempImg.naturalWidth, tempImg.naturalHeight);

          setImageUrl(url);
          setStatus('loaded');
          setCalculatedDimensions(dimensions);
        };
        tempImg.src = url;
      } catch (err: any) {
        setError({
          message: 'message' in err ? (err as { message: string }).message : 'Unknown error',
          type: 'download',
        });
        setStatus('error');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityId, asset?.id, context.virtualLabId, context.projectId, assetPath, computeResponsiveSize]
  );

  const retryDownload = () => {
    setCalculatedDimensions(null);
    downloadImage();
  };

  useEffect(() => {
    downloadImage();
  }, [downloadImage]);

  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  useEffect(() => {
    const updateHeight = () => {
      const aspectRatio =
        Number(calculatedDimensions?.width) / Number(calculatedDimensions?.height);
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
  }, [calculatedDimensions]);

  return match({ status, asset })
    .with({ status: 'idle' }, () => (
      <div
        className="flex w-full flex-col items-center justify-center border border-gray-300 bg-gray-100 p-4"
        style={{ width, height }}
      >
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="" />
      </div>
    ))
    .with({ status: 'loading' }, () => (
      <div
        className="flex flex-col items-center justify-center border border-gray-100 bg-gray-100/20"
        style={{ width, height }}
      >
        <div className="space-y-4 text-center">
          <div className="space-y-2">
            <Progress
              type="circle"
              percent={Math.round(downloadProgress)}
              size={64}
              strokeColor="#096dd9"
              showInfo
              className="[&_.ant-progress-text]:text-primary-8!"
            />
          </div>
        </div>
      </div>
    ))
    .with({ status: 'error' }, () => (
      <div
        className={classNames(
          'flex flex-col items-center justify-center border border-red-50 bg-red-50'
        )}
        style={{ width, height }}
      >
        <div className="space-y-4 text-center">
          <CloseCircleFilled allowTransparency className="mx-auto text-5xl text-rose-700" />
          <div className="space-y-2">
            <p className="text-base font-bold text-red-600">Failed to load image</p>
            <p className="text-xs text-red-500">{error?.message}</p>
          </div>
          {error?.type === 'download' && (
            <button
              type="button"
              onClick={retryDownload}
              className="rounded bg-red-500 px-4 py-2 text-sm text-white transition-colors hover:bg-red-600"
            >
              Retry Download
            </button>
          )}
        </div>
      </div>
    ))
    .with({ status: 'loaded', asset: P.not(P.nullish).select() }, (value) => {
      const newHeight = `calc(${ratioHeight}px + ${yPadding * 2}px)`;
      return (
        <div
          className={classNames('w-full', bordered && 'border border-gray-300', className)}
          style={{
            height: newHeight,
            paddingTop: yPadding,
            paddingBottom: yPadding,
            paddingLeft: xPadding,
            paddingRight: xPadding,
          }}
        >
          <div
            ref={containerRef}
            className="relative transition-all duration-200 ease-in-out"
            style={{ height: ratioHeight }}
          >
            <NextImage
              fill
              ref={imageRef}
              src={imageUrl || ''}
              alt={`${value.path}`}
              style={{
                aspectRatio:
                  Number(calculatedDimensions?.width) / Number(calculatedDimensions?.height),
              }}
              objectFit="contain"
              className="h-full w-full transition-all duration-200 ease-in-out"
            />
          </div>
        </div>
      );
    })
    .otherwise(() => null);
}
