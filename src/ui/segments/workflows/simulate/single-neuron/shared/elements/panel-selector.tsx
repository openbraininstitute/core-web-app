'use client';

import { parseAsString, type Parser, useQueryState } from 'nuqs';
import { match } from 'ts-pattern';

import { Content as SynaptomeContent } from '@/ui/segments/workflows/simulate/single-neuron/single-neuron-synaptome';
import { Content as MEModelContent } from '@/ui/segments/workflows/simulate/single-neuron/memodel';
import { Results } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/result';
import { SimulationType } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import {
  PanelQueryParam,
  WorkflowSimulatePanelKeys,
  WorkflowSimulatePanels,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';

import type { IMEModel, ISingleNeuronSynaptome } from '@/api/entitycore/types';

type Props =
  | {
      sessionId: string;
      type: typeof SimulationType.SingleNeuronSynaptome;
      synaptome: ISingleNeuronSynaptome;
      memodel: IMEModel;
    }
  | {
      sessionId: string;
      type: typeof SimulationType.SingleNeuron;
      memodel: IMEModel;
      synaptome?: never;
    };

export function PanelSelector({ sessionId, synaptome, memodel, type }: Props) {
  const [panelId] = useQueryState(
    PanelQueryParam,
    parseAsString
      .withOptions({
        clearOnDefault: false,
        shallow: true,
      })
      .withDefault(WorkflowSimulatePanels.Configuration) as Parser<WorkflowSimulatePanelKeys>
  );

  const Panel = match({ panelId, type })
    .with(
      { panelId: WorkflowSimulatePanels.Configuration, type: SimulationType.SingleNeuron },
      () => {
        return <MEModelContent sessionId={sessionId} memodel={memodel} />;
      }
    )
    .with(
      { panelId: WorkflowSimulatePanels.Configuration, type: SimulationType.SingleNeuronSynaptome },
      () => {
        return <SynaptomeContent sessionId={sessionId} synaptome={synaptome!} memodel={memodel} />;
      }
    )
    .with({ panelId: WorkflowSimulatePanels.Results }, () => {
      return <Results sessionId={sessionId} />;
    })
    .otherwise(() => null);

  return Panel;
}
