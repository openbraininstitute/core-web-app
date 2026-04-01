'use client';

import { Form } from 'antd';
import { useMemo } from 'react';

import { getLicenses } from '@/api/entitycore/queries/general/license';
import { AsyncSelectFormItem } from '@/ui/molecules/async-select';
import {
  createZodFieldValidator,
  DEFAULT_LICENSE_ID,
  RequiredFieldMarker,
  renderLabel,
} from '@/ui/segments/contribute/shared/helpers';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { ZodObject, ZodRawShape } from 'zod';
import type { ILicense } from '@/api/entitycore/types/shared/global';
import type { PaginationFilter } from '@/api/entitycore/types/shared/request';

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
    []
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
