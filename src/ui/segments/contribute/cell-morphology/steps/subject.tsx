'use client';

import { SubjectSelector } from '@/ui/segments/contribute/shared/components/subject-selector';
import { CellMorphologySchema } from '@/ui/segments/contribute/cell-morphology/schema';

export function Subject() {
  return <SubjectSelector schema={CellMorphologySchema} />;
}
