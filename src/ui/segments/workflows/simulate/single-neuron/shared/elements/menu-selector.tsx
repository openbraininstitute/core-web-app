'use client';

import { parseAsString, type Parser, useQueryState } from 'nuqs';
import { match } from 'ts-pattern';

import { Menu as ResultMenu } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/results-menu';
import { SimulationType } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { Menu } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/menu';
import {
  PanelQueryParam,
  WorkflowSimulatePanelKeys,
  WorkflowSimulatePanels,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';

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

export function MenuSelector({ sessionId, synaptome, memodel, type }: Props) {
  const [panelId] = useQueryState(
    PanelQueryParam,
    parseAsString
      .withOptions({
        clearOnDefault: false,
        shallow: true,
      })
      .withDefault(WorkflowSimulatePanels.Configuration) as Parser<WorkflowSimulatePanelKeys>
  );

  const MenuWrapper = match({ panelId, type })
    .with(
      { panelId: WorkflowSimulatePanels.Configuration, type: SimulationType.SingleNeuron },
      () => {
        return <Menu sessionId={sessionId} type={type} />;
      }
    )
    .with({ panelId: WorkflowSimulatePanels.Results, type: SimulationType.SingleNeuron }, () => {
      return (
        <ResultMenu
          sessionId={sessionId}
          modelId={memodel!.id}
          memodelId={memodel.id}
          type={SimulationType.SingleNeuron}
        />
      );
    })
    .with(
      { panelId: WorkflowSimulatePanels.Results, type: SimulationType.SingleNeuronSynaptome },
      () => {
        return (
          <ResultMenu
            sessionId={sessionId}
            modelId={synaptome!.id}
            memodelId={memodel.id}
            type={SimulationType.SingleNeuronSynaptome}
          />
        );
      }
    )
    .otherwise(() => {
      return <Menu sessionId={sessionId} type={type} />;
    });

  return MenuWrapper;
}
