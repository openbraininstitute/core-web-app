import { TutorialList } from '@/ui/segments/project/get-started/sections/tutorials';

import type { PropsWithChildren } from 'react';

export default function Layout({ children }: PropsWithChildren) {
  return (
    <section id="tutorials" data-testid="tutorials" className="pr-2">
      <div className="flex w-full gap-4">
        <div className="w-3/5 min-w-0">{children}</div>
        <div className="w-2/5 min-w-0">
          <TutorialList />
        </div>
      </div>
    </section>
  );
}
