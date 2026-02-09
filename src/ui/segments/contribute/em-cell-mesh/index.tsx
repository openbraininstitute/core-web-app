'use client';

import { useWorkspaceHierarchyRegistry } from '@/features/brain-region-hierarchy/hooks';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  createEMCellMeshConfig,
  EM_CELL_MESH_PROGRESS_STEPS,
} from '@/ui/segments/contribute/em-cell-mesh/config';
import { useEMCellMeshPipeline } from '@/ui/segments/contribute/em-cell-mesh/pipeline';
import {
  AssetUpload,
  Contribution,
  License,
  MTypeClassification,
  Setup,
  Subject,
} from '@/ui/segments/contribute/em-cell-mesh/steps';
import { ContributionForm } from '@/ui/segments/contribute/shared/components/contribution-form';

import type { TEMCellMeshForm } from '@/ui/segments/contribute/em-cell-mesh/schema';
import type { IContributionStep } from '@/ui/segments/contribute/shared/types';

const EM_CELL_MESH_STEP_CONFIG: IContributionStep<TEMCellMeshForm>[] = [
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
  const { selectedBrainRegion } = useWorkspaceHierarchyRegistry();

  return (
    <ContributionForm
      config={cellMorphologyConfig}
      sessionId={sessionId}
      brainRegionId={selectedBrainRegion?.id!}
      pipeline={useEMCellMeshPipeline}
      progressSteps={EM_CELL_MESH_PROGRESS_STEPS}
      virtualLabId={virtualLabId}
      projectId={projectId}
    />
  );
}
