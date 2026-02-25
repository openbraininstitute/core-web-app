import { DiscoverList } from '@/ui/segments/project/get-started/sections/discover';

import type { PropsWithChildren } from 'react';

export default function Layout({ children }: PropsWithChildren) {
  return (
    <section className="tutorials pr-2">
      {children}
      <DiscoverList />
    </section>
  );
}
