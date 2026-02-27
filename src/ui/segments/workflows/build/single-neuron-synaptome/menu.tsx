'use client';

import { useRouter } from '@bprogress/next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import delay from 'es-toolkit/compat/delay';
import kebabCase from 'es-toolkit/compat/kebabCase';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';

import { SingleNeuronSynaptomeConfigurationSchema } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { createSingleNeuronSynaptome } from '@/api/small-scale-simulator';
import { tryCatch } from '@/api/utils';
import { useAppNotification } from '@/components/notification';
import { config } from '@/config';
import { messages } from '@/i18n/en/synaptome';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  BuildStep,
  useBuildSingleNeuronSynaptomeSessionState,
} from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import { ActivityValues } from '@/ui/segments/workflows/elements/helpers';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import { useStepChangeHandler } from './hooks';
import SectionBuildSynaptomeButton from './sections/section-build-synaptome-button';
import SectionInfo from './sections/section-info';
import SectionModelSelection from './sections/section-model-selection';
import SectionSynapseSets from './sections/section-synapse-sets';

type Props = { sessionId: string };

export function Menu({ sessionId }: Props) {
  const breakpoint = useDefaultBreakpoint();
  const searchParams = useSearchParams();
  const step = searchParams.get('step');
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
