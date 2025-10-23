import type { ReactNode } from 'react';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default function DataLayout({
  children,
}: ServerSideComponentProp<WorkspaceContext, null> & {
  children: ReactNode;
}) {
  return <>{children}</>;
}
