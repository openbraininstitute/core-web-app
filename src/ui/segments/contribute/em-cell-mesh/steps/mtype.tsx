'use client';

import { EMCellMeshSchema } from '@/ui/segments/contribute/em-cell-mesh/schema';
import { MTypeClassificationSelector } from '@/ui/segments/contribute/shared/components/mtype-selector';

export function MTypeClassification() {
  return <MTypeClassificationSelector schema={EMCellMeshSchema} />;
}
