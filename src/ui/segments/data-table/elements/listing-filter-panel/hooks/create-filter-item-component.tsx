import { Input, Select } from 'antd';
import { map } from 'es-toolkit/compat';

import { CoreFieldFilterTypeEnum } from '@/entity-configuration/definitions/fields-defs/enums';
import { CheckList } from '@/ui/segments/data-table/elements/listing-filter-panel/checklist';
import { defaultList } from '@/ui/segments/data-table/elements/listing-filter-panel/checklist/default-checklist';
import { DateRange } from '@/ui/segments/data-table/elements/listing-filter-panel/date-range';
import { DropdownList } from '@/ui/segments/data-table/elements/listing-filter-panel/filter-as-dropdown';
import { ValueOrRange } from '@/ui/segments/data-table/elements/listing-filter-panel/value-or-range';
import { ValueRange } from '@/ui/segments/data-table/elements/listing-filter-panel/value-range';

import type { TFacets } from '@/api/entitycore/types/shared/response';
import type {
  CoreFilterValues,
  GteLteValue,
  TCoreFilter,
  ValueOrRangeFilter,
} from '@/entity-configuration/definitions/types';

export function createFilterItemComponent(
  filter: TCoreFilter,
  facets: TFacets | undefined,
  filterValues: CoreFilterValues,
  setFilterValues: React.Dispatch<React.SetStateAction<CoreFilterValues>>,
  items?: Array<{ value: string; label: string }> | undefined
) {
  return function FilterItemComponent() {
    const { type } = filter;

    const updateFilterValues = (field: string, values: TCoreFilter['value']) => {
      setFilterValues((prevState) => ({
        ...prevState,
        [field]: values,
      }));
    };

    const emptyFilter = (
      <div className="pl-9 font-light text-white italic">
        No filter available for this property yet
      </div>
    );

    switch (type) {
      case CoreFieldFilterTypeEnum.DateRange:
        return (
          <DateRange
            filter={filter}
            onChange={(values: GteLteValue) => updateFilterValues(filter.field, values)}
          />
        );

      case CoreFieldFilterTypeEnum.ValueRange:
        return (
          <ValueRange
            filter={filter}
            onChange={(values: GteLteValue) => updateFilterValues(filter.field, values)}
          />
        );

      case CoreFieldFilterTypeEnum.DropdownList:
        if (!items?.length) return emptyFilter;
        return (
          <DropdownList
            filter={filter}
            data={items}
            onChange={(values: string[]) => updateFilterValues(filter.field, values)}
            allowMultiple
          />
        );
      case CoreFieldFilterTypeEnum.CheckList: {
        if (!facets || !facets[filter.field]) return emptyFilter;
        const facetItems = map(facets[filter.field], ({ id, label, count, type: facetType }) => ({
          id,
          label,
          type: facetType,
          count,
          value: label,
        }));

        return (
          <CheckList
            data={facetItems}
            filter={filter}
            values={(filterValues[filter.field] as Array<string>) ?? []}
            onChange={(values: string[]) => updateFilterValues(filter.field, values)}
          >
            {defaultList}
          </CheckList>
        );
      }

      case CoreFieldFilterTypeEnum.ValueOrRange:
        return (
          <ValueOrRange
            key={JSON.stringify(filter.value)}
            filter={filter}
            setFilter={(value: ValueOrRangeFilter['value']) =>
              updateFilterValues(filter.field, value)
            }
          />
        );

      case CoreFieldFilterTypeEnum.Text:
        return (
          <div className="flex flex-col gap-2">
            <Input
              className="text-primary-9! bg-white! font-bold! focus-visible:border! border-primary-4"
              value={filterValues[filter.field] as string}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                updateFilterValues(filter.field, event.target.value)
              }
            />
            <span className="text-white">
              Use the asterix character (<code className="text-semibold font-mono">*</code>) to
              specify a &quot;wildcard&quot; for your search. For example; to search for names{' '}
              <i>beginning with</i> &quot;AA11&quot;, specify{' '}
              <code className="text-semibold font-mono">AA11*</code>. To search for names{' '}
              <i>containing</i> &quot;L5-2&quot;, specify{' '}
              <code className="text-bold font-mono">*L5-2*</code>.
            </span>
          </div>
        );

      case CoreFieldFilterTypeEnum.Boolean:
        return (
          <Select
            defaultValue="—"
            value={filterValues[filter.field]}
            style={{ width: 120 }}
            onChange={(v) => updateFilterValues(filter.field, v)}
            options={[
              { value: null, label: '—' },
              { value: true, label: 'True' },
              { value: false, label: 'False' },
            ]}
          />
        );

      default:
        return null;
    }
  };
}
