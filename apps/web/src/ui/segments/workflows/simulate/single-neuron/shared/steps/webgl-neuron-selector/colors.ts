import { SimulationColors } from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';

export function getColorFromGeneratedPalette(index: number) {
  return SimulationColors[index % SimulationColors.length];
}
