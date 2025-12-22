'use client';

import { ContributionSelector } from '@/ui/segments/contribute/shared/components/contribution-selector';
import { CellMorphologySchema } from '@/ui/segments/contribute/cell-morphology/schema';

export function Contribution() {
  return <ContributionSelector schema={CellMorphologySchema} />;
}
