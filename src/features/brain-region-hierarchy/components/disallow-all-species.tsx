'use client';

import { useSetAtom } from 'jotai';
import { useEffect } from 'react';

import { allowAllSpeciesAtom } from '@/features/brain-region-hierarchy/context';

/**
 * disables the "All" species option on the mounting route.
 * used by the 3D viewer page, which must always operate on a focused species
 * restores the allow flag on unmount so other routes regain the option.
 */
export function DisallowAllSpecies() {
  const setAllowAllSpecies = useSetAtom(allowAllSpeciesAtom);

  useEffect(() => {
    setAllowAllSpecies(false);
    return () => setAllowAllSpecies(true);
  }, [setAllowAllSpecies]);

  return null;
}
