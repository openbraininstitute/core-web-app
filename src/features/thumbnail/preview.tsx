import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { Empty, Skeleton } from 'antd';
import { match, P } from 'ts-pattern';
import isEmpty from 'lodash/isEmpty';
import Image from 'next/image';

import { tryCatch } from '@/api/utils';
import { getPreviewBlob } from '@/api/thumbnail-svc';
import type { EntityCoreResource } from '@/api/entitycore/types/shared/global';

export default function PreviewThumbnail({
  resource,
  className,
  dpi,
  size,
  target,
  alt = 'img preview',
}: {
  resource: EntityCoreResource;
  className?: string;
  dpi?: number;
  size?: { height: number; width: number } | string;
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

  useEffect(() => {
    async function buildPreview() {
      setState((prev) => ({ ...prev, loading: true }));
      const { data, error } = await tryCatch<Blob>(getPreviewBlob(resource));
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
          error: error,
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
  }, [dpi, target, inView, resource]);

  const component = match(state)
    .with({ loading: true }, () => (
      <Skeleton.Image
        active
        key={`thumbnail-loader-${resource.id}`}
        className="!h-full !w-full rounded-none"
        rootClassName="!h-full !w-full"
      />
    ))
    .with({ loading: false, thumbnail: P.string.minLength(1).select() }, (thumbnail) => (
      <Image
        key={`thumbnail-${resource.id}`}
        alt={alt}
        src={thumbnail}
        className={className}
        height={typeof size !== 'string' ? size?.height : undefined}
        width={typeof size !== 'string' ? size?.width : undefined}
      />
    ))
    .with({ error: P.nonNullable }, () => (
      <Empty
        key={`thumbnail-error-${resource.id}`}
        description="Error loading thumbnail"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        className="!h-full !w-full"
      />
    ))
    .otherwise(() => (
      <Empty
        key={`thumbnail-empty-${resource.id}`}
        description="No thumbnail available"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        className="!h-full !w-full"
      />
    ));

  return (
    <div
      ref={ref}
      className="flex items-center justify-center"
      style={{
        height: typeof size !== 'string' ? size?.height : size,
        width: typeof size !== 'string' ? size?.width : size,
      }}
    >
      {component}
    </div>
  );
}
