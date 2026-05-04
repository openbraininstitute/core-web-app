import { ScanConfigActivity, type TScanConfigActivity } from '@/features/scan-config/types';

export {
  buildActivityStatusMap,
  findLatestExecutionForEntity,
} from '@/features/task-runner/status';

/**
 * Maps scan config activities to their AI agent state configuration names.
 * Used to sync configuration state with the AI assistant for different activities.
 */
export const ACTIVITY_AI_CONFIG_MAP: Record<TScanConfigActivity, string> = {
  [ScanConfigActivity.Simulate]: 'smc_simulation_config',
  [ScanConfigActivity.Extract]: 'smc_extraction_config',
  [ScanConfigActivity.Process]: 'smc_skeletonization_config',
  [ScanConfigActivity.Build]: 'smc_build_config',
};

export const ScanConfigCampaignOriginActionDict = {
  View: 'view',
  Duplicate: 'duplicate',
  Task: 'task',
} as const;

export type TScanConfigCampaignOriginActionDict =
  (typeof ScanConfigCampaignOriginActionDict)[keyof typeof ScanConfigCampaignOriginActionDict];
