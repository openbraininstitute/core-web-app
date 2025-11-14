'use client';

import { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { getMtype } from '@/api/entitycore/queries/annotations/mtype';
import { getEtype } from '@/api/entitycore/queries/annotations/etype';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { Checkbox } from '@/ui/molecules/checkbox';

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
          <Checkbox
            className="h-[14px] w-[14px] rounded-sm border border-white bg-transparent text-white"
            checked={!!checked}
            onCheckedChange={onCheckedChange}
          />
        </span>
      </div>
      {children}
    </li>
  );
}

export function CheckListDescription({ id, type }: { id: string; type: 'mtype' | 'etype' }) {
  const { data } = useQuery({
    queryKey: keyBuilder.annotation({ entityId: id }),
    queryFn: async () => {
      if (type === 'mtype') return await getMtype({ id });
      return await getEtype({ id });
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return <span className="text-primary-1 text-left">{data?.definition}</span>;
}
