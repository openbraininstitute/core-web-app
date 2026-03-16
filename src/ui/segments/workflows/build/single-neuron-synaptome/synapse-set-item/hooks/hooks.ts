import { useAtom } from 'jotai';

import { getSingleNeuronSynaptomePlacement } from '@/api/small-scale-simulator';
import { tryCatch } from '@/api/utils';
import useWorkspace from '@/ui/hooks/use-workspace';
import { SynapsesPlacementAtomFamily } from '@/ui/segments/workflows/simulate/single-neuron/shared/context';

import { useErrorHandler } from './error';

import type React from 'react';
import type { Config, SessionValue } from '../types';

export function useApplyChangesHandler(
  sessionId: string,
  config: Config,
  sessionValue: SessionValue,
  setSessionValue: React.Dispatch<React.SetStateAction<SessionValue>>,
  setVisualizeLoading: (value: boolean) => void
) {
  const handleError = useErrorHandler(config?.id, sessionValue);
  const { virtualLabId, projectId } = useWorkspace();
  const [synapsesPlacement, setSynapsesPlacementAtom] = useAtom(
    SynapsesPlacementAtomFamily(sessionId)
  );
  const modelId = sessionValue?.memodel?.id;
  const hideSynapses = () => {
    if (config?.id) {
      const currentSynapsesPlacementConfig = synapsesPlacement?.[config.id];
      if (currentSynapsesPlacementConfig?.visible) {
        setSynapsesPlacementAtom((synapsesPlacement) => ({
          ...synapsesPlacement,
          [config.id]: {
            ...currentSynapsesPlacementConfig,
            count: undefined,
            visible: false,
          },
        }));
      }
    }
  };

  return async () => {
    setVisualizeLoading(true);
    hideSynapses();
    try {
      const configSet = {
        color: config.color,
        id: config.id,
        seed: config.seed,
        name: config.name,
        formula: config.formula,
        target: config.target,
        type: config.type,
        exclusion_rules: config.exclusion_rules ?? null,
        soma_synapse_count: config.soma_synapse_count,
      };
      const { data, error } = await tryCatch(
        getSingleNeuronSynaptomePlacement({
          modelId: modelId ?? 'NULL',
          ctx: { virtualLabId, projectId },
          payload: {
            seed: config.seed,
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
      setSessionValue((sessionValue) => ({
        ...sessionValue,
        seed: sessionValue?.seed ?? 100,
        synapseSets: newSynapseSet,
        synapseCount: newSynapseCount,
      }));
      setSynapsesPlacementAtom((synapsesPlacement) => ({
        ...synapsesPlacement,
        [config.id]: {
          sectionSynapses: data.synapses,
          count: synapsePositions.length,
          synapsePlacementConfigId: config.id,
          color: config.color,
          visible: true,
        },
      }));
    } catch {
      return handleError();
    } finally {
      setVisualizeLoading(false);
    }
  };
}
