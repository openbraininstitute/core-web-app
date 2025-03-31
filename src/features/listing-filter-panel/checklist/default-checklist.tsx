import { Filter } from '@/features/listing-filter-panel/types';
import {
  CheckListDescription,
  CheckListOption,
} from '@/features/listing-filter-panel/checklist/option';
import { FacetOptionsList } from '@/features/listing-filter-panel/checklist/use-options';

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
      {options?.slice(0, renderLength)?.map(({ checked, value, id, label, type, count }) => (
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
          {type === 'mtype' && <CheckListDescription {...{ id, label, type, filterField }} />}
        </CheckListOption>
      ))}
    </ul>
    {options && options.length > defaultRenderLength && loadMoreBtn()}
  </>
);
