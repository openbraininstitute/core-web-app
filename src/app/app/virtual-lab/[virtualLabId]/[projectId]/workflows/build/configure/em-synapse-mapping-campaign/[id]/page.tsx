'use client';

import {
  buildEmSynapseMappingWorkflow,
  createScanConfigWorkflowPage,
} from '@/features/scan-config/workflow';
import { DownloadPanel } from '@/ui/segments/explore/circuit/elements/download-panel';

export default createScanConfigWorkflowPage(buildEmSynapseMappingWorkflow, {
  aside: <DownloadPanel />,
});
