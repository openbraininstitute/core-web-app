'use client';

import { useSearchParams } from 'next/navigation';
import { match, P } from 'ts-pattern';
import { useDisableElementOverflow } from '@/ui/hooks/use-disable-element-overflow';
import {
  BuildStep,
  useBuildSingleNeuronSynaptomeSessionState,
} from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import { MEModel } from '@/ui/segments/workflows/build/single-neuron-synaptome/me-model';
import { Info } from '@/ui/segments/workflows/build/single-neuron-synaptome/overview';
import { SynapseSetConfiguration } from '@/ui/segments/workflows/build/single-neuron-synaptome/synapse-configuration';

type Props = {
  sessionId: string;
};

export function Content({ sessionId }: Props) {
  useDisableElementOverflow({ id: 'workspace-body' });
  const searchParams = useSearchParams();
  const step = searchParams.get('step') ?? BuildStep.Info;
  const { sessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    sessionId,
  });

  const content = match({ step, sessionValue })
    .with({ step: BuildStep.Info }, () => <Info sessionId={sessionId} />)
    .with({ step: BuildStep.MEModel }, () => <MEModel sessionId={sessionId} />)
    .with(
      {
        step: BuildStep.SynapseSet,
        sessionValue: { memodel: P.nonNullable.select('memodel') },
      },
      () => <SynapseSetConfiguration sessionId={sessionId} />,
    )
    .otherwise(() => null);

  return content;
}
