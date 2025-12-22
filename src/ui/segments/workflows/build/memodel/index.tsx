'use client';

import isNil from 'es-toolkit/compat/isNil';
import { useSearchParams } from 'next/navigation';
import { match, P } from 'ts-pattern';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { EModel, EModelMiniDetail } from '@/ui/segments/workflows/build/memodel/e-model';
import {
  BuildStep,
  useBuildMeModelSessionState,
} from '@/ui/segments/workflows/build/memodel/helpers';
import { MModel, MModelMiniDetail } from '@/ui/segments/workflows/build/memodel/m-model';
import { Info } from '@/ui/segments/workflows/build/memodel/overview';

type Props = {
  sessionId: string;
};

export function Content({ sessionId }: Props) {
  const searchParams = useSearchParams();
  const { virtualLabId, projectId } = useWorkspace();
  const step = searchParams.get('step') ?? BuildStep.Info;
  const { sessionValue } = useBuildMeModelSessionState({
    sessionId,
    virtualLabId,
    projectId,
  });

  const content = match({ step, sessionValue })
    .with({ step: BuildStep.Info }, () => <Info sessionId={sessionId} />)
    .with(
      { step: BuildStep.MModel },
      () => isNil(sessionValue) || isNil(sessionValue.mmodel),
      () => <MModel sessionId={sessionId} />
    )
    .with(
      { step: BuildStep.MModel, sessionValue: P.when((v) => !isNil(v.mmodel)) },
      () => !isNil(sessionValue.mmodel),
      () => <MModelMiniDetail sessionId={sessionId} />
    )
    .with(
      { step: BuildStep.EModel },
      () => isNil(sessionValue) || isNil(sessionValue.emodel),
      () => <EModel sessionId={sessionId} />
    )
    .with(
      { step: BuildStep.EModel },
      () => !isNil(sessionValue.emodel),
      () => <EModelMiniDetail sessionId={sessionId} />
    )
    .otherwise(() => null);

  return content;
}
