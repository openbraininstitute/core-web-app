'use client';

import { Form } from 'antd';
import { useMemo } from 'react';

import type { ZodObject, ZodRawShape } from 'zod';
import { getLicenses } from '@/api/entitycore/queries/general/license';
import type { ILicense } from '@/api/entitycore/types/shared/global';
import type { PaginationFilter } from '@/api/entitycore/types/shared/request';
import { AsyncSelectFormItem } from '@/ui/molecules/async-select';
import {
  createZodFieldValidator,
  RequiredFieldMarker,
  renderLabel,
} from '@/ui/segments/contribute/shared/helpers';
import { DEFAULT_LICENSE_ID } from '@/ui/segments/contribute/shared/schemas';
import { keyBuilder } from '@/ui/use-query-keys/data';

interface ILicenseSelectorProps<TSchema extends ZodObject<ZodRawShape>> {
  schema: TSchema;
}

export function LicenseSelector<TSchema extends ZodObject<ZodRawShape>>({
  schema,
}: ILicenseSelectorProps<TSchema>) {
  const form = Form.useFormInstance();

  const LicenseDropdown = useMemo(
    () =>
      AsyncSelectFormItem<PaginationFilter, ILicense>({
        id: 'license-selector',
        dataKey: keyBuilder.license(),
        queryFn: getLicenses,
        getOptionLabel: (l) => l.label ?? l.name,
        getOptionValue: (l) => l.id,
        placeholder: 'Select a license...',
        searchPlaceholder: 'Search license...',
        clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
        searchable: true,
        searchField: 'label__ilike',
        selectedValue: DEFAULT_LICENSE_ID,
      }),
    [],
  );

  return (
    <Form.Item
      name="license_id"
      label={renderLabel('License', 'main', RequiredFieldMarker)}
      rules={[
        {
          required: true,
          validator: createZodFieldValidator(schema, 'license_id', form),
        },
      ]}
    >
      <LicenseDropdown />
    </Form.Item>
  );
}
