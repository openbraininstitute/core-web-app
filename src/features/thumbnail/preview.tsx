'use client';

import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';
import { Empty, Skeleton } from 'antd';
import { match, P } from 'ts-pattern';
import isEmpty from 'lodash/isEmpty';
import Image from 'next/image';

import { getPreviewBlob } from '@/api/thumbnail-svc';
import { tryCatch } from '@/api/utils';

import type { EntityCoreResource } from '@/api/entitycore/types/shared/global';
import { useParams } from 'next/navigation';

interface T extends EntityCoreResource {}

export default function PreviewThumbnail({
  resource,
  className,
  dpi,
  size,
  target,
  alt = 'img preview',
}: {
  resource: T;
  className?: string;
  dpi?: number;
  size?: { height: number; width: number };
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

  const params = useParams();
  const { virtualLabId, projectId } = params;

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
        className="h-full! w-full! rounded-none"
        rootClassName="border-neutral-2 flex h-full! w-full! flex-col items-center justify-center border m-0"
      />
    ))
    .with({ loading: false, thumbnail: P.string.minLength(1).select() }, (thumbnail) => (
      <Image
        key={`thumbnail-${resource.id}`}
        alt={`${'name' in resource ? resource.name : alt}`}
        src={thumbnail}
        className={className}
        height={size?.height ?? 300}
        width={size?.width ?? 400}
      />
    ))
    .with({ error: P.nonNullable }, () => (
      <Empty
        key={`thumbnail-error-${resource.id}`}
        description="Error loading thumbnail"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        className="m-0 flex h-full! w-full! flex-col items-center justify-center"
      />
    ))
    .otherwise(() => (
      <Empty
        key={`thumbnail-empty-${resource.id}`}
        description="No thumbnail available"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        className="m-0 flex h-full! w-full! flex-col items-center justify-center"
      />
    ));

  return (
    <div
      ref={ref}
      className="flex items-center justify-center"
      style={{
        height: typeof size !== 'string' && size ? size?.height : size,
        width: typeof size !== 'string' && size ? size?.width : size,
      }}
    >
      {component}
    </div>
  );
}
