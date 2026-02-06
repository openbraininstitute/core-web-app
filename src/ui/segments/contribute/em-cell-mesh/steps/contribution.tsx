'use client';

import { EMCellMeshSchema } from '@/ui/segments/contribute/em-cell-mesh/schema';
import { ContributionSelector } from '@/ui/segments/contribute/shared/components/contribution-selector';

export function Contribution() {
  return <ContributionSelector schema={EMCellMeshSchema} />;
}
