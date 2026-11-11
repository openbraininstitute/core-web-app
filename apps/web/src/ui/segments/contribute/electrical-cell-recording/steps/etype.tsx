'use client';

import { ElectricalCellRecordingSchema } from '@/ui/segments/contribute/electrical-cell-recording/schema';
import { ETypeClassificationSelector } from '@/ui/segments/contribute/shared/components/etype-selector';

export function ETypeClassification() {
  return <ETypeClassificationSelector schema={ElectricalCellRecordingSchema} />;
}
