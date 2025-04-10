import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAtom } from 'jotai';

import { SelectOption } from '@/types/common';
import ChevronDownIcon from '@/components/icons/ChevronDownIcon';
import { NeuriteType } from '@/types/m-model';
import { mModelNeuriteTypeSelectedAtom } from '@/state/brain-model-config/cell-model-assignment/m-model';

interface NeuriteSelectOption extends SelectOption {
  value: NeuriteType;
}

const options: NeuriteSelectOption[] = [
  { value: 'apical_dendrite', label: 'Apical dendrite' },
  { value: 'basal_dendrite', label: 'Basal dendrite' },
];

export default function NeuriteTypeDropdown() {
  const [neuriteTypeSelected, setNeuriteTypeSelected] = useAtom(mModelNeuriteTypeSelectedAtom);
  const displayName = options.find((option) => option.value === neuriteTypeSelected)?.label;

  const onChange = (option: NeuriteSelectOption) => {
    setNeuriteTypeSelected(option.value);
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild className="max-w-[150px]">
        <button
          type="button"
          onClick={(e) => e.preventDefault()}
          className="border-primary-8 text-primary-8 flex w-full items-center justify-between border-2 px-3 py-2"
        >
          <div className="font-bold">{displayName}</div>
          <ChevronDownIcon className="origin-center scale-[200%]" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="border-primary-8 text-primary-8 flex w-[150px] flex-col rounded-none border-2 border-t-0 bg-white text-left">
          {options.map((option) => (
            <DropdownMenu.Item
              key={option.label}
              onClick={() => onChange(option)}
              className="hover:bg-primary-1 cursor-pointer p-4"
            >
              {option.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
