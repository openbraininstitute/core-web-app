"use client";

import { useExperimentalNeuronDensityPipeline } from "@/ui/segments/contribute/experimental-neuron-density/pipeline";
import { ContributionForm } from "@/ui/segments/contribute/shared/components/contribution-form";
import { useWorkspaceAtlasHierarchy } from "@/features/brain-region-hierarchy/hooks";
import { AppUInterfaceSection, resolveDataKey } from "@/utils/key-builder";
import {
  EXPERIMENTAL_NEURON_DENSITY_PROGRESS_STEPS,
  createExperimentalNeuronDensityConfig,
} from "@/ui/segments/contribute/experimental-neuron-density/config";
import {
  Contribution,
  Measurements,
  Subject,
  License,
  Setup,
} from "@/ui/segments/contribute/experimental-neuron-density/steps";
import { useWorkspace } from "@/ui/hooks/use-workspace";

import type { TExperimentalNeuronDensityForm } from "@/ui/segments/contribute/experimental-neuron-density/schema";
import type { IContributionStep } from "@/ui/segments/contribute/shared/types";

const EXPERIMENTAL_NEURON_DENSITY_STEP_CONFIG: Array<
  IContributionStep<TExperimentalNeuronDensityForm>
> = [
  {
    key: "setup",
    label: "Setup",
    schemaFieldKey: "setup",
    component: Setup,
  },
  {
    key: "measurements",
    label: "Measurements",
    schemaFieldKey: "measurements",
    component: Measurements,
  },
  {
    key: "contribution",
    label: "Contribution",
    schemaFieldKey: "contribution",
    component: Contribution,
  },
  {
    key: "subject",
    label: "Subject",
    schemaFieldKey: "subject_id",
    component: Subject,
  },
  {
    key: "license",
    label: "License",
    schemaFieldKey: "license_id",
    component: License,
    hasTooltip: true,
  },
];

const experimentalNeuronDensityConfig = createExperimentalNeuronDensityConfig(
  EXPERIMENTAL_NEURON_DENSITY_STEP_CONFIG,
);

interface IExperimentalNeuronDensityProps {
  sessionId: string;
}

export function ExperimentalNeuronDensity({
  sessionId,
}: IExperimentalNeuronDensityProps) {
  const { projectId, virtualLabId } = useWorkspace();
  const { selectedBrainRegion } = useWorkspaceAtlasHierarchy({
    dataKey: resolveDataKey({ section: AppUInterfaceSection.Data, projectId }),
  });

  return (
    <ContributionForm
      config={experimentalNeuronDensityConfig}
      sessionId={sessionId}
      brainRegionId={selectedBrainRegion?.id!}
      pipeline={useExperimentalNeuronDensityPipeline}
      progressSteps={EXPERIMENTAL_NEURON_DENSITY_PROGRESS_STEPS}
      virtualLabId={virtualLabId}
      projectId={projectId}
    />
  );
}
