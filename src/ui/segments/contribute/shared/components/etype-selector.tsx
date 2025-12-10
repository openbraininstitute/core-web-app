'use client';

import { CheckOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import { Form } from 'antd';

import type { ZodObject, ZodRawShape } from 'zod';

import { AsyncSelectFormItem, type AsyncSelectOption } from '@/ui/molecules/async-select';
import { getEtypes } from '@/api/entitycore/queries/annotations/etype';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';
import {
  createZodFieldValidator,
  RequiredFieldMarker,
  renderLabel,
} from '@/ui/segments/contribute/shared/helpers';
import { cn } from '@/utils/css-class';

import type { PaginationFilter, SearchFilter } from '@/api/entitycore/types/shared/request';
import type { IEType } from '@/api/entitycore/types/shared/global';

interface ICustomRendererProps {
  data: AsyncSelectOption<IEType>;
  selected: boolean;
  onSelect: (option: AsyncSelectOption<IEType> | undefined) => void;
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

export function ETypeClassificationSelector<TSchema extends ZodObject<ZodRawShape>>({
  schema,
}: Props<TSchema>) {
  const form = Form.useFormInstance();
  const { virtualLabId, projectId } = useWorkspace();
  const [etype, setEtype] = useState<AsyncSelectOption<IEType> | undefined>(undefined);

  const handleSelect = (option: AsyncSelectOption<IEType> | undefined): void => {
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
        placeholder: 'Select an etype...',
        searchPlaceholder: 'Search etype...',
        clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
        searchable: true,
        searchField: 'pref_label__ilike',
        customItemRender: CustomRenderer,
        onSelect: handleSelect,
      }),
    [virtualLabId, projectId]
  );

  return (
    <>
      <Form.Item
        name="etype_class_id"
        label={renderLabel('Etype classification', 'main', RequiredFieldMarker)}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(schema, 'etype_class_id', form),
          },
        ]}
      >
        <EtypeDropdown />
      </Form.Item>
      {etype?.data.definition && (
        <div className="border-neutral-1 mx-5 rounded-md border px-3 py-2 shadow-xs select-none">
          {etype?.data.alt_label && <h4 className="text-primary-5">{etype?.data.alt_label}</h4>}
          {etype?.data.definition && <p className="text-gray-600">{etype?.data.definition}</p>}
        </div>
      )}
    </>
  );
}
