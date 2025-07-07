import { ReactNode } from 'react';

import Header from '@/features/details-view/header';

import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { CommonSummaryViewFields } from '@/entity-configuration/definitions/view-defs';
import { getFieldDefinition } from '@/entity-configuration/definitions';
import { classNames } from '@/util/utils';

import type { TypeSummaryProps } from '@/entity-configuration/definitions/view-defs/types';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';

type FieldProps = {
  field: EntityCoreFields;
  className?: string;
  data: any;
};

function Field({ field, className, data }: FieldProps) {
  const fieldObj = getFieldDefinition(field);

  return (
    <div className={classNames('text-primary-7 mr-10', className)}>
      <div className="text-neutral-4 uppercase">{fieldObj?.title}</div>
      <div className={classNames('mt-2 break-words', fieldObj?.className)}>
        {fieldObj?.render && fieldObj.render(data)}
      </div>
    </div>
  );
}

export default function DetailHeader<T extends EntityCoreIdentifiableNamed>({
  fields,
  detail,
  extraHeaderAction,
  commonFields = CommonSummaryViewFields,
  commonFieldsClassName,
  fieldsClassName,
  onDownload,
}: {
  fields: Array<TypeSummaryProps>;
  detail: T;
  commonFields?: Array<TypeSummaryProps>;
  // @FIXME: this property is not used.
  // eslint-disable-next-line react/no-unused-prop-types
  url?: string | null;
  extraHeaderAction?: ReactNode;
  commonFieldsClassName?: string;
  fieldsClassName?: string;
  onDownload?: (entity: T) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-10">
      <Header<T> detail={detail} extraHeaderAction={extraHeaderAction} onDownload={onDownload} />
      <div className="flex w-full flex-row gap-x-8">
        {commonFields.length > 0 && (
          <div
            className={
              commonFieldsClassName ?? 'grid w-1/2 auto-rows-max grid-cols-3 gap-x-8 gap-y-6'
            }
          >
            {commonFields.map(({ className, field }) => (
              <Field key={field} className={className} field={field} data={detail} />
            ))}
          </div>
        )}
        <div className={fieldsClassName ?? 'grid w-1/2 auto-rows-min grid-cols-3 gap-x-8 gap-y-6'}>
          {fields.map(({ className, field }) => (
            <Field key={field} className={className} field={field} data={detail} />
          ))}
        </div>
      </div>
    </div>
  );
}
