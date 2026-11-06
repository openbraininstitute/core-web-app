import { ResearchLogsLayout } from '@/features/research-logs/research-logs-layout';

import type { ReactNode } from 'react';

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return <ResearchLogsLayout>{children}</ResearchLogsLayout>;
}
