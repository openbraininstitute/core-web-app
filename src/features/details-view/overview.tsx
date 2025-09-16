import { ReactNode } from 'react';

import Header from '@/features/details-view/header';

import { getFieldDefinition } from '@/entity-configuration/definitions';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { CommonSummaryViewFields } from '@/entity-configuration/definitions/view-defs';
import { classNames } from '@/util/utils';

import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { TypeSummaryProps } from '@/entity-configuration/definitions/view-defs/types';

type FieldProps = {
  field: EntityCoreFields;
  className?: string;
  data: any;
};

export function Field({ field, className, data }: FieldProps) {
  const fieldObj = getFieldDefinition(field);

  let renderedContent: ReactNode = null;
  if (fieldObj) {
    if (fieldObj.renderForDetailView) {
      renderedContent = fieldObj.renderForDetailView(data);
    } else if (fieldObj.render) {
      renderedContent = fieldObj.render(data);
    }
  }

  return (
    <div className={classNames('text-primary-7 flex flex-col', className)}>
      <div className="text-neutral-4 uppercase">{fieldObj?.title}</div>
      <div className={classNames('mt-2 break-words', fieldObj?.className)}>{renderedContent}</div>
    </div>
  );
}

export default function Overview<T extends EntityCoreIdentifiableNamed>({
  fields,
  detail,
  commonFields = CommonSummaryViewFields,
  commonFieldsClassName,
  fieldsClassName,
  onDownload,
}: {
  fields: Array<TypeSummaryProps>;
  detail: T;
  commonFields?: Array<TypeSummaryProps>;
  commonFieldsClassName?: string;
  fieldsClassName?: string;
  onDownload?: (entity: T) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-10">
      <Header<T> detail={detail} onDownload={onDownload} />
      <div className="flex w-full flex-row items-start gap-x-8">
        {commonFields.length > 0 && (
          <div
            className={
              commonFieldsClassName ?? 'grid w-1/2 auto-rows-max grid-cols-2 gap-x-8 gap-y-6'
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
