import { redirect } from 'next/navigation';

import type { ServerSideComponentProp } from '@/types/common';

export default async function OBIShowcaseIndexPage({
  params: promisedParams,
}: ServerSideComponentProp<{ virtualLabId: string; projectId: string }, null>) {
  const params = await promisedParams;
  const { virtualLabId, projectId } = params;

  // Redirect to the main reports page or to a specific showcase listing
  redirect(`/app/virtual-lab/${virtualLabId}/${projectId}/reports`);
}
