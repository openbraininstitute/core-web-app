import { snakeCase } from 'es-toolkit/compat';

import { DataViewLayout } from '@/ui/layouts/data-view-layout';

import type { ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

interface Params {
  id: string;
  type: string;
}

export default async function Layout({
  children,
  params,
}: ServerSideComponentProp<WorkspaceContext & Params, null> & {
  children: ReactNode;
}) {
  const awaitedParams = await params;

  const { virtualLabId, projectId, id } = awaitedParams;
  const type = snakeCase(awaitedParams.type) as TExtendedEntitiesTypeDict;

  return (
    <DataViewLayout inline context={{ virtualLabId, projectId }} id={id} type={type}>
      {children}
    </DataViewLayout>
  );
}
