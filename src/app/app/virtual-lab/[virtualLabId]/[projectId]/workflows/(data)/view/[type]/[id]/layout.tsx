import { snakeCase } from 'es-toolkit/compat';
import { ReactNode } from 'react';

import { EntityCoreExtendedType } from '@/entity-configuration/domain/helpers';
import { DataViewLayout } from '@/ui/layouts/data-view-layout';

import type { WorkspaceContext, ServerSideComponentProp } from '@/types/common';

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
