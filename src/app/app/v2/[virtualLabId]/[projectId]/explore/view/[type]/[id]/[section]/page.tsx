import { notFound } from 'next/navigation';
import { downloadEntity } from '../layout';
import { DetailViewSection } from '@/entity-configuration/definitions/types';
import { getEntityBySlug } from '@/entity-configuration/domain/helpers';
import { EntitySlugValue } from '@/entity-configuration/domain/slug';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import Overview from '@/ui/segments/detail-view/overview';
import { getViewDefinitionByExtendedType } from '@/entity-configuration/definitions/view-defs';

export default async function Page({
  params,
}: ServerSideComponentProp<
  WorkspaceContext & { section: DetailViewSection; id: string; type: EntitySlugValue },
  null
>) {
  const { virtualLabId, projectId, section, type, id } = await params;
  const ctx = { virtualLabId, projectId };

  const entityType = getEntityBySlug({ slug: type });
  if (!entityType || !entityType.detailViewSections.includes(section)) notFound();

  if (section === 'overview') {
    const { entity } = await downloadEntity({
      type,
      ctx,
      id,
    });

    const fields = getViewDefinitionByExtendedType(entityType.extendedType)?.summaryViewFields;

    if (!fields || !entity) notFound();
    return <Overview entity={entity} summaryViewFields={fields} ctx={ctx} />;
  }

  return notFound();
}
