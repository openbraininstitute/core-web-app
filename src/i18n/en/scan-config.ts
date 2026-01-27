import { ScanConfigActivity, type TScanConfigActivity } from '@/features/scan-config/types';

export const messages: Record<TScanConfigActivity, Record<string, string>> = {
  [ScanConfigActivity.Simulate]: {
    CoordinateCountFailed: 'An error occurred generating the simulation campaign coordinates',
    ScanConfigGenerateGridFailed: 'An error occurred generating the simulation campaign',
    ScanConfigGenerateGridCampaignIdFailed: 'An error occurred updating the simulation',
    Generate: 'Generate simulation(s)',
    New: 'New simulation campaign',
  },
  [ScanConfigActivity.Extract]: {
    CoordinateCountFailed: 'An error occurred generating the extraction campaign coordinates',
    ScanConfigGenerateGridFailed: 'An error occurred generating the simulation campaign',
    ScanConfigGenerateGridCampaignIdFailed: 'An error occurred updating the extraction',
    Generate: 'Generate extraction(s)',
    New: 'New extraction campaign',
  },
};
