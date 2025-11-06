/* eslint-disable no-nested-ternary */

'use client';

import { useInView } from 'react-intersection-observer';
import { ReactNode, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Empty, Skeleton } from 'antd';
import { match, P } from 'ts-pattern';
import isEmpty from 'es-toolkit/compat/isEmpty';
import Image from 'next/image';

import { getPreviewBlob } from '@/api/thumbnail-svc';
import { tryCatch } from '@/api/utils';
import { cn } from '@/utils/css-class';

import type { EntityCoreResource } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

interface T extends EntityCoreResource {}

export function PreviewThumbnail({
  resource,
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
}: {
  resource: T;
  className?: string;
  rootClassName?: string;
  loadingClassName?: string;
  dpi?: number;
  width?: number | string;
  height?: number | string;
  target?: 'simulation' | 'stimulus';
  alt?: string;
  fill?: boolean;
  customRender?: (src: string) => ReactNode;
}) {
  const { ref, inView } = useInView({ threshold: 0.2 });
  const [state, setState] = useState<{
    thumbnail: string | null;
    loading: boolean;
    error: Error | null;
  }>({
    loading: false,
    thumbnail: '',
    error: null,
  });

  const { virtualLabId, projectId } = useParams<WorkspaceContext>();

  useEffect(() => {
    async function buildPreview() {
      setState((prev) => ({ ...prev, loading: true }));
      const { data, error } = await tryCatch<Blob>(
        getPreviewBlob(
          resource,
          virtualLabId as string | undefined,
          projectId as string | undefined,
          target
        )
      );

      if (data && data.type === 'image/png') {
        setState((prev) => ({
          ...prev,
          loading: false,
          thumbnail: URL.createObjectURL(data),
        }));
      } else {
        setState((prev) => ({
          ...prev,
          loading: false,
          error,
          thumbnail: null,
        }));
      }
    }
    if (inView && isEmpty(state.thumbnail)) buildPreview();

    return () => {
      if (state.thumbnail) {
        URL.revokeObjectURL(state.thumbnail);
      }
    };
  }, [dpi, target, inView, resource, state.thumbnail, virtualLabId, projectId]);

  const component = match(state)
    .with({ loading: true }, () => (
      <Skeleton.Image
        active
        key={`thumbnail-loader-${resource.id}`}
        className={cn('h-full! w-full! rounded-none!', loadingClassName)}
        rootClassName={cn(
          `skeleton-empty-${resource.id}`,
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
      { loading: false, thumbnail: P.string.minLength(1).select() },
      (thumbnail) =>
        customRender?.(thumbnail) ?? (
          <Image
            key={`thumbnail-${resource.id}`}
            alt={`${'name' in resource ? resource.name : alt}`}
            src={thumbnail}
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
          key={`thumbnail-error-${resource.id}`}
          description="Thumbnail generation in progress"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          className={cn(
            `thumbnail-error-${resource.id}`,
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
        key={`thumbnail-empty-${resource.id}`}
        description="No thumbnail available"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        className={cn(
          `thumbnail-empty-${resource.id}`,
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
