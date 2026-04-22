import { RedirectType, redirect } from 'next/navigation';

import { config } from '@/config';
import { DEFAULT_GET_STARTED_VIDEO_SLUG } from '@/ui/segments/project/get-started/query';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: ServerSideComponentProp<WorkspaceContext, null>) {
  const { virtualLabId, projectId } = await params;
  redirect(
    `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/help/tutorials/${DEFAULT_GET_STARTED_VIDEO_SLUG}`,
    RedirectType.replace
  );
}
