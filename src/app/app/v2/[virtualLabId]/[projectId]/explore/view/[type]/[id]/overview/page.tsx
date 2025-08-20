import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { KebabCase } from '@/utils/type';
import Overview from '@/features/details-view/overview';
import {
  CommonSummaryViewFields,
  getViewDefinitionByExtendedType,
} from '@/entity-configuration/definitions/view-defs';
import { getEntityByExtendedType, getEntityBySlug } from '@/entity-configuration/domain/helpers';
import { EntitySlugValue } from '@/entity-configuration/domain/slug';
import { notFound } from 'next/navigation';
// import { Field } from '@/features/details-view/overview';

export default async function Page({
  params,
}: ServerSideComponentProp<WorkspaceContext & { type: EntitySlugValue; id: string }, null>) {
  const { virtualLabId, projectId, type, id } = await params;

  const entityType = getEntityBySlug({ slug: type });
  if (!entityType) notFound();

  const fields = getViewDefinitionByExtendedType(entityType.extendedType)?.summaryViewFields;
  if (!fields) notFound();

  const commonFields = CommonSummaryViewFields;



  return (
    <div className="flex w-full flex-row gap-x-8">
      {/* {commonFields.length > 0 && (
        <div className="grid w-1/2 auto-rows-max grid-cols-2 gap-x-8 gap-y-6">
          {commonFields.map(({ className, field }) => (
            // <Field key={field} className={className} field={field} data={detail} />
          ))}
        </div>
      )}
      <div className="grid w-1/2 auto-rows-min grid-cols-3 gap-x-8 gap-y-6">
        {fields.map(({ className, field }) => (
          // <Field key={field} className={className} field={field} data={detail} />
        ))}
      </div> */}
    </div>
  );
}
