import { Form } from 'antd';

import { getLicenses } from '@/api/entitycore/queries/general/license';
import {
  CellMorphologySchema,
  label,
  zodFieldValidator,
} from '@/ui/segments/explore/contribute/cell-morphology/helpers';
import { AsyncSelectFormItem } from '@/ui/molecules/async-select';

import type { PaginationFilter } from '@/api/entitycore/types/shared/request';
import type { ILicense } from '@/api/entitycore/types/shared/global';

export function License() {
  const form = Form.useFormInstance();

  const LicenseDropdown = AsyncSelectFormItem<PaginationFilter, ILicense>({
    dataKey: ['license'],
    queryFn: getLicenses,
    getOptionLabel: (l) => l.label ?? l.name,
    getOptionValue: (l) => l.id,
    placeholder: 'Select a license...',
    searchPlaceholder: 'Search license...',
    clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
    searchable: false,
  });

  return (
    <Form.Item
      name="license_id"
      label={label('License', 'main', <sup className="text-destructive">*</sup>)}
      rules={[
        {
          required: true,
          validator: zodFieldValidator(CellMorphologySchema, 'license_id', form),
        },
      ]}
    >
      <LicenseDropdown />
    </Form.Item>
  );
}
