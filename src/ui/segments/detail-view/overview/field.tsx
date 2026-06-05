'use client';

import { type TViewVariant, ViewVariant } from '@/constants';
import { getFieldDefinition } from '@/entity-configuration/definitions';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

type FieldProps = {
  field: EntityCoreFields;
  className?: string;
  data: any;
  variant?: TViewVariant;
};

export function Field({ field, className, data, variant = ViewVariant.Light }: FieldProps) {
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
      className={cn(
        'flex flex-col',
        variant === ViewVariant.Default ? 'text-white' : 'text-primary-7',
        className
      )}
    >
      <div
        className={cn(
          'uppercase',
          variant === ViewVariant.Default ? 'text-primary-3' : 'text-neutral-4'
        )}
      >
        {fieldObj?.title}
      </div>
      <div
        className={cn(
          'mt-2 break-words',
          { 'font-bold': variant === ViewVariant.Default },
          fieldObj?.className
        )}
      >
        {renderedContent}
      </div>
    </div>
  );
}
