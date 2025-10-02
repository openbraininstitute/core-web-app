import type { ReactNode } from 'react';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default function DataLayout({
  children,
  modal,
}: ServerSideComponentProp<WorkspaceContext, null> & {
  children: ReactNode;
  modal?: ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
