'use client';

import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';
import { Empty, Skeleton } from 'antd';
import { match, P } from 'ts-pattern';
import isEmpty from 'lodash/isEmpty';
import Image from 'next/image';
import { useParams } from 'next/navigation';

import { getPreviewBlob } from '@/api/thumbnail-svc';
import { classNames } from '@/util/utils';
import { tryCatch } from '@/api/utils';

import type { EntityCoreResource } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

interface T extends EntityCoreResource {}

export function PreviewThumbnail({
  resource,
  className,
  dpi,
  width,
  height,
  target,
  alt = 'img preview',
}: {
  resource: T;
  className?: string;
  dpi?: number;
  width?: number | string;
  height?: number | string;
  target?: 'simulation' | 'stimulus';
  alt?: string;
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
        className="h-full! w-full! rounded-none!"
        rootClassName="flex h-full! w-full! flex-col items-center justify-center  m-0 rounded-none!"
        style={{
          height: typeof height === 'number' ? height : undefined,
          width: typeof width === 'number' ? width : undefined,
        }}
      />
    ))
    .with({ loading: false, thumbnail: P.string.minLength(1).select() }, (thumbnail) => (
      <Image
        key={`thumbnail-${resource.id}`}
        alt={`${'name' in resource ? resource.name : alt}`}
        src={thumbnail}
        className={className}
        height={typeof height === 'number' ? height : 140}
        width={typeof width === 'number' ? width : 196}
      />
    ))
    .with({ error: P.nonNullable }, ({ error }) => {
      return (
        <Empty
          key={`thumbnail-error-${resource.id}`}
          description={
            (error as { cause?: { message: string; code: string } }).cause?.message ??
            'No thumbnail available'
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          className={classNames(
            'm-0 flex h-full! w-full! flex-col items-center justify-center rounded-none!',
            '[&_.ant-empty-description]:text-center [&_.ant-empty-description]:break-words [&_.ant-empty-description]:whitespace-normal',
            '[&_.ant-empty-description]:text-red-300! [&_.ant-empty-image>svg>g_g]:stroke-red-300!'
          )}
          style={{
            height: typeof height === 'number' ? height : undefined,
            width: typeof width === 'number' ? width : undefined,
          }}
        />
      );
    })
    .otherwise(() => (
      <Empty
        key={`thumbnail-empty-${resource.id}`}
        description="No thumbnail available"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        className="m-0 flex h-full! w-full! flex-col items-center justify-center rounded-none!"
        style={{
          height: typeof height === 'number' ? height : undefined,
          width: typeof width === 'number' ? width : undefined,
        }}
      />
    ));

  return (
    <div
      ref={ref}
      className="flex items-center justify-center"
      style={{
        height: typeof height === 'number' ? height : 140,
        width: typeof width === 'number' ? width : 196,
      }}
    >
      {component}
    </div>
  );
}

export default PreviewThumbnail;
