// index.tsx

'use client';

import { useExperimentalSynapsesPerConnectionPipeline } from '@/ui/segments/contribute/synapses-per-connection/pipeline';
import { ContributionForm } from '@/ui/segments/contribute/shared/components/contribution-form';
import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { AppUInterfaceSection, resolveDataKey } from '@/utils/key-builder';
import {
  EXPERIMENTAL_SYNAPSES_PER_CONNECTION_PROGRESS_STEPS,
  createExperimentalSynapsesPerConnectionConfig,
} from '@/ui/segments/contribute/synapses-per-connection/config';
import {
  Contribution,
  Measurements,
  Subject,
  License,
  Setup,
} from '@/ui/segments/contribute/synapses-per-connection/steps';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import type { TExperimentalSynapsesPerConnectionForm } from '@/ui/segments/contribute/synapses-per-connection/schema';
import type { IContributionStep } from '@/ui/segments/contribute/shared/types';

const EXPERIMENTAL_SYNAPSES_PER_CONNECTION_STEP_CONFIG: Array<
  IContributionStep<TExperimentalSynapsesPerConnectionForm>
> = [
  {
    key: 'setup',
    label: 'Setup',
    // FIX: Each field needs to be validated separately, not as an array
    schemaFieldKey: ['name', 'description', 'pre_region_id', 'post_region_id', 'pre_mtype_id', 'post_mtype_id'],
    component: Setup,
    // FIX: Add custom validation function to ensure all required fields are filled
    isValid: (values: TExperimentalSynapsesPerConnectionForm) => {
      // Check all required fields
      return !!(
        values.name &&
        values.brain_region_id &&
        values.pre_region_id &&
        values.post_region_id &&
        values.pre_mtype_id &&
        values.post_mtype_id
      );
    },
  },
  {
    key: 'measurements',
    label: 'Measurements',
    schemaFieldKey: 'measurements',
    component: Measurements,
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

const experimentalSynapsesPerConnectionConfig = createExperimentalSynapsesPerConnectionConfig(
  EXPERIMENTAL_SYNAPSES_PER_CONNECTION_STEP_CONFIG
);

interface IExperimentalSynapsesPerConnectionProps {
  sessionId: string;
}

export function ExperimentalSynapsesPerConnection({ sessionId }: IExperimentalSynapsesPerConnectionProps) {
  const { projectId, virtualLabId } = useWorkspace();
  const { node: defaultBrainRegion } = useBrainRegionHierarchy({
    dataKey: resolveDataKey({ section: AppUInterfaceSection.Data, projectId }),
  });

  return (
    <ContributionForm
      config={experimentalSynapsesPerConnectionConfig}
      sessionId={sessionId}
      brainRegionId={defaultBrainRegion.id}
      pipeline={useExperimentalSynapsesPerConnectionPipeline}
      progressSteps={EXPERIMENTAL_SYNAPSES_PER_CONNECTION_PROGRESS_STEPS}
      virtualLabId={virtualLabId}
      projectId={projectId}
    />
  );
}