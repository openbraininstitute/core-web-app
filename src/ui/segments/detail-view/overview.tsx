import type { WorkspaceContext } from '@/types/common';
import { CommonSummaryViewFields } from '@/entity-configuration/definitions/view-defs';
import { Field } from '@/features/details-view/overview';
import Visualization from '@/ui/segments/viz';
import { EntityTypeValue } from '@/entity-configuration/domain';
import { TypeSummaryProps } from '@/entity-configuration/definitions/view-defs/types';

export default function Overview({
  entity,
  summaryViewFields,
  ctx,
}: {
  entity: EntityTypeValue;
  summaryViewFields: TypeSummaryProps[];
  ctx: WorkspaceContext;
}) {
  const commonFields = CommonSummaryViewFields;

  return (
    <div className="h-full overflow-y-auto p-10">
      <div className="mb-5">
        <div className="text-neutral-4 uppercase">Name</div>
        <div className="text-primary-8 text-2xl font-bold">{entity.name}</div>
      </div>
      <div className="mb-5 grid grid-cols-3 gap-4 rounded-lg border border-gray-300 p-5">
        {[...commonFields, ...summaryViewFields].map(({ className, field }) => {
          return <Field key={field} className={className} field={field} data={entity} />;
        })}
      </div>

      <Visualization entity={entity} ctx={ctx} />
    </div>
  );
}
