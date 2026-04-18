import { RedirectType, redirect } from 'next/navigation';

import { config } from '@/config';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Page(props: ServerSideComponentProp<WorkspaceContext, null>) {
  const { virtualLabId, projectId } = await props.params;
  redirect(
    `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/quick-access/data`,
    RedirectType.replace
  );
}
