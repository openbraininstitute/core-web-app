'use client';

import { InfoCircleFilled } from '@ant-design/icons';
import { type ReactNode, useState } from 'react';
import { CenteredMessage } from '@/components/CenteredMessage';
import { DEFAULT_CHECKLIST_RENDER_LENGTH } from '@/constants';
import { getFieldDefinition } from '@/entity-configuration/definitions';
import type { TCoreFilter } from '@/entity-configuration/definitions/types';
import type { CheckListProps } from '@/ui/segments/data-table/elements/listing-filter-panel/checklist/default-checklist';
import type { FacetLabelValuePair } from '@/ui/segments/data-table/elements/listing-filter-panel/checklist/use-options';
import { useOptions } from '@/ui/segments/data-table/elements/listing-filter-panel/checklist/use-options';
import { SearchFilter } from '@/ui/segments/data-table/elements/listing-filter-panel/search-filter';

type Props = {
  children: (props: CheckListProps) => ReactNode;
  data: FacetLabelValuePair[];
  filter: TCoreFilter;
  values: string[];
  onChange: (value: string[]) => void;
};

export function CheckList({ children, data, filter, values, onChange }: Props) {
  const [filtersRenderLength, setFiltersRenderLength] = useState(() => 5);
  const options = useOptions(values, data);

  const handleCheckedChange = (value: string) => {
    let newValues = [...values];

    if (values.includes(value)) {
      newValues = values.filter((val) => val !== value);
    } else {
      newValues.push(value);
    }
    onChange(newValues);
  };

  const loadMoreLength = 5;
  const remainingLength = (data?.length || 0) - filtersRenderLength;
  const adjustedLoadMoreLength =
    remainingLength >= loadMoreLength ? loadMoreLength : remainingLength;
  const field = getFieldDefinition(filter.field);
  const fieldLabel =
    remainingLength === 1 ? field?.vocabulary?.singular : field?.vocabulary?.plural;

  const updateRenderLength = () => setFiltersRenderLength((prev) => prev + adjustedLoadMoreLength);
  const loadMoreBtn = () =>
    !!remainingLength &&
    remainingLength > 0 && (
      <button
        className="bg-primary-9 ml-auto w-fit rounded-sm px-8 py-3 text-white"
        type="button"
        onClick={() => updateRenderLength()}
      >
        {`Load ${adjustedLoadMoreLength} more ${fieldLabel} (${remainingLength} remaining)`}
      </button>
    );

  const search = () => (
    <div className="border-b border-white">
      <SearchFilter data={data} filter={filter} values={values} onChange={onChange} />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {options && options.length > 0 ? (
        children({
          options,
          search, // Pass the search function to the ListComponent
          loadMoreBtn, // Pass the loadMoreBtn function to the ListComponent
          handleCheckedChange,
          filterField: filter.field,
          renderLength: filtersRenderLength,
          defaultRenderLength: DEFAULT_CHECKLIST_RENDER_LENGTH, // Pass the defaultRenderLength as a prop
        })
      ) : (
        <div className="text-neutral-1">
          <CenteredMessage
            icon={<InfoCircleFilled style={{ fontSize: '2rem' }} />}
            message="We could not find any data that matches your selected filters. Please modify your selection to narrow down and retrieve the relevant information"
          />
        </div>
      )}
    </div>
  );
}

export default CheckList;
