import { Filter } from '@/features/listing-filter-panel/types';
import { ENTITY_CORE_FIELDS_CONFIG } from '@/constants/explore-section/fields-config';
import { FilterTypeEnum } from '@/types/explore-section/filters';

export default function columnKeyToFilter(key: string): Filter {
  console.log('ᦨ #  column-key-to-filter.ts:8 #  columnKeyToFilter #  key:', key);
  const fieldConfig = ENTITY_CORE_FIELDS_CONFIG[key];
  console.log('ᦨ #  column-key-to-filter.ts:8 #  columnKeyToFilter #  fieldConfig:', fieldConfig);
  console.log(
    'ᦨ #  column-key-to-filter.ts:8 #  columnKeyToFilter #  fieldConfig:',
    fieldConfig.filter
  );
  console.log('-----');

  switch (fieldConfig.filter) {
    case FilterTypeEnum.CheckList:
      return {
        field: key,
        type: FilterTypeEnum.CheckList,
        value: [],
        constraint: fieldConfig.constraint,
      };
    case FilterTypeEnum.DateRange:
      return {
        field: key,
        type: FilterTypeEnum.DateRange,
        value: { gte: null, lte: null },
        constraint: fieldConfig.constraint,
      };
    case FilterTypeEnum.ValueRange:
      return {
        field: key,
        type: FilterTypeEnum.ValueRange,
        value: { gte: null, lte: null },
        constraint: fieldConfig.constraint,
      };
    case FilterTypeEnum.ValueOrRange:
      return {
        field: key,
        type: FilterTypeEnum.ValueOrRange,
        value: null,
        constraint: fieldConfig.constraint,
      };
    case FilterTypeEnum.Text:
      return {
        field: key,
        type: FilterTypeEnum.Text,
        value: '',
        constraint: fieldConfig.constraint,
      };
    default:
      return {
        field: key,
        type: null,
        value: null,
        constraint: fieldConfig.constraint,
      };
  }
}
