'use client';

import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { AppUInterfaceSection, resolveDataKey } from '@/utils/key-builder';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import { ContributionForm } from '@/ui/segments/contribute/shared/components/contribution-form';
import { useCellMorphologyPipeline } from '@/ui/segments/contribute/cell-morphology/pipeline';
import {
  createCellMorphologyConfig,
  CELL_MORPHOLOGY_PROGRESS_STEPS,
} from '@/ui/segments/contribute/cell-morphology/config';
import {
  MTypeClassification,
  Contribution,
  AssetUpload,
  Protocol,
  Setup,
  Subject,
  License,
} from '@/ui/segments/contribute/cell-morphology/steps';

import type { TCellMorphologyForm } from '@/ui/segments/contribute/cell-morphology/schema';
import type { IContributionStep } from '@/ui/segments/contribute/shared/types';

const CELL_MORPHOLOGY_STEP_CONFIG: Array<IContributionStep<TCellMorphologyForm>> = [
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
    key: 'protocol',
    label: 'Protocol',
    schemaFieldKey: 'cell_morphology_protocol_id',
    component: Protocol,
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
    key: 'mtype',
    label: 'M-Type',
    schemaFieldKey: 'mtype_class_id',
    component: MTypeClassification,
  },
];

const cellMorphologyConfig = createCellMorphologyConfig(CELL_MORPHOLOGY_STEP_CONFIG);

interface ICellMorphologyProps {
  sessionId: string;
}

export function CellMorphology({ sessionId }: ICellMorphologyProps) {
  const { projectId, virtualLabId } = useWorkspace();
  const { node: defaultBrainRegion } = useBrainRegionHierarchy({
    dataKey: resolveDataKey({ section: AppUInterfaceSection.Data, projectId }),
  });

  return (
    <ContributionForm
      config={cellMorphologyConfig}
      sessionId={sessionId}
      brainRegionId={defaultBrainRegion.id}
      pipeline={useCellMorphologyPipeline}
      progressSteps={CELL_MORPHOLOGY_PROGRESS_STEPS}
      virtualLabId={virtualLabId}
      projectId={projectId}
    />
  );
}
