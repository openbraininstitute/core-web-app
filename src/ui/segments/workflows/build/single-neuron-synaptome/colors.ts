import { getColorFromGeneratedPalette } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/webgl-neuron-selector/colors';

import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';

// Reset the colors.
export function resetColors(cloneMap: Map<string, TSingleNeuronSynaptomeConfiguration>) {
  let index = 0;
  for (const [, val] of cloneMap.entries()) {
    val.color = getColorFromGeneratedPalette(index++);
  }
  return cloneMap;
}
