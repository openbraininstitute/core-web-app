'use client';

import { ExperimentalBoutonDensitySchema } from '@/ui/segments/contribute/experimental-bouton-density/schema';
import { MTypeClassificationSelector } from '@/ui/segments/contribute/shared/components/mtype-selector';

export function MTypeClassification() {
  return <MTypeClassificationSelector schema={ExperimentalBoutonDensitySchema} />;
}
