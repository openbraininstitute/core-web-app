import { CheckOutlined } from '@ant-design/icons';
import { Form } from 'antd';

import { AsyncSelectFormItem, AsyncSelectOption } from '@/ui/molecules/async-select';
import { getMtypes } from '@/api/entitycore/queries/annotations/mtype';
import {
  CellMorphologySchema,
  label,
  zodFieldValidator,
} from '@/ui/segments/contribute/cell-morphology/helpers';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';

import type { PaginationFilter, SearchFilter } from '@/api/entitycore/types/shared/request';
import type { IMType } from '@/api/entitycore/types/shared/global';

function CustomRenderer({
  data,
  selected,
  onSelect,
}: {
  data: AsyncSelectOption<IMType>;
  selected: boolean;
  onSelect: (option: AsyncSelectOption<IMType> | undefined) => void;
}) {
  return (
    <div key={data?.value} className="group mb-1 flex items-center justify-start">
      <button
        type="button"
        aria-label={data.label}
        onClick={() => onSelect(data)}
        className={cn(
          'text-primary-9 hover:bg-background flex h-full w-full cursor-pointer',
          'items-center justify-start px-3 text-left transition-colors duration-150',
          'p-2 text-base group-first:hover:rounded-t-md xl:p-3 xl:text-lg'
        )}
        title={data.label}
      >
        <div className="flex flex-col gap-0.5">
          <div className="line-clamp-2 w-full group-hover:font-black">{data.label}</div>
          <div className="text-primary-8 text-base font-medium">{data.data.alt_label}</div>
          <p className="text-sm font-light text-gray-500">{data.data.definition}</p>
        </div>
        <div className="flex items-center justify-center gap-1">
          <CheckOutlined
            className={cn(
              'ml-auto text-sm transition-opacity duration-200',
              selected ? 'opacity-100' : 'opacity-0'
            )}
          />
        </div>
      </button>
    </div>
  );
}

export function MTypeClassification() {
  const form = Form.useFormInstance();
  const { virtualLabId, projectId } = useWorkspace();

  const MTypeDropdown = AsyncSelectFormItem<PaginationFilter & SearchFilter, IMType>({
    id: 'mtype-selector',
    dataKey: keyBuilder.mtype({ virtualLabId, projectId }),
    queryFn: getMtypes,
    getOptionLabel: (l) => l.pref_label ?? l.alt_label,
    getOptionValue: (l) => l.id,
    placeholder: 'Select a mtype...',
    searchPlaceholder: 'Search mtype...',
    clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
    searchable: true,
    searchField: 'pref_label__ilike',
    customItemRender: CustomRenderer,
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
