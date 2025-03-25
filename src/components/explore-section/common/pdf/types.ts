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
