import { RedirectType, redirect } from 'next/navigation';

import { config } from '@/config';
import { DEFAULT_GET_STARTED_VIDEO_SLUG } from '@/ui/segments/project/get-started/query';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Page(props: ServerSideComponentProp<WorkspaceContext, null>) {
  const { virtualLabId, projectId } = await props.params;
  redirect(
    `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/tutorials/${DEFAULT_GET_STARTED_VIDEO_SLUG}`,
    RedirectType.replace
  );
}
