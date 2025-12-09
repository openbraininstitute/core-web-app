'use client';

import { MTypeClassificationSelector } from '@/ui/segments/contribute/shared/components/mtype-selector';
import { CellMorphologySchema } from '@/ui/segments/contribute/cell-morphology/schema';

export function MTypeClassification() {
  return <MTypeClassificationSelector schema={CellMorphologySchema} />;
}
