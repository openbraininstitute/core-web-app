'use client';

import { parseAsString, SingleParserBuilder, useQueryState } from 'nuqs';
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
      .withDefault(
        WorkflowSimulatePanels.Configuration
      ) as SingleParserBuilder<WorkflowSimulatePanelKeys>
  );

  const MenuWrapper = match({ panelId, type })
    .with(
      { panelId: WorkflowSimulatePanels.Configuration, type: SimulationType.SingleNeuron },
      () => {
        return (
          <Menu
            sessionId={sessionId}
            simulationType={type}
            modelId={memodel!.id}
            memodelId={memodel.id}
          />
        );
      }
    )
    .with(
      { panelId: WorkflowSimulatePanels.Configuration, type: SimulationType.SingleNeuronSynaptome },
      () => {
        return (
          <Menu
            sessionId={sessionId}
            simulationType={type}
            modelId={synaptome!.id}
            memodelId={memodel.id}
          />
        );
      }
    )
    .with({ panelId: WorkflowSimulatePanels.Results, type: SimulationType.SingleNeuron }, () => {
      return <ResultMenu sessionId={sessionId} type={SimulationType.SingleNeuron} />;
    })
    .with(
      { panelId: WorkflowSimulatePanels.Results, type: SimulationType.SingleNeuronSynaptome },
      () => {
        return <ResultMenu sessionId={sessionId} type={SimulationType.SingleNeuronSynaptome} />;
      }
    )
    .otherwise(() => {
      return null;
    });

  return MenuWrapper;
}
