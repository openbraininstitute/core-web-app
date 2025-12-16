'use client';

import { ElectricalCellRecordingSchema } from '@/ui/segments/contribute/electrical-cell-recording/schema';
import { SubjectSelector } from '@/ui/segments/contribute/shared/components/subject-selector';

export function Subject() {
  return <SubjectSelector schema={ElectricalCellRecordingSchema} />;
}
