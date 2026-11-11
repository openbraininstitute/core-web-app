'use client';

import { ElectricalCellRecordingSchema } from '@/ui/segments/contribute/electrical-cell-recording/schema';
import { LicenseSelector } from '@/ui/segments/contribute/shared/components/license-selector';

export function License() {
  return <LicenseSelector schema={ElectricalCellRecordingSchema} />;
}
