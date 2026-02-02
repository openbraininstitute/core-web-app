'use client';

import { EMCellMeshSchema } from '@/ui/segments/contribute/em-cell-mesh/schema';
import { LicenseSelector } from '@/ui/segments/contribute/shared/components/license-selector';

export function License() {
  return <LicenseSelector schema={EMCellMeshSchema} />;
}
