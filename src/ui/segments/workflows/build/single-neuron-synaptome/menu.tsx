"use client";

import { useSearchParams } from "next/navigation";

import { useDefaultBreakpoint } from "@/ui/hooks/create-break-point";
import {
  BuildStep,
  useBuildSingleNeuronSynaptomeSessionState,
} from "@/ui/segments/workflows/build/single-neuron-synaptome/helpers";

import { useStepChangeHandler } from "./hooks";
import SectionBuildSynaptomeButton from "./sections/section-build-synaptome-button";
import SectionInfo from "./sections/section-info";
import SectionModelSelection from "./sections/section-model-selection";
import SectionSynapseSets from "./sections/section-synapse-sets";

type Props = { sessionId: string };

export function Menu({ sessionId }: Props) {
  const breakpoint = useDefaultBreakpoint();
  const searchParams = useSearchParams();
  const step = searchParams.get("step");
  const { sessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    sessionId,
  });
  const handleStepChange = useStepChangeHandler();

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="text-neutral-3 ml-4 font-light uppercase">Setup</div>
      <SectionInfo
        breakpoint={breakpoint}
        name={sessionValue?.name}
        active={step === BuildStep.Info}
        onClick={() => handleStepChange(BuildStep.Info)}
      />
      <div className="text-neutral-3 ml-4 font-light uppercase">Modeling</div>
      <SectionModelSelection
        breakpoint={breakpoint}
        memodel={sessionValue?.memodel}
        active={step === BuildStep.MEModel}
        onClick={() => handleStepChange(BuildStep.MEModel)}
      />
      <SectionSynapseSets
        breakpoint={breakpoint}
        memodel={sessionValue?.memodel}
        sessionId={sessionId}
        active={step === BuildStep.SynapseSet}
        onClick={() => handleStepChange(BuildStep.SynapseSet)}
        synapseSets={sessionValue?.synapseSets}
      />
      <SectionBuildSynaptomeButton
        sessionId={sessionId}
        active={!!sessionValue?.name && !!sessionValue?.memodel}
        breakpoint={breakpoint}
      />
    </div>
  );
}
