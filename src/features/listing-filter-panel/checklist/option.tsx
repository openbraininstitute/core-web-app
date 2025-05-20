'use client';

import { memo, ReactNode, useEffect, useState } from 'react';
import * as Checkbox from '@radix-ui/react-checkbox';
import { format } from 'date-fns';

import { getMtype } from '@/api/entitycore/queries/annotations/mtype';
import { CheckIcon } from '@/components/icons';
import { tryCatch } from '@/api/utils';

const DisplayLabel = (filterField: string, key: string): string | null => {
  switch (filterField) {
    case 'updatedAt':
      return format(new Date(Number(key)), 'dd.MM.yyyy');
    case 'createdBy':
      return key.substring(key.lastIndexOf('/') + 1);
    default:
      return key;
  }
};

export function CheckListOption({
  checked,
  value,
  handleCheckedChange,
  id,
  filterField,
  label,
  type,
  children,
}: {
  children: ReactNode;
  checked: string | boolean;
  value: string | number | null;
  handleCheckedChange: (key: string) => void;
  id: string;
  filterField: string;
  label: string;
  type?: string | null;
}) {
  const onCheckedChange = () => handleCheckedChange(label);
  return (
    <li className="flex flex-col gap-2" key={`${filterField}–${id}`}>
      <div className="flex items-center justify-between pt-3">
        <span className="font-bold text-white">{DisplayLabel(filterField, label)}</span>
        <span className="flex items-center justify-between gap-2">
          {!!value && <span className="text-primary-5">{`${value} datasets`}</span>}
          <Checkbox.Root
            className="h-[14px] w-[14px] rounded-sm border border-white bg-transparent"
            checked={!!checked}
            onCheckedChange={onCheckedChange}
          >
            <Checkbox.Indicator className="flex w-full items-center justify-center">
              <CheckIcon className="check" fill="#fff" />
            </Checkbox.Indicator>
          </Checkbox.Root>
        </span>
      </div>
      {children}
    </li>
  );
}

export const CheckListDescription = memo(
  ({
    id,
    filterField,
    label,
    type,
  }: {
    id: string;
    filterField: string;
    label: string;
    type?: string | null;
  }) => {
    const [definition, setDefinition] = useState<string | null>(null);

    useEffect(() => {
      // TODO: fetch based on the type
      async function getDefinition() {
        const { data, error } = await tryCatch(getMtype({ id }));
        if (error) return null;
        setDefinition(data.definition);
      }
      getDefinition();
    }, [id]);

    return <span className="text-primary-1 text-justify text-balance">{definition}</span>;
  },
  ({ id }, { id: nextId }) => id !== nextId
);
