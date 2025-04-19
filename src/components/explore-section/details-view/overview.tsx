import { ReactNode } from 'react';

import Header from '@/components/explore-section/details-view/header';

import { CommonSummaryViewFields } from '@/entity-configuration/definitions/view-defs';
import { getFieldDefinition } from '@/entity-configuration/definitions';
import { classNames } from '@/util/utils';

import type { TypeSummaryProps } from '@/entity-configuration/definitions/view-defs/types';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';

type FieldProps = {
  field: string;
  className?: string;
  data: any;
};

export function Field({ field, className, data }: FieldProps) {
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

export default function DetailHeader({
  url,
  fields,
  detail,
  extraHeaderAction,
  commonFields = CommonSummaryViewFields,
}: {
  fields: Array<TypeSummaryProps>;
  detail?: EntityCoreObjectTypes;
  commonFields: Array<TypeSummaryProps>;
  url?: string | null;
  extraHeaderAction?: ReactNode;
}) {
  if (!detail) return null;

  return (
    <div className="flex w-full flex-col gap-10">
      <Header detail={detail} url={url} extraHeaderAction={extraHeaderAction} />
      <div className="flex w-full flex-row gap-x-8">
        <div className="grid w-1/2 auto-rows-max grid-cols-3 gap-x-8 gap-y-6">
          {commonFields.map(({ className, field }) => (
            <Field key={field} className={className} field={field} data={detail} />
          ))}
        </div>
        <div className="grid w-1/2 auto-rows-min grid-cols-3 gap-x-8 gap-y-6">
          {fields.map(({ className, field }) => (
            <Field key={field} className={className} field={field} data={detail} />
          ))}
        </div>
      </div>
    </div>
  );
}
