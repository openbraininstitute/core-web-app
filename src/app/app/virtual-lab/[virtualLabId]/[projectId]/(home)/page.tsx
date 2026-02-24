import { HydrateClient } from '@/query-provider/server';
import { Shortcuts } from '@/ui/segments/project/bottom-nav-shortcuts';

import type { ServerSideComponentProp } from '@/types/common';

export default async function Home({
  params: promisedParams,
}: ServerSideComponentProp<{ virtualLabId: string; projectId: string }, null>) {
  return (
    <HydrateClient>
      <div className="flex flex-col gap-6 pr-1.5">Get Started</div>
    </HydrateClient>
  );
}
