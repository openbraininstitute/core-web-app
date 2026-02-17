import {
  CheckListDescription,
  CheckListOption,
} from '@/features/listing-filter-panel/checklist/option';

import type { JSX } from 'react';
import type { FacetOptionsList } from '@/features/listing-filter-panel/checklist/use-options';
import type { Filter } from '@/features/listing-filter-panel/types';

export type CheckListProps = {
  options: FacetOptionsList;
  renderLength: number;
  handleCheckedChange: (value: string) => void;
  filterField: Filter['field'];
  search: () => JSX.Element;
  loadMoreBtn: () => JSX.Element | null | false;
  defaultRenderLength: number; // Added defaultRenderLength as a prop
};

export const defaultList = ({
  options,
  renderLength,
  handleCheckedChange,
  filterField,
  search,
  loadMoreBtn,
  defaultRenderLength,
}: CheckListProps) => (
  <>
    {options && options.length > defaultRenderLength && search()}
    <ul className="flex flex-col space-y-3 divide-y divide-white/20">
      {options?.slice(0, renderLength)?.map(({ checked, id, label, type, count }) => (
        <CheckListOption
          key={id}
          id={id}
          type={type}
          checked={checked}
          value={count}
          handleCheckedChange={handleCheckedChange}
          filterField={filterField}
          label={label}
        >
          {(type === 'mtype' || type === 'etype') && <CheckListDescription id={id} type={type} />}
        </CheckListOption>
      ))}
    </ul>
    {options && options.length > defaultRenderLength && loadMoreBtn()}
  </>
);
