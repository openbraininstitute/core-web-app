import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { KebabCase } from '@/utils/type';
import {
  CommonSummaryViewFields,
  getViewDefinitionByExtendedType,
} from '@/entity-configuration/definitions/view-defs';
import { getEntityByExtendedType, getEntityBySlug } from '@/entity-configuration/domain/helpers';
import { EntitySlugValue } from '@/entity-configuration/domain/slug';
import { notFound } from 'next/navigation';
import { downloadEntity } from '../layout';
import { Field } from '@/features/details-view/overview';
import { getFieldDefinition } from '@/entity-configuration/definitions';

export default async function Page({
  params,
}: ServerSideComponentProp<WorkspaceContext & { type: EntitySlugValue; id: string }, null>) {
  const { virtualLabId, projectId, type, id } = await params;

  const { entity, entityType } = await downloadEntity({
    type,
    ctx: { virtualLabId, projectId },
    id,
  });

  const fields = getViewDefinitionByExtendedType(entityType.extendedType)?.summaryViewFields;
  if (!fields) notFound();

  const commonFields = CommonSummaryViewFields;

  return (
    <div className="p-10">
      <div className="mb-5">
        <div className="text-neutral-4 uppercase">Name</div>
        <div className="text-primary-8 text-2xl font-bold">{entity.name}</div>
      </div>
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-300 p-5">
        {[...commonFields, ...fields].map(({ className, field }) => {
          const fieldObj = getFieldDefinition(field);
          return fieldObj?.render?.(entity);
        })}
      </div>
    </div>
  );
}
