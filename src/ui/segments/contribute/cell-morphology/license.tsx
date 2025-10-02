import { Form } from 'antd';

import { getLicenses } from '@/api/entitycore/queries/general/license';
import {
  CellMorphologySchema,
  label,
  zodFieldValidator,
} from '@/ui/segments/contribute/cell-morphology/helpers';
import { AsyncSelectFormItem } from '@/ui/molecules/async-select';

import type { PaginationFilter } from '@/api/entitycore/types/shared/request';
import type { ILicense } from '@/api/entitycore/types/shared/global';

export const DEFAULT_LICENSE_ID = 'ad8686db-3cdd-4e3f-bcbd-812380a9eba7';
export const DEFAULT_LICENSE_NAME = 'CC BY 4.0 Deed';

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
    selectedValue: DEFAULT_LICENSE_ID,
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
