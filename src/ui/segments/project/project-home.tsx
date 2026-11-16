'use client';

import { useSearchParams } from 'next/navigation';

import { HOME_DESIGN_PARAM, homeDesignOf } from '@/ui/segments/project/home-designs';
import { HexHomePage } from '@/ui/segments/project/hex-home/hex-home-page';
import { BrainsWalkthroughPage } from '@/ui/segments/project/brains-walkthrough/brains-walkthrough-page';
import { OriginalHomePage } from '@/ui/segments/project/original-home';
import { WalkthroughPage } from '@/ui/segments/project/walkthrough/walkthrough-page';

/** The project home, in the design its address names: the hexagon home unless it names another. */
export function ProjectHome() {
  const design = homeDesignOf(useSearchParams().get(HOME_DESIGN_PARAM));
  if (design === 'hexagons') return <HexHomePage />;
  if (design === 'walkthrough') return <WalkthroughPage />;
  // Made again for the other landing, as for another page.
  if (design === 'brains' || design === 'fly-brain') {
    return <BrainsWalkthroughPage key={design} walking={design === 'brains'} />;
  }
  return <OriginalHomePage />;
}
