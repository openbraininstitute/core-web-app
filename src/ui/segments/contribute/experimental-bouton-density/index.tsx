'use client';

import type { TExperimentalBoutonDensityForm } from '@/ui/segments/contribute/experimental-bouton-density/schema';
import type { IContributionStep } from '@/ui/segments/contribute/shared/types';

import { useWorkspaceHierarchyRegistry } from '@/features/brain-region-hierarchy/hooks';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  createExperimentalBoutonDensityConfig,
  EXPERIMENTAL_BOUTON_DENSITY_PROGRESS_STEPS,
} from '@/ui/segments/contribute/experimental-bouton-density/config';
import { useExperimentalBoutonDensityPipeline } from '@/ui/segments/contribute/experimental-bouton-density/pipeline';
import {
  Contribution,
  License,
  Measurements,
  MTypeClassification,
  Setup,
  Subject,
} from '@/ui/segments/contribute/experimental-bouton-density/steps';
import { ContributionForm } from '@/ui/segments/contribute/shared/components/contribution-form';

const EXPERIMENTAL_BOUTON_DENSITY_STEP_CONFIG: Array<
  IContributionStep<TExperimentalBoutonDensityForm>
> = [
  {
    key: 'setup',
    label: 'Setup',
    schemaFieldKey: 'setup',
    component: Setup,
  },
  {
    key: 'measurements',
    label: 'Measurements',
    schemaFieldKey: 'measurements',
    component: Measurements,
  },
  {
    key: 'mtype',
    label: 'M-type',
    schemaFieldKey: 'mtype_class_id',
    component: MTypeClassification,
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
];

const experimentalBoutonDensityConfig = createExperimentalBoutonDensityConfig(
  EXPERIMENTAL_BOUTON_DENSITY_STEP_CONFIG
);

interface IExperimentalBoutonDensityProps {
  sessionId: string;
}

export function ExperimentalBoutonDensity({ sessionId }: IExperimentalBoutonDensityProps) {
  const { projectId, virtualLabId } = useWorkspace();
  const { selectedBrainRegion } = useWorkspaceHierarchyRegistry();

  return (
    <ContributionForm
      config={experimentalBoutonDensityConfig}
      sessionId={sessionId}
      brainRegionId={selectedBrainRegion?.id!}
      pipeline={useExperimentalBoutonDensityPipeline}
      progressSteps={EXPERIMENTAL_BOUTON_DENSITY_PROGRESS_STEPS}
      virtualLabId={virtualLabId}
      projectId={projectId}
    />
  );
}
