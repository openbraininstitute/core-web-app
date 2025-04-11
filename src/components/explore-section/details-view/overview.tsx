import { ReactNode } from 'react';

import Header from '@/components/explore-section/details-view/header';

import { ENTITY_CORE_FIELDS_CONFIG } from '@/constants/explore-section/fields-config';
import { COMMON_FIELDS } from '@/constants/explore-section/detail-views-fields';
import { DetailProps } from '@/types/explore-section/application';
import { classNames } from '@/util/utils';
import { EntityCoreElement } from '@/constants/explore-section/fields-config/types';

type FieldProps = {
  field: string;
  className?: string;
  data: any;
};

export function Field({ field, className, data }: FieldProps) {
  const fieldObj = ENTITY_CORE_FIELDS_CONFIG[field];
  return (
    <div className={classNames('text-primary-7 mr-10', className)}>
      <div className="text-neutral-4 uppercase">{fieldObj?.title}</div>
      <div className={classNames('mt-2 break-words', fieldObj?.className)}>
        {fieldObj?.render && fieldObj.render(data)}
      </div>
    </div>
  );
}

export default function DetailHeader<T extends { name: string }>({
  fields,
  detail,
  commonFields = COMMON_FIELDS,
  url,
  extraHeaderAction,
}: {
  fields: DetailProps[];
  detail?: EntityCoreElement<T>;
  commonFields: DetailProps[];
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
