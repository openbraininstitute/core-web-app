'use client';

import { CellMorphologySchema } from '@/ui/segments/contribute/cell-morphology/schema';
import { LicenseSelector } from '@/ui/segments/contribute/shared/components/license-selector';

export function License() {
  return <LicenseSelector schema={CellMorphologySchema} />;
}
