import { NotebookLayout } from '@/ui/layouts/notebook-layout';
import { NotebookHeader } from '@/ui/segments/notebooks/header';

import { ReactNode } from 'react';

export default function NotebooksLayout({ children }: { children: ReactNode }) {
  return (
    <NotebookLayout>
      <NotebookHeader />
      <div className="grid w-full grid-cols-5 gap-x-4 px-5 pt-4">{children}</div>
    </NotebookLayout>
  );
}
