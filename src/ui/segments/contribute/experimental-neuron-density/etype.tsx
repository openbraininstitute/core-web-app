import { CheckOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import { Form } from 'antd';

import { AsyncSelectFormItem, AsyncSelectOption } from '@/ui/molecules/async-select';
import { getEtypes } from '@/api/entitycore/queries/annotations/etype';
import {
  ExperimentalNeuronDensitySchema,
  label,
  zodFieldValidator,
} from '@/ui/segments/contribute/experimental-neuron-density/helpers';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';

import type { PaginationFilter, SearchFilter } from '@/api/entitycore/types/shared/request';
import type { IEType } from '@/api/entitycore/types/shared/global';

function CustomRenderer({
  data,
  selected,
  onSelect,
}: {
  data: AsyncSelectOption<IEType>;
  selected: boolean;
  onSelect: (option: AsyncSelectOption<IEType> | undefined) => void;
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

export function ETypeClassification() {
  const form = Form.useFormInstance();
  const { virtualLabId, projectId } = useWorkspace();
  const [etype, setEtype] = useState<AsyncSelectOption<IEType> | undefined>(undefined);

  const onSelect = (option: AsyncSelectOption<IEType> | undefined) => {
    setEtype(option);
  };

  const EtypeDropdown = useMemo(
    () =>
      AsyncSelectFormItem<PaginationFilter & SearchFilter, IEType>({
        id: 'etype-selector',
        dataKey: keyBuilder.etype({ virtualLabId, projectId }),
        queryFn: getEtypes,
        getOptionLabel: (l) => l.pref_label ?? l.alt_label,
        getOptionValue: (l) => l.id,
        placeholder: 'Select a etype...',
        searchPlaceholder: 'Search etype...',
        clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
        searchable: true,
        searchField: 'pref_label__ilike',
        customItemRender: CustomRenderer,
        onSelect,
      }),
    [virtualLabId, projectId]
  );

  return (
    <>
      <Form.Item
        name="etype_class_id"
        label={label('Etype classification', 'main')}
        rules={[
          {
            required: false,
            validator: zodFieldValidator(ExperimentalNeuronDensitySchema, 'etype_class_id', form),
          },
        ]}
      >
        <EtypeDropdown />
      </Form.Item>
      {etype && (
        <div className="border-neutral-1 mx-5 rounded-md border px-3 py-2 shadow-xs select-none">
          <h4 className="text-primary-5">{etype?.data.alt_label}</h4>
          <p className="text-gray-600">{etype?.data.definition}</p>
        </div>
      )}
    </>
  );
}
