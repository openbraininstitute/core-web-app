'use client';

import { useSearchParams } from 'next/navigation';

import { HOME_DESIGN_PARAM, homeDesignOf } from '@/ui/segments/project/home-designs';
import { BrainsWalkthroughPage } from '@/ui/segments/project/brains-walkthrough/brains-walkthrough-page';
import { ModelsHomePage } from '@/ui/segments/project/models-home/models-home-page';
import { OriginalHomePage } from '@/ui/segments/project/original-home';
import { StartPage } from '@/ui/segments/project/start/start-page';
import { WalkthroughPage } from '@/ui/segments/project/walkthrough/walkthrough-page';

/** The project home, in the design its address names: the home as on main unless it names another. */
export function ProjectHome() {
  const design = homeDesignOf(useSearchParams().get(HOME_DESIGN_PARAM));
  if (design === 'walkthrough') return <WalkthroughPage />;
  if (design === 'models') return <ModelsHomePage />;
  // Made again for the other landing, as for another page.
  if (design === 'brains' || design === 'fly-brain') {
    return <BrainsWalkthroughPage key={design} walking={design === 'brains'} />;
  }
  if (design === 'rows') return <StartPage />;
  return <OriginalHomePage />;
}
