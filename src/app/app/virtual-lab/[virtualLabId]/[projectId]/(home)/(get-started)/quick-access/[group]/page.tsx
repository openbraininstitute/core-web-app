import { getClient } from '@/services/sanity';
import { QuickAccessQuery } from '@/ui/segments/project/get-started/query';

import type { ServerSideComponentProp } from '@/types/common';

export default async function Page({ params }: ServerSideComponentProp<{ group: string }, null>) {
  const group = await params;
  const client = getClient();

  const res = await client.fetch(QuickAccessQuery);
  res;
  return <div>Quick access</div>;
}
