'use client';

import { useSetAtom } from 'jotai';
import { useSelectedLayoutSegment } from 'next/navigation';
import { useLayoutEffect } from 'react';

import { allowAllSpeciesAtom } from '@/features/brain-region-hierarchy/context';

/**
 * keeps `allowAllSpeciesAtom` aligned with the data section URL:
 * - `/.../projectId/data` (3D viewer index): "All" is hidden, atlas needs a focused species
 * - any other path under browse section (e.g. `/data/browse/...`): "All" is allowed
 */
export function SyncAllowAllSpeciesForDataBrowseRoute() {
  const setAllowAllSpecies = useSetAtom(allowAllSpeciesAtom);
  const selectedLayoutSegment = useSelectedLayoutSegment();
  const isData3dViewerIndex = selectedLayoutSegment === null;

  useLayoutEffect(() => {
    setAllowAllSpecies(!isData3dViewerIndex);
    return () => setAllowAllSpecies(true);
  }, [isData3dViewerIndex, setAllowAllSpecies]);

  return null;
}
