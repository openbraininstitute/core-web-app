import { Filter } from '@/components/Filter/types';
import { NEW_EXPLORE_FIELDS_CONFIG } from '@/constants/explore-section/fields-config';
import { FilterTypeEnum } from '@/types/explore-section/filters';

export default function columnKeyToFilter(key: string): Filter {
  const fieldConfig = NEW_EXPLORE_FIELDS_CONFIG[key];
  console.log('@@fieldConfig', fieldConfig);
  switch (fieldConfig?.filter) {
    case FilterTypeEnum.CheckList:
      return {
        title: fieldConfig?.title,
        field: key,
        type: FilterTypeEnum.CheckList,
        value: [],
        aggregationType: 'buckets',
      };
    case FilterTypeEnum.DateRange:
      return {
        title: fieldConfig?.title,
        field: key,
        type: FilterTypeEnum.DateRange,
        value: { gte: null, lte: null },
        aggregationType: 'stats',
      };
    case FilterTypeEnum.ValueRange:
      return {
        title: fieldConfig?.title,
        field: key,
        type: FilterTypeEnum.ValueRange,
        value: { gte: null, lte: null },
        aggregationType: 'stats',
      };
    case FilterTypeEnum.ValueOrRange:
      return {
        title: fieldConfig?.title,
        field: key,
        type: FilterTypeEnum.ValueOrRange,
        value: null,
        aggregationType: 'buckets',
      };
    case FilterTypeEnum.Text:
      return {
        title: fieldConfig?.title,
        field: key,
        type: FilterTypeEnum.Text,
        value: '',
        aggregationType: null,
      };
    default:
      return {
        title: fieldConfig?.title,
        field: key,
        aggregationType: null,
        type: null,
        value: null,
      };
  }
}
