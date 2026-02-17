'use client';

import { CheckOutlined } from '@ant-design/icons';
import { Form } from 'antd';
import { useMemo, useState } from 'react';

import { getMtypes } from '@/api/entitycore/queries/annotations/mtype';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { AsyncSelectFormItem, type AsyncSelectOption } from '@/ui/molecules/async-select';
import {
  createZodFieldValidator,
  RequiredFieldMarker,
  renderLabel,
} from '@/ui/segments/contribute/shared/helpers';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';

import type { ZodObject, ZodRawShape } from 'zod';
import type { IMType } from '@/api/entitycore/types/shared/global';
import type { PaginationFilter, SearchFilter } from '@/api/entitycore/types/shared/request';

interface ICustomRendererProps {
  data: AsyncSelectOption<IMType>;
  selected: boolean;
  onSelect: (option: AsyncSelectOption<IMType> | undefined) => void;
}

function CustomRenderer({ data, selected, onSelect }: ICustomRendererProps) {
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

type Props<TSchema extends ZodObject<ZodRawShape>> = {
  schema: TSchema;
};

export function PostMTypeClassificationSelector<TSchema extends ZodObject<ZodRawShape>>({
  schema,
}: Props<TSchema>) {
  const form = Form.useFormInstance();
  const { virtualLabId, projectId } = useWorkspace();
  const [mtype, setMtype] = useState<AsyncSelectOption<IMType> | undefined>(undefined);

  const handleSelect = (option: AsyncSelectOption<IMType> | undefined): void => {
    setMtype(option);
  };

  const MTypeDropdown = useMemo(
    () =>
      AsyncSelectFormItem<PaginationFilter & SearchFilter, IMType>({
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
        onSelect: handleSelect,
      }),
    [virtualLabId, projectId, handleSelect]
  );

  return (
    <>
      <Form.Item
        name="post_mtype_id"
        label={renderLabel('Post mtype classification', 'main', RequiredFieldMarker)}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(schema, 'post_mtype_id', form),
          },
        ]}
      >
        <MTypeDropdown />
      </Form.Item>
      {mtype && (
        <div className="border-neutral-1 mx-5 rounded-md border px-3 py-2 shadow-xs select-none">
          <h4 className="text-primary-5">{mtype?.data.alt_label}</h4>
          <p className="text-gray-600">{mtype?.data.definition}</p>
        </div>
      )}
    </>
  );
}
