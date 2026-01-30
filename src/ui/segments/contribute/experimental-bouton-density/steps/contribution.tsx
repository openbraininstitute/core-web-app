'use client';

import { ContributionSelector } from '@/ui/segments/contribute/shared/components/contribution-selector';
import { ExperimentalBoutonDensitySchema } from '@/ui/segments/contribute/experimental-bouton-density/schema';

export function Contribution() {
  return <ContributionSelector schema={ExperimentalBoutonDensitySchema} />;
}
