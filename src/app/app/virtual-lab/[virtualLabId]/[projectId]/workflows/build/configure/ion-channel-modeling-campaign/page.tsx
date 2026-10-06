'use client';

import {
  buildIonChannelWorkflow,
  createScanConfigWorkflowPage,
} from '@/features/scan-config/workflow';

export default createScanConfigWorkflowPage(buildIonChannelWorkflow);
