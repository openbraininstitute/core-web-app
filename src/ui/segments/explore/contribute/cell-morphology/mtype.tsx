import { Form } from 'antd';

import { getMtypes } from '@/api/entitycore/queries/annotations/mtype';
import {
  CellMorphologySchema,
  label,
  zodFieldValidator,
} from '@/ui/segments/explore/contribute/cell-morphology/helpers';
import { AsyncSelectFormItem } from '@/ui/molecules/async-select';

import type { PaginationFilter, SearchFilter } from '@/api/entitycore/types/shared/request';
import type { IMType } from '@/api/entitycore/types/shared/global';

export function MTypeClassification() {
  const form = Form.useFormInstance();

  const MTypeDropdown = AsyncSelectFormItem<PaginationFilter & SearchFilter, IMType>({
    dataKey: ['mtype-class'],
    queryFn: getMtypes,
    getOptionLabel: (l) => l.pref_label ?? l.alt_label,
    getOptionValue: (l) => l.id,
    placeholder: 'Select a mtype...',
    searchPlaceholder: 'Search mtype...',
    clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
    searchable: false,
  });

  return (
    <Form.Item
      name="mtype_class_id"
      label={label('Mtype classification', 'main', <sup className="text-destructive">*</sup>)}
      rules={[
        {
          required: true,
          validator: zodFieldValidator(CellMorphologySchema, 'mtype_class_id', form),
        },
      ]}
    >
      <MTypeDropdown />
    </Form.Item>
  );
}
