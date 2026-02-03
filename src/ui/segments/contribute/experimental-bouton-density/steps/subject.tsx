'use client';

import { ExperimentalBoutonDensitySchema } from '@/ui/segments/contribute/experimental-bouton-density/schema';
import { SubjectSelector } from '@/ui/segments/contribute/shared/components/subject-selector';

export function Subject() {
  return <SubjectSelector schema={ExperimentalBoutonDensitySchema} />;
}
