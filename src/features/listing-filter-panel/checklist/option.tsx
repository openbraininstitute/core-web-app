'use client';

import { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Checkbox from '@radix-ui/react-checkbox';
import { format } from 'date-fns';

import { getMtype } from '@/api/entitycore/queries/annotations/mtype';
import { CheckIcon } from '@/components/icons';
import { getEtype } from '@/api/entitycore/queries/annotations/etype';

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
  children,
}: {
  children: ReactNode;
  checked: string | boolean;
  value: string | number | null;
  handleCheckedChange: (key: string) => void;
  id: string;
  filterField: string;
  label: string;
  // eslint-disable-next-line react/no-unused-prop-types
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

export function CheckListDescription({ id, type }: { id: string; type: 'mtype' | 'etype' }) {
  const { data } = useQuery({
    queryKey: [id],
    queryFn: async () => {
      if (type === 'mtype') return await getMtype({ id });
      return await getEtype({ id });
    },
    refetchOnMount: false,
  });

  return <span className="text-primary-1 text-justify text-balance">{data?.definition}</span>;
}
