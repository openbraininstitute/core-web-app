import { snakeCase } from 'es-toolkit/compat';
import type { ReactNode } from 'react';

import type { EntityCoreExtendedType } from '@/entity-configuration/domain/helpers';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import { DataViewLayout } from '@/ui/layouts/data-view-layout';

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
  const type = snakeCase(awaitedParams.type) as EntityCoreExtendedType;

  return (
    <DataViewLayout context={{ virtualLabId, projectId }} id={id} type={type}>
      {children}
    </DataViewLayout>
  );
}
