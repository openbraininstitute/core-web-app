import { useAtomValue } from 'jotai';
import React from 'react';

import { SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY } from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import {
  SynapsesPlacementAtomFamily,
  SynaptomeConfigurationAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { getSessionKey } from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';

import type { SynapsesPlacementRecord } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';

export function useSynapses(
  sessionId: string,
  disableSynapses = false
): Array<{
  color: string;
  sections: Record<string, number[]>;
}> {
  const key = getSessionKey(SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY, sessionId);
  const synapticInputs = useAtomValue(SynaptomeConfigurationAtomFamily(key));
  const synapsesPlacement: SynapsesPlacementRecord | null = useAtomValue(
    SynapsesPlacementAtomFamily(sessionId)
  );
  return React.useMemo(() => {
    if (disableSynapses || !synapsesPlacement) return [];

    return Object.values(synapsesPlacement)
      .filter((item) => !!item)
      .map(({ sectionSynapses, synapsePlacementConfigId }) => {
        const sections: Record<string, number[]> = {};
        for (const { section_id, synapses } of sectionSynapses) {
          sections[section_id] = synapses.map(({ position }) => position);
        }
        return {
          color: resolveColor(synapsePlacementConfigId, synapticInputs),
          sections,
        };
      });
  }, [disableSynapses, synapticInputs, synapsesPlacement]);
}

function resolveColor(
  id: string,
  synapticInputs: { id: string; color?: string | undefined }[]
): string {
  const input = synapticInputs.find((item) => item.id === id);
  return input?.color || '#F90';
}
