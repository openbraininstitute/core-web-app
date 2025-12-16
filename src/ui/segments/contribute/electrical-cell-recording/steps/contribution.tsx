'use client';

import { ElectricalCellRecordingSchema } from '@/ui/segments/contribute/electrical-cell-recording/schema';
import { ContributionSelector } from '@/ui/segments/contribute/shared/components/contribution-selector';

export function Contribution() {
  return <ContributionSelector schema={ElectricalCellRecordingSchema} />;
}
