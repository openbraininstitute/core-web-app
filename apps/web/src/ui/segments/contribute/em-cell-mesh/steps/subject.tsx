'use client';

import { EMCellMeshSchema } from '@/ui/segments/contribute/em-cell-mesh/schema';
import { SubjectSelector } from '@/ui/segments/contribute/shared/components/subject-selector';

export function Subject() {
  return <SubjectSelector schema={EMCellMeshSchema} />;
}
