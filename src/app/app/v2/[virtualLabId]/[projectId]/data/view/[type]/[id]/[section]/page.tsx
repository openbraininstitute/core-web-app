import { notFound } from 'next/navigation';
import snakeCase from 'lodash/snakeCase';
import { downloadEntity } from '../layout';
import { DetailViewSection } from '@/entity-configuration/definitions/types';
import {
  EntityCoreExtendedType,
  getEntityByExtendedType,
} from '@/entity-configuration/domain/helpers';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import Overview from '@/ui/segments/detail-view/overview';
import { getViewDefinitionByExtendedType } from '@/entity-configuration/definitions/view-defs';

export default async function Page({
  params,
}: ServerSideComponentProp<
  WorkspaceContext & { section: DetailViewSection; id: string; type: string },
  null
>) {
  const { virtualLabId, projectId, section, type, id } = await params;
  const ctx = { virtualLabId, projectId };

  const entityType = getEntityByExtendedType({ type: snakeCase(type) as EntityCoreExtendedType });
  if (!entityType || !entityType.detailViewSections.includes(section)) notFound();

  if (section === 'overview') {
    const entity = await downloadEntity({
      type: snakeCase(type) as EntityCoreExtendedType,
      ctx,
      id,
    });

    const fields = getViewDefinitionByExtendedType(entityType.extendedType)?.summaryViewFields;

    if (!fields || !entity) notFound();
    return <Overview entity={entity} summaryViewFields={fields} ctx={ctx} />;
  }

  return notFound();
}
