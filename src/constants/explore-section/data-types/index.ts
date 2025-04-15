import { SIMULATION_DATA_TYPE_CONFIG } from '@/constants/explore-section/data-types/simulation-data-types';
import { EXPERIMENT_DATA_TYPE_CONFIG } from '@/constants/explore-section/data-types/experiment-data-types';
import { MODEL_DATA_TYPE_CONFIG } from '@/constants/explore-section/data-types/model-data-types';

export const DATA_TYPES_TO_CONFIGS = {
  ...SIMULATION_DATA_TYPE_CONFIG,
  ...EXPERIMENT_DATA_TYPE_CONFIG,
  ...MODEL_DATA_TYPE_CONFIG,
};
