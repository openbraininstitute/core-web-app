import { ReactNode } from 'react';

import Header from '@/features/details-view/header';
import { getFieldDefinition } from '@/entity-configuration/definitions';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { CommonSummaryViewFields } from '@/entity-configuration/definitions/view-defs';
import { classNames } from '@/util/utils';

import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { TypeSummaryProps } from '@/entity-configuration/definitions/view-defs/types';

// This component is now only used for the read-only display mode.
export function Field<T extends EntityCoreIdentifiableNamed>({
  field,
  className,
  data,
}: {
  field: EntityCoreFields;
  className?: string;
  data: T;
}) {
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
    <div className={classNames('text-primary-7', className)}>
      <div className="text-neutral-4 uppercase">{fieldObj?.title}</div>
      <div className={classNames('mt-2 break-words', fieldObj?.className)}>{renderedContent}</div>
    </div>
  );
}

// This new component handles the editing view.
function EditField<
  T extends EntityCoreIdentifiableNamed & Partial<Record<EntityCoreFields, unknown>>,
>({
  field,
  data,
  onFieldChange,
  className,
}: {
  field: EntityCoreFields;
  data: T;
  onFieldChange: (fieldName: string, value: unknown) => void;
  className?: string;
}) {
  const fieldObj = getFieldDefinition(field);
  const value = data[field];
  const inputId = `input-${field}`; // Unique ID for accessibility

  return (
    <div className={classNames('text-primary-7', className)}>
      <div className="text-neutral-4 uppercase">{fieldObj?.title}</div>
      {typeof value === 'object' && value !== null ? (
        <div className="mt-2 flex flex-col gap-2">
          {Object.keys(value).map((key) => (
            <div key={key}>
              <label htmlFor={`${inputId}-${key}`} className="text-neutral-5 text-sm font-light">
                {key}
              </label>
              <input
                id={`${inputId}-${key}`} // Link input to label
                type="text"
                className="mt-1 w-full border p-1"
                value={String(value[key as keyof typeof value] ?? '')}
                onChange={(e) => onFieldChange(field, { ...value, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      ) : (
        <>
          <label htmlFor={inputId} className="sr-only">
            {fieldObj?.title}
          </label>
          <input
            id={inputId} // Link input to label
            type="text"
            className="mt-2 w-full border p-2"
            value={String(value ?? '')}
            onChange={(e) => onFieldChange(field, e.target.value)}
          />
        </>
      )}
    </div>
  );
}

export default function DetailHeader<
  T extends EntityCoreIdentifiableNamed & Partial<Record<EntityCoreFields, unknown>>,
>({
  fields,
  detail,
  extraHeaderAction,
  commonFields = CommonSummaryViewFields,
  commonFieldsClassName,
  fieldsClassName,
  onDownload,
  isEditing = false,
  onEditToggle,
  onSave,
  onFieldChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  url,
}: {
  fields: Array<TypeSummaryProps>;
  detail: T;
  commonFields?: Array<TypeSummaryProps>;
  extraHeaderAction?: ReactNode;
  commonFieldsClassName?: string;
  fieldsClassName?: string;
  onDownload?: (entity: T) => void;
  isEditing?: boolean;
  onEditToggle?: () => void;
  onSave?: () => void;
  onFieldChange?: (fieldName: string, value: unknown) => void;
  url?: string; // Made optional to fix error in single-neuron-simulation.tsx
}) {
  return (
    <div className="flex w-full flex-col gap-10">
      <Header<T>
        detail={detail}
        extraHeaderAction={extraHeaderAction}
        onDownload={onDownload}
        isEditing={isEditing}
        onEditToggle={onEditToggle}
        onSave={onSave}
      />
      <div className="flex w-full flex-row gap-x-8">
        {isEditing ? (
          <>
            {commonFields.length > 0 && (
              <div
                className={
                  commonFieldsClassName ?? 'grid w-1/2 auto-rows-max grid-cols-2 gap-x-8 gap-y-6'
                }
              >
                {commonFields.map(({ className, field }) => (
                  <EditField<T>
                    key={field}
                    className={className}
                    field={field}
                    data={detail}
                    onFieldChange={onFieldChange!}
                  />
                ))}
              </div>
            )}
            <div
              className={fieldsClassName ?? 'grid w-1/2 auto-rows-min grid-cols-3 gap-x-8 gap-y-6'}
            >
              {fields.map(({ className, field }) => (
                <EditField<T>
                  key={field}
                  className={className}
                  field={field}
                  data={detail}
                  onFieldChange={onFieldChange!}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            {commonFields.length > 0 && (
              <div
                className={
                  commonFieldsClassName ?? 'grid w-1/2 auto-rows-max grid-cols-2 gap-x-8 gap-y-6'
                }
              >
                {commonFields.map(({ className, field }) => (
                  <Field<T> key={field} className={className} field={field} data={detail} />
                ))}
              </div>
            )}
            <div
              className={fieldsClassName ?? 'grid w-1/2 auto-rows-min grid-cols-3 gap-x-8 gap-y-6'}
            >
              {fields.map(({ className, field }) => (
                <Field<T> key={field} className={className} field={field} data={detail} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
