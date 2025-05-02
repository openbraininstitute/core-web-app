'use client';

import { useInView } from 'react-intersection-observer';
import { useState } from 'react';

import type { EntityCoreResource } from '@/api/entitycore/types/shared/global';

interface T extends EntityCoreResource {}

export default function PreviewImage({
  resource,
  className,
  dpi,
  size,
  alt = 'img preview',
}: {
  resource: T;
  className?: string;
  dpi?: number;
  size?: { height: number; width: number } | string;
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

  return (
    <div
      ref={ref}
      className="flex items-center justify-center"
      style={{
        height: typeof size !== 'string' && size ? size?.height : size,
        width: typeof size !== 'string' && size ? size?.width : size,
      }}
    >
      <div className="text-red-500">EntityCore Needed</div>
    </div>
  );
}
