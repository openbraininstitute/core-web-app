'use client';

import { getFieldDefinition } from '@/entity-configuration/definitions';
import { classNames } from '@/util/utils';

import type { ReactNode } from 'react';
import type { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

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
