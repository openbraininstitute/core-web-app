'use client';

import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  createEMCellMeshConfig,
  EM_CELL_MESH_PROGRESS_STEPS,
} from '@/ui/segments/contribute/em-cell-mesh/config';
import { useEMCellMeshPipeline } from '@/ui/segments/contribute/em-cell-mesh/pipeline';
import {
  EMAssetUpload,
  Contribution,
  License,
  MTypeClassification,
  Setup,
  Subject,
} from '@/ui/segments/contribute/em-cell-mesh/steps';
import { ContributionForm } from '@/ui/segments/contribute/shared/components/contribution-form';
import { AppUInterfaceSection, resolveDataKey } from '@/utils/key-builder';

import type { TEMCellMeshForm } from '@/ui/segments/contribute/em-cell-mesh/schema';
import type { IContributionStep } from '@/ui/segments/contribute/shared/types';

const EM_CELL_MESH_STEP_CONFIG: IContributionStep<TEMCellMeshForm>[] = [
  {
    key: 'assets',
    label: 'Asset Upload',
    schemaFieldKey: 'assets',
    component: EMAssetUpload,
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
    key: 'mtype',
    label: 'M-Type',
    schemaFieldKey: 'mtype_class_id',
    component: MTypeClassification,
  },
];

const cellMorphologyConfig = createEMCellMeshConfig(EM_CELL_MESH_STEP_CONFIG);

interface IEMCellMeshProps {
  sessionId: string;
}

export function EMCellMesh({ sessionId }: IEMCellMeshProps) {
  const { projectId, virtualLabId } = useWorkspace();
  const { node: defaultBrainRegion } = useBrainRegionHierarchy({
    dataKey: resolveDataKey({ section: AppUInterfaceSection.Data, projectId }),
  });

  return (
    <ContributionForm
      config={cellMorphologyConfig}
      sessionId={sessionId}
      brainRegionId={defaultBrainRegion.id}
      pipeline={useEMCellMeshPipeline}
      progressSteps={EM_CELL_MESH_PROGRESS_STEPS}
      virtualLabId={virtualLabId}
      projectId={projectId}
    />
  );
}
