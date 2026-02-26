import { useAtom } from 'jotai';

import { getSingleNeuronSynaptomePlacement } from '@/api/small-scale-simulator';
import { tryCatch } from '@/api/utils';
import useWorkspace from '@/ui/hooks/use-workspace';
import { SynapsesPlacementAtomFamily } from '@/ui/segments/workflows/simulate/single-neuron/shared/context';

import { useErrorHandler } from './error';

import type React from 'react';
import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { Config, SessionValue } from '../types';

export function useApplyChangesHandler(
  sessionId: string,
  sessionValue: SessionValue,
  setSessionValue: (sessionValue: SessionValue) => void,
  setVisualizeLoading: (value: boolean) => void,
  config: Config | undefined,
  configRef: React.RefObject<Config | undefined>
) {
  const handleError = useErrorHandler(config?.id, sessionValue);
  const { virtualLabId, projectId } = useWorkspace();
  const [synapsesPlacement, setSynapsesPlacementAtom] = useAtom(
    SynapsesPlacementAtomFamily(sessionId)
  );
  const modelId = sessionValue?.memodel?.id;
  const onHideSynapse = () => {
    if (config?.id) {
      const currentSynapsesPlacementConfig = synapsesPlacement?.[config.id];
      if (currentSynapsesPlacementConfig?.visible) {
        setSynapsesPlacementAtom({
          ...synapsesPlacement,
          [config.id]: {
            ...currentSynapsesPlacementConfig,
            count: undefined,
            visible: false,
          },
        });
      }
    }
  };

  return async (values: TSingleNeuronSynaptomeConfiguration) => {
    if (config) {
      setVisualizeLoading(true);
      onHideSynapse();
      const seed = sessionValue?.seed ?? 100;
      try {
        const configSet = {
          color: config.color,
          id: config.id,
          seed: config.seed,
          name: values.name,
          formula: values.formula,
          target: values.target,
          type: values.type,
          exclusion_rules: values.exclusion_rules ?? null,
          soma_synapse_count: values.soma_synapse_count,
        };
        const { data, error } = await tryCatch(
          getSingleNeuronSynaptomePlacement({
            modelId: modelId!,
            ctx: { virtualLabId, projectId },
            payload: {
              seed,
              config: configSet,
            },
          })
        );
        if (error) return handleError(error);

        const synapsePositions = data.synapses
          .flat()
          .flatMap((p) => p.synapses)
          .map((o) => o.coordinates);
        const newSynapseSet = new Map(sessionValue?.synapseSets);
        const newSynapseCount = new Map(sessionValue?.synapseCount);
        newSynapseSet.set(config.id, configSet);
        newSynapseCount.set(config.id, synapsePositions.length);
        setSessionValue({
          ...sessionValue,
          seed: sessionValue?.seed ?? 100,
          synapseSets: newSynapseSet,
          synapseCount: newSynapseCount,
        });
        setSynapsesPlacementAtom({
          ...synapsesPlacement,
          [config.id]: {
            sectionSynapses: data.synapses,
            count: synapsePositions.length,
            synapsePlacementConfigId: config.id,
            color: config.color,
            visible: true,
          },
        });
        configRef.current = configSet;
      } catch {
        return handleError();
      } finally {
        setVisualizeLoading(false);
      }
    }
  };
}
