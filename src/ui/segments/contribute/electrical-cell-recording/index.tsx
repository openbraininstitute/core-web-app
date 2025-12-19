'use client';

import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  createElectricalCellRecordingConfig,
  ELECTRICAL_CELL_RECORDING_PROGRESS_STEPS,
} from '@/ui/segments/contribute/electrical-cell-recording/config';

import { useElectricalCellRecordingPipeline } from '@/ui/segments/contribute/electrical-cell-recording/pipeline';
import type { TElectricalCellRecordingForm } from '@/ui/segments/contribute/electrical-cell-recording/schema';
import {
  AssetUpload,
  Contribution,
  ETypeClassification,
  License,
  Setup,
  Subject,
} from '@/ui/segments/contribute/electrical-cell-recording/steps';
import { ContributionForm } from '@/ui/segments/contribute/shared/components/contribution-form';
import type { IContributionStep } from '@/ui/segments/contribute/shared/types';
import { AppUInterfaceSection, resolveDataKey } from '@/utils/key-builder';

const ELECTRICAL_CELL_RECORDING_STEP_CONFIG: IContributionStep<TElectricalCellRecordingForm>[] = [
  {
    key: 'assets',
    label: 'Asset Upload',
    schemaFieldKey: 'assets',
    component: AssetUpload,
  },
  {
    key: 'setup',
    label: 'Setup',
    schemaFieldKey: 'setup',
    component: Setup,
  },
  {
    key: 'contribution',
    label: 'Contribution',
    schemaFieldKey: 'contribution',
    component: Contribution,
  },
  {
    key: 'subject',
    label: 'Subject',
    schemaFieldKey: 'subject_id',
    component: Subject,
  },
  {
    key: 'license',
    label: 'License',
    schemaFieldKey: 'license_id',
    component: License,
    hasTooltip: true,
  },
  {
    key: 'etype',
    label: 'E-Type',
    schemaFieldKey: 'etype_class_id',
    component: ETypeClassification,
  },
];

const electricalCellRecordingConfig = createElectricalCellRecordingConfig(
  ELECTRICAL_CELL_RECORDING_STEP_CONFIG,
);

interface IElectricalCellRecordingProps {
  sessionId: string;
}

export function ElectricalCellRecording({ sessionId }: IElectricalCellRecordingProps) {
  const { projectId, virtualLabId } = useWorkspace();
  const { node: defaultBrainRegion } = useBrainRegionHierarchy({
    dataKey: resolveDataKey({ section: AppUInterfaceSection.Data, projectId }),
  });

  return (
    <ContributionForm
      config={electricalCellRecordingConfig}
      sessionId={sessionId}
      brainRegionId={defaultBrainRegion.id}
      pipeline={useElectricalCellRecordingPipeline}
      progressSteps={ELECTRICAL_CELL_RECORDING_PROGRESS_STEPS}
      virtualLabId={virtualLabId}
      projectId={projectId}
    />
  );
}
