'use client';

import dynamic from 'next/dynamic';

import { Loader } from '@/ui/molecules/loader';

import type { ReactNode } from 'react';

const AtlasViewer = dynamic(() => import('@/features/brain-atlas-viewer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <Loader />
    </div>
  ),
});

type Props = {
  children: ReactNode;
};

export function Atlas({ children }: Props) {
  return (
    <div
      id="three-d-area"
      data-testid="three-d-area"
      className="3d bg-primary-9 relative h-full w-full rounded-2xl p-1"
    >
      <AtlasViewer>{children}</AtlasViewer>
    </div>
  );
}
