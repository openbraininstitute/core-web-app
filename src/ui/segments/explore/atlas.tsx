'use client';

import { useAtomValue } from 'jotai';
import { ViewTransition } from 'react';

import { Loader } from '@/components/loader';
import { useAtlasViewer } from '@/features/brain-atlas-viewer/use-atlas-viewer';
import { speciesSelectionModeAtom } from '@/features/brain-region-hierarchy/context';
import { SpeciesSelectionMode } from '@/features/brain-region-hierarchy/types';
import { ATLAS_ZOOM, morphAtlasOnCompositor } from '@/ui/segments/explore/atlas-morph';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

/** Shared by the full atlas and the mini atlas, so navigating between them morphs one into the other. */
export const ATLAS_VIEW_TRANSITION = 'data-atlas';

type Props = {
  children: ReactNode;
};

export function Atlas({ children }: Props) {
  const isAllSpeciesMode = useAtomValue(speciesSelectionModeAtom) === SpeciesSelectionMode.All;
  const viewer = useAtlasViewer();

  return (
    <ViewTransition
      name={ATLAS_VIEW_TRANSITION}
      share="atlas-morph"
      default="none"
      onShare={(morph) =>
        morphAtlasOnCompositor(morph, { from: ATLAS_ZOOM.full, to: ATLAS_ZOOM.mini })
      }
    >
      <div
        id="three-d-area"
        data-testid="three-d-area"
        className={cn(
          '3d relative h-full min-h-0 w-full min-w-0 overflow-hidden rounded-2xl [grid-area:body]',
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
          {viewer ? (
            <viewer.AtlasViewer>{children}</viewer.AtlasViewer>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Loader />
            </div>
          )}
        </div>
      </div>
    </ViewTransition>
  );
}
