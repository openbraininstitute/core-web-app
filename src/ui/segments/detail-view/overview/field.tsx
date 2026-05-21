'use client';

import { ReactNode } from 'react';

import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { getFieldDefinition } from '@/entity-configuration/definitions';
import { classNames } from '@/util/utils';

type FieldProps = {
  field: EntityCoreFields;
  className?: string;
  data: any;
  variant?: 'light' | 'onPrimary';
};

export function Field({ field, className, data, variant = 'light' }: FieldProps) {
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
    <div
      className={classNames(
        'flex flex-col',
        variant === 'onPrimary' ? 'text-white' : 'text-primary-7',
        className
      )}
    >
      <div
        className={classNames(
          'uppercase',
          variant === 'onPrimary' ? 'text-primary-3' : 'text-neutral-4'
        )}
      >
        {fieldObj?.title}
      </div>
      <div
        className={classNames(
          'mt-2 break-words',
          variant === 'onPrimary' && 'font-bold',
          fieldObj?.className
        )}
      >
        {renderedContent}
      </div>
    </div>
  );
}
