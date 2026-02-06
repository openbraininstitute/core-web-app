'use client';

import { ExperimentalBoutonDensitySchema } from '@/ui/segments/contribute/experimental-bouton-density/schema';
import { ContributionSelector } from '@/ui/segments/contribute/shared/components/contribution-selector';

export function Contribution() {
  return <ContributionSelector schema={ExperimentalBoutonDensitySchema} />;
}
