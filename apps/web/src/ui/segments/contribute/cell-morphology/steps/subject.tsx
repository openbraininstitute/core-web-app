'use client';

import { CellMorphologySchema } from '@/ui/segments/contribute/cell-morphology/schema';
import { SubjectSelector } from '@/ui/segments/contribute/shared/components/subject-selector';

export function Subject() {
  return <SubjectSelector schema={CellMorphologySchema} />;
}
