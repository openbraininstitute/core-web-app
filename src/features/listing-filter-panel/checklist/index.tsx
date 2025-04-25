import { ReactNode, useState } from 'react';
import { InfoCircleFilled } from '@ant-design/icons';

import { useOptions } from '@/features/listing-filter-panel/checklist/use-options';
import { DEFAULT_CHECKLIST_RENDER_LENGTH } from '@/constants/explore-section/list-views';
import { getFieldDefinition } from '@/entity-configuration/definitions';

import SearchFilter from '@/features/listing-filter-panel/search-filter';
import CenteredMessage from '@/components/CenteredMessage';

import type { FacetLabelValuePair } from '@/features/listing-filter-panel/checklist/use-options';
import type { CheckListProps } from '@/features/listing-filter-panel/checklist/default-checklist';
import type { CoreFilter } from '@/entity-configuration/definitions/types';

type Props = {
  children: (props: CheckListProps) => ReactNode;
  data: Array<FacetLabelValuePair>;
  filter: CoreFilter;
  values: string[];
  onChange: (value: string[]) => void;
};

export default function CheckList({ children, data, filter, values, onChange }: Props) {
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
  const fieldLabel = remainingLength === 1 ? field?.vocabulary.singular : field?.vocabulary.plural;

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
