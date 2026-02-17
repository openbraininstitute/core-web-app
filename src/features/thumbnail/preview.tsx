/* eslint-disable no-nested-ternary */

'use client';

import { useQuery } from '@tanstack/react-query';
import { Empty, Skeleton } from 'antd';
import Image from 'next/image';
import { useInView } from 'react-intersection-observer';
import { match, P } from 'ts-pattern';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getAssetElement } from '@/api/entitycore/utils';
import { getPreviewBlob } from '@/api/thumbnail-svc';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';

import type { AssetLabel, EntityCoreResource } from '@/api/entitycore/types/shared/global';
import type {
  TEntityAssetTarget,
  TThumbnailServiceTarget,
} from '@/entity-configuration/definitions/renderer';

interface T extends EntityCoreResource {}

type BaseProps = {
  entity: T;
  className?: string;
  rootClassName?: string;
  loadingClassName?: string;
  dpi?: number;
  width?: number | string;
  height?: number | string;
  alt?: string;
  fill?: boolean;
  customRender?: (src: string) => React.ReactNode;
};

type ThumbnailServiceTargetProps = BaseProps & {
  target?: TThumbnailServiceTarget;
  label?: never;
};

type EntityAssetTargetProps = BaseProps & {
  target?: TEntityAssetTarget;
  label: AssetLabel;
};

type PreviewThumbnailProps = ThumbnailServiceTargetProps | EntityAssetTargetProps;

export function PreviewThumbnail({
  entity,
  className,
  rootClassName,
  loadingClassName,
  dpi,
  width,
  height,
  target,
  alt = 'img preview',
  fill,
  customRender,
  label,
}: PreviewThumbnailProps) {
  const { virtualLabId, projectId } = useWorkspace();
  const { ref, inView } = useInView({ threshold: 0.2 });

  const {
    data: thumbnail,
    isLoading,
    error,
  } = useQuery({
    queryKey: keyBuilder.preview(
      { virtualLabId, projectId },
      { entityId: entity?.id, dpi, target }
    ),
    queryFn: async () => {
      if (target === 'assetLabel') {
        const asset = getAssetElement({
          assets: entity.assets,
          filter(i) {
            return i.label === label;
          },
        });
        if (asset) {
          const resp = await downloadAsset({
            ctx: { projectId, virtualLabId },
            entityType: entity.type,
            entityId: entity.id,
            id: asset.id,
            asRawResponse: false,
          });
          if (!(resp instanceof ArrayBuffer)) {
            throw new Error('Wrong image format: expected ArrayBuffer!');
          }
          const blob = new Blob([resp], { type: asset.content_type });
          return blob;
        }
        throw new Error('No asset found for the given label!');
      }
      return await getPreviewBlob(
        entity,
        virtualLabId as string | undefined,
        projectId as string | undefined,
        target as TThumbnailServiceTarget
      );
    },
    select: (data) => URL.createObjectURL(data),
    enabled: inView && !!entity,
  });

  const component = match({ isLoading, error, thumbnail })
    .with({ isLoading: true }, () => (
      <Skeleton.Image
        active
        key={`thumbnail-loader-${entity.id}`}
        className={cn('h-full! w-full! rounded-none!', loadingClassName)}
        rootClassName={cn(
          `skeleton-empty-${entity.id}`,
          'flex h-full! w-full! flex-col items-center justify-center  m-0 rounded-none!'
        )}
        style={{
          height: fill
            ? undefined
            : typeof height === 'number' || typeof height === 'string'
              ? height
              : undefined,
          width: fill
            ? undefined
            : typeof width === 'number' || typeof height === 'string'
              ? width
              : undefined,
        }}
      />
    ))
    .with(
      { isLoading: false, thumbnail: P.string.minLength(1).select() },
      (thmb) =>
        customRender?.(thmb) ?? (
          <Image
            key={`thumbnail-${entity.id}`}
            alt={`${'name' in entity ? entity.name : alt}`}
            src={thmb}
            className={className}
            fill={fill}
            height={fill ? undefined : typeof height === 'number' ? height : 140}
            width={fill ? undefined : typeof width === 'number' ? width : 196}
            style={{
              height: fill
                ? undefined
                : typeof height === 'number' || typeof height === 'string'
                  ? height
                  : 140,
              width: fill
                ? undefined
                : typeof width === 'number' || typeof height === 'string'
                  ? width
                  : 196,
            }}
          />
        )
    )
    .with({ error: P.nonNullable }, () => {
      return (
        <Empty
          key={`thumbnail-error-${entity.id}`}
          description="Thumbnail generation in progress"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          className={cn(
            `thumbnail-error-${entity.id}`,
            'm-0 flex h-full! w-full! flex-col items-center justify-center rounded-none!',
            '[&_.ant-empty-description]:text-center [&_.ant-empty-description]:break-words [&_.ant-empty-description]:whitespace-normal',
            '[&_.ant-empty-description]:text-red-300! [&_.ant-empty-image>svg>g_g]:stroke-red-300!',
            loadingClassName
          )}
          style={{
            height: fill
              ? undefined
              : typeof height === 'number' || typeof height === 'string'
                ? height
                : undefined,
            width: fill
              ? undefined
              : typeof width === 'number' || typeof height === 'string'
                ? width
                : undefined,
          }}
        />
      );
    })
    .otherwise(() => (
      <Empty
        key={`thumbnail-empty-${entity.id}`}
        description="No thumbnail available"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        className={cn(
          `thumbnail-empty-${entity.id}`,
          'm-0 flex h-full! w-full! flex-col items-center justify-center rounded-none!',
          loadingClassName
        )}
        style={{
          height: fill
            ? undefined
            : typeof height === 'number' || typeof height === 'string'
              ? height
              : undefined,
          width: fill
            ? undefined
            : typeof width === 'number' || typeof height === 'string'
              ? width
              : undefined,
        }}
      />
    ));

  return (
    <div
      ref={ref}
      className={cn('flex items-center justify-center', rootClassName)}
      style={{
        height: fill
          ? undefined
          : typeof height === 'number' || typeof height === 'string'
            ? height
            : 140,
        width: fill
          ? undefined
          : typeof width === 'number' || typeof width === 'string'
            ? width
            : 196,
      }}
    >
      {component}
    </div>
  );
}

export default PreviewThumbnail;
