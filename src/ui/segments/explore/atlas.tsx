'use client';

import { useAtomValue } from 'jotai';
import dynamic from 'next/dynamic';

import { Loader } from '@/components/loader';
import { speciesSelectionModeAtom } from '@/features/brain-region-hierarchy/context';
import { SpeciesSelectionMode } from '@/features/brain-region-hierarchy/types';
import { cn } from '@/utils/css-class';

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
  const isAllSpeciesMode = useAtomValue(speciesSelectionModeAtom) === SpeciesSelectionMode.All;

  return (
    <div
      id="three-d-area"
      data-testid="three-d-area"
      className={cn(
        '3d relative h-full max-h-[calc(100vh-11.8rem)] min-h-0 w-full min-w-0 overflow-hidden rounded-2xl [grid-area:body]',
        isAllSpeciesMode ? 'bg-transparent rounded-none' : 'bg-primary-9 p-1'
      )}
    >
      <div
        className={cn(
          'h-full min-h-0 w-full',
          isAllSpeciesMode
            ? 'overflow-y-auto overscroll-contain secondary-scrollbar'
            : 'overflow-hidden'
        )}
      >
        <AtlasViewer>{children}</AtlasViewer>
      </div>
    </div>
  );
}
