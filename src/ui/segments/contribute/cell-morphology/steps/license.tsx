'use client';

import { LicenseSelector } from '@/ui/segments/contribute/shared/components/license-selector';
import { CellMorphologySchema } from '@/ui/segments/contribute/cell-morphology/schema';

export function License() {
  return <LicenseSelector schema={CellMorphologySchema} />;
}
