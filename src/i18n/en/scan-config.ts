import { ScanConfigActivity, type TScanConfigActivity } from '@/features/scan-config/types';

export const messages: Record<TScanConfigActivity, Record<string, string>> = {
  [ScanConfigActivity.Simulate]: {
    CoordinateCountFailed: 'An error occurred generating the simulation campaign coordinates',
    ScanConfigGenerateGridFailed: 'An error occurred generating the simulation campaign',
    ScanConfigGenerateGridCampaignIdFailed: 'An error occurred updating the simulation',
    Generate: 'Generate simulation(s)',
    New: 'New simulation campaign',
    InsufficientCreditsNonAdmin:
      "You don't have enough credits to launch such simulation. Please contact your administrator",
  },
  [ScanConfigActivity.Extract]: {
    CoordinateCountFailed: 'An error occurred generating the extraction campaign coordinates',
    ScanConfigGenerateGridFailed: 'An error occurred generating the extraction campaign',
    ScanConfigGenerateGridCampaignIdFailed: 'An error occurred updating the extraction',
    Generate: 'Generate extraction(s)',
    New: 'New extraction campaign',
    InsufficientCreditsNonAdmin:
      "You don't have enough credits to launch such extraction. Please contact your administrator",
  },
  [ScanConfigActivity.Process]: {
    CoordinateCountFailed: 'An error occurred generating the skeletonization campaign coordinates',
    ScanConfigGenerateGridFailed: 'An error occurred generating the skeletonization campaign',
    ScanConfigGenerateGridCampaignIdFailed: 'An error occurred updating the skeletonization',
    Generate: 'Generate skeletonization(s)',
    New: 'New skeletonization campaign',
    LowFunds:
      'The project does not have enough credits to run the skeletonization, please add credits and try again',
    GenericFailed: 'We are having trouble running the skeletonization, please try again later',
  },
  [ScanConfigActivity.Build]: {
    CoordinateCountFailed: 'An error occurred generating the build campaign coordinates',
    ScanConfigGenerateGridFailed: 'An error occurred generating the build campaign',
    ScanConfigGenerateGridCampaignIdFailed: 'An error occurred updating the build',
    Generate: 'Generate build(s)',
    New: 'New build campaign',
    InsufficientCreditsNonAdmin:
      "You don't have enough credits to launch this build. Please contact your administrator",
    GenericFailed: 'We are having trouble running the build, please try again later',
  },
  [ScanConfigActivity.Optimize]: {
    CoordinateCountFailed: 'An error occurred generating the optimization campaign coordinates',
    ScanConfigGenerateGridFailed: 'An error occurred generating the optimization campaign',
    ScanConfigGenerateGridCampaignIdFailed: 'An error occurred updating the optimization',
    Generate: 'Generate optimization(s)',
    New: 'New optimization campaign',
    InsufficientCreditsNonAdmin:
      "You don't have enough credits to launch this optimization. Please contact your administrator",
    GenericFailed: 'We are having trouble running the optimization, please try again later',
  },
  [ScanConfigActivity.Validate]: {
    CoordinateCountFailed: 'An error occurred generating the validation campaign coordinates',
    ScanConfigGenerateGridFailed: 'An error occurred generating the validation campaign',
    ScanConfigGenerateGridCampaignIdFailed: 'An error occurred updating the validation',
    Generate: 'Generate validation(s)',
    New: 'New validation campaign',
    CopyCampaignId: 'Copy validation campaign ID',
    InsufficientCreditsNonAdmin:
      "You don't have enough credits to launch this validation. Please contact your administrator",
    GenericFailed: 'We are having trouble running the validation, please try again later',
  },
};
