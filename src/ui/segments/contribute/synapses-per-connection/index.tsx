// index.tsx

'use client';

import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  ContributionForm,
  type TSingleContributionPageShell,
} from '@/ui/segments/contribute/shared/components/contribution-form';
import {
  createExperimentalSynapsesPerConnectionConfig,
  EXPERIMENTAL_SYNAPSES_PER_CONNECTION_PROGRESS_STEPS,
} from '@/ui/segments/contribute/synapses-per-connection/config';
import { useExperimentalSynapsesPerConnectionPipeline } from '@/ui/segments/contribute/synapses-per-connection/pipeline';
import {
  Contribution,
  License,
  Measurements,
  Setup,
  Subject,
} from '@/ui/segments/contribute/synapses-per-connection/steps';
import { AppUInterfaceSection, resolveDataKey } from '@/utils/key-builder';

import type { IContributionStep } from '@/ui/segments/contribute/shared/types';
import type { TExperimentalSynapsesPerConnectionForm } from '@/ui/segments/contribute/synapses-per-connection/schema';

const EXPERIMENTAL_SYNAPSES_PER_CONNECTION_STEP_CONFIG: Array<
  IContributionStep<TExperimentalSynapsesPerConnectionForm>
> = [
  {
    key: 'setup',
    label: 'Setup',
    // @ts-expect-error - Allow array for multi-field validation; component handles it
    schemaFieldKey: [
      'name',
      'description',
      'pre_region_id',
      'post_region_id',
      'pre_mtype_id',
      'post_mtype_id',
    ],
    component: Setup,
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
  pageShell: TSingleContributionPageShell;
}

export function ExperimentalSynapsesPerConnection({
  sessionId,
  pageShell,
}: IExperimentalSynapsesPerConnectionProps) {
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
      pageShell={pageShell}
    />
  );
}
