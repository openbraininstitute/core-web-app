'use client';

import { match } from 'ts-pattern';
import { useAtom } from 'jotai';

import { Content as SynaptomeContent } from '@/ui/segments/workflows/simulate/single-neuron/single-neuron-synaptome';
import { Menu as ResultMenu } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/results-menu';
import { WorkflowSimulatePanels } from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import { headerTabsAtom } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/header';
import { Content as MEModelContent } from '@/ui/segments/workflows/simulate/single-neuron/memodel';
import { Results } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/result';
import { SimulationType } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { Menu } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/menu';

import type { IMEModel, ISingleNeuronSynaptome } from '@/api/entitycore/types';

type Props =
  | {
      sessionId: string;
      type: 'synaptome-simulation';
      synaptome: ISingleNeuronSynaptome;
      memodel: IMEModel;
    }
  | {
      sessionId: string;
      type: 'single-neuron-simulation';
      memodel: IMEModel;
      synaptome?: never;
    };

export function PanelSelector({ sessionId, synaptome, memodel, type }: Props) {
  const [panelId] = useAtom(headerTabsAtom);

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

export function MenuSelector({ sessionId, synaptome, memodel, type }: Props) {
  const [panelId] = useAtom(headerTabsAtom);

  const MenuWrapper = match({ panelId, type })
    .with(
      { panelId: WorkflowSimulatePanels.Configuration, type: SimulationType.SingleNeuron },
      () => {
        return <Menu sessionId={sessionId} type={type} />;
      }
    )
    .with({ panelId: WorkflowSimulatePanels.Results, type: SimulationType.SingleNeuron }, () => {
      return <ResultMenu sessionId={sessionId} modelId={memodel!.id} memodelId={memodel.id} />;
    })
    .with(
      { panelId: WorkflowSimulatePanels.Results, type: SimulationType.SingleNeuronSynaptome },
      () => {
        return <ResultMenu sessionId={sessionId} modelId={synaptome!.id} memodelId={memodel.id} />;
      }
    )
    .otherwise(() => {
      return <Menu sessionId={sessionId} type={type} />;
    });

  return MenuWrapper;
}
