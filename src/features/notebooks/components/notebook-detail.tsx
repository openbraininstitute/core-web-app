import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ViewVariant } from '@/constants';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { Field } from '@/ui/segments/detail-view/overview/field';

import { NotebookViewer } from '../renderer/notebook-viewer';

import type { TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { IAsset } from '@/api/entitycore/types/shared/global';

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
  const isTemplate = extendedType === ExtendedEntitiesTypeDict.AnalysisNotebookTemplate;
  const dateField = isTemplate ? EntityCoreFields.RegistrationDate : EntityCoreFields.UpdateDate;

  return (
    <div id="notebook-detail" data-testid="notebook-detail" className="px-1">
      <div
        id="notebook-metadata"
        data-testid="notebook-metadata"
        className="border-neutral-2 mb-6 grid grid-cols-3 gap-x-12 gap-y-8 rounded-lg border p-6"
      >
        <Field
          field={EntityCoreFields.Description}
          data={entity}
          variant={ViewVariant.Light}
          className="col-span-2"
        />
        <Field field={EntityCoreFields.NotebookScale} data={entity} variant={ViewVariant.Light} />

        <Field field={EntityCoreFields.Contributions} data={entity} variant={ViewVariant.Light} />
        <Field
          field={EntityCoreFields.InstitutionalContributions}
          data={entity}
          variant={ViewVariant.Light}
        />
        <Field field={dateField} data={entity} variant={ViewVariant.Light} />
      </div>

      <NotebookViewer record={entity} />
    </div>
  );
}
