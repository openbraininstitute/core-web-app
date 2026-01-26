'use client';

import { MTypeClassificationSelector } from '@/ui/segments/contribute/shared/components/mtype-selector';
import { ExperimentalBoutonDensitySchema } from '@/ui/segments/contribute/experimental-bouton-density/schema';

export function MTypeClassification() {
  return <MTypeClassificationSelector schema={ExperimentalBoutonDensitySchema} />;
}
