'use client';

import {
  createScanConfigWorkflowPage,
  extractCircuitWorkflow,
} from '@/features/scan-config/workflow';
import { DownloadPanel } from '@/ui/segments/explore/circuit/elements/download-panel';

export default createScanConfigWorkflowPage(extractCircuitWorkflow, {
  aside: <DownloadPanel />,
});
