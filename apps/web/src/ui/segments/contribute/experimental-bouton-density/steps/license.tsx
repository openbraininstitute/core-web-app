'use client';

import { ExperimentalBoutonDensitySchema } from '@/ui/segments/contribute/experimental-bouton-density/schema';
import { LicenseSelector } from '@/ui/segments/contribute/shared/components/license-selector';

export function License() {
  return <LicenseSelector schema={ExperimentalBoutonDensitySchema} />;
}
