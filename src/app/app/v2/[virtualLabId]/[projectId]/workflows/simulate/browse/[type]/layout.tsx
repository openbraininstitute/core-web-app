import type { ReactNode } from 'react';

import { WorkflowBrowseLayout } from '@/ui/layouts/workflow-browse-layout';

export default function Layout({ children }: { children: ReactNode }) {
  return <WorkflowBrowseLayout>{children}</WorkflowBrowseLayout>;
}
