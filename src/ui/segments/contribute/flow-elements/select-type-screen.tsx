'use client';

import { CloseOutlined } from '@ant-design/icons';

import { Card, CardDescription } from '@/ui/molecules/card';
import { SelectPopover } from '@/ui/molecules/select-popover';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export type TArtifactOption = { value: TExtendedEntitiesTypeDict; label: string };

export interface ISelectTypeScreenProps {
  options: TArtifactOption[];
  selectedType: TExtendedEntitiesTypeDict | null;
  onSelectType: (type: TExtendedEntitiesTypeDict) => void;
}

export function SelectTypeScreen({ options, selectedType, onSelectType }: ISelectTypeScreenProps) {
  return (
    <div className="w-full">
      <div className="mb-5 flex w-full items-center justify-between pl-3">
        <h2 className="text-primary-9 text-lg font-bold">Select a type</h2>
        <button
          type="button"
          className={cn(
            'hover:bg-neutral-1 text-neutral-5 hover:text-primary-6 ',
            'flex items-center justify-center rounded-full p-2 hover:shadow-bnb'
          )}
        >
          <CloseOutlined />
        </button>
      </div>
      <Card className="px-4">
        <CardDescription>
          <SelectPopover<TArtifactOption>
            options={options}
            placeholder="select an artifact"
            searchPlaceholder="search an artifact"
            onSelect={(option) => {
              if (option) {
                onSelectType(option.value);
              }
            }}
            searchable={true}
            selectedValue={selectedType ?? undefined}
            clsx={{
              trigger: 'rounded-full border-none w-full h-12! shadow-bnb text-primary-9 text-lg',
              content: 'z-[99999]',
            }}
          />
        </CardDescription>
      </Card>
    </div>
  );
}
