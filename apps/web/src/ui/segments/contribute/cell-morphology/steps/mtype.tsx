'use client';

import { CellMorphologySchema } from '@/ui/segments/contribute/cell-morphology/schema';
import { MTypeClassificationSelector } from '@/ui/segments/contribute/shared/components/mtype-selector';

export function MTypeClassification() {
  return <MTypeClassificationSelector schema={CellMorphologySchema} />;
}
