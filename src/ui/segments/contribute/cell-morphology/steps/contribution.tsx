'use client';

import { CellMorphologySchema } from '@/ui/segments/contribute/cell-morphology/schema';
import { ContributionSelector } from '@/ui/segments/contribute/shared/components/contribution-selector';

export function Contribution() {
  return <ContributionSelector schema={CellMorphologySchema} />;
}
