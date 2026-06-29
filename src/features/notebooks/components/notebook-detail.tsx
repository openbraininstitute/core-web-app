import { ViewVariant } from '@/constants';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  CommonSummaryViewFields,
  getViewDefinitionByExtendedType,
} from '@/entity-configuration/definitions/view-defs';
import { Field } from '@/ui/segments/detail-view/overview/field';

import { NotebookViewer } from '../renderer/notebook-viewer';

import type { TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { TypeSummaryProps } from '@/entity-configuration/definitions/view-defs/types';

type NotebookDetailEntity = {
  id: string;
  type: TEntityTypeDict;
  assets: IAsset[];
};

export function NotebookDetail({
  entity,
  extendedType,
}: {
  entity: NotebookDetailEntity;
  extendedType: TExtendedEntitiesTypeDict;
}) {
  const extra = getViewDefinitionByExtendedType(extendedType)?.summaryViewFields ?? [];

  const seen = new Set<EntityCoreFields>([
    EntityCoreFields.Description,
    ...CommonSummaryViewFields.map((f) => f.field),
  ]);
  const fields: TypeSummaryProps[] = [
    { field: EntityCoreFields.Description, className: 'col-span-3' },
    ...CommonSummaryViewFields,
    ...extra.filter((f) => !seen.has(f.field)),
  ];

  return (
    <div id="notebook-detail" data-testid="notebook-detail" className="px-1">
      <div
        id="notebook-metadata"
        data-testid="notebook-metadata"
        className="mb-6 grid grid-cols-3 gap-4 rounded-lg border border-neutral-2 p-5"
      >
        {fields.map(({ field, className }) => (
          <Field
            key={field}
            field={field}
            className={className}
            data={entity}
            variant={ViewVariant.Light}
          />
        ))}
      </div>

      <NotebookViewer record={entity} />
    </div>
  );
}
