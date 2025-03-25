import { FileDistribution } from '@/types/explore-section/delta-properties';

export type AnalysisPDF = FileDistribution & { name?: string };

export const analysisTypes = [
  'all',
  'traces',
  'scores',
  'thumbnail',
  'optimisation',
  'parameters_distribution',
  'evo_parameter_density',
  'currentscape',
] as const;

export type AnalysisType = (typeof analysisTypes)[number]; // 'all' | 'traces' | 'scores' ...

export function typeLabel(analysisType: AnalysisType) {
  const label = analysisType.replaceAll('_', ' ').replace('evo', 'evolution');
  return label.charAt(0).toLocaleUpperCase() + label.slice(1);
}
