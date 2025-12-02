import type { ReactNode } from 'react';

import type { ServerSideLayoutProp, WorkspaceContext } from '@/types/common';

export default function DataLayout({
  children,
}: ServerSideLayoutProp<WorkspaceContext> & {
  children: ReactNode;
}) {
  return <>{children}</>;
}
