import { notFound } from 'next/navigation';
import {
  CommonSummaryViewFields,
  getViewDefinitionByExtendedType,
} from '@/entity-configuration/definitions/view-defs';
import { Field } from '@/features/details-view/overview';
import { EntityTypeValue } from '@/entity-configuration/domain';
import { EntityCoreExtendedType } from '@/entity-configuration/domain/helpers';

export default function Overview({
  entity,
  extendedType,
}: {
  entity?: EntityTypeValue;
  extendedType: EntityCoreExtendedType;
}) {
  const fields = getViewDefinitionByExtendedType(extendedType)?.summaryViewFields ?? [];

  if (!entity) notFound();
  const commonFields = CommonSummaryViewFields;

  return (
    <>
      <div className="mb-5">
        <div className="text-neutral-4 uppercase">Name</div>
        <div className="text-primary-8 text-2xl font-bold">{entity.name}</div>
      </div>
      <div className="mb-5 grid grid-cols-3 gap-4 rounded-lg border border-gray-300 p-5">
        {[...commonFields, ...fields].map(({ className, field }) => {
          return <Field key={field} className={className} field={field} data={entity} />;
        })}
      </div>
    </>
  );
}
