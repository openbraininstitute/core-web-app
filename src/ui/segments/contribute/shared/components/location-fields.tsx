'use client';

import { Form, InputNumber } from 'antd';

import { createZodFieldValidator } from '@/ui/segments/contribute/shared/helpers';

import type { FormInstance } from 'antd';
import type { ZodType } from 'zod';

interface ILocationFieldsProps<
  TSchema extends ZodType,
  TFormValues extends Record<string, unknown>,
> {
  schema: TSchema;
  form: FormInstance<TFormValues>;
}

const LOCATION_COORDINATES = [
  { key: 'x', placeholder: 'X (microns)' },
  { key: 'y', placeholder: 'Y (microns)' },
  { key: 'z', placeholder: 'Z (microns)' },
] as const;

export function LocationFields<
  TSchema extends ZodType,
  TFormValues extends Record<string, unknown>,
>({ schema, form }: ILocationFieldsProps<TSchema, TFormValues>) {
  return (
    <fieldset
      aria-label="Location coordinates"
      className="m-0 flex w-full min-w-0 gap-2 border-0 p-0"
    >
      {LOCATION_COORDINATES.map(({ key, placeholder }) => (
        <Form.Item
          key={key}
          name={['setup', 'location', key]}
          required={false}
          validateTrigger={['onChange', 'onBlur']}
          rules={[
            {
              validator: createZodFieldValidator(schema, `setup.location.${key}`, form),
            },
          ]}
          className="mb-0! min-w-0 flex-1"
        >
          <InputNumber
            placeholder={placeholder}
            size="large"
            className="h-12 w-full! rounded-full! placeholder:text-sm [&_.ant-input-number-handler-wrap]:hidden"
          />
        </Form.Item>
      ))}
    </fieldset>
  );
}
