import type { CoreFieldFilterTypeEnum } from '@/entity-configuration/definitions/fields-defs/enums';

export interface GteLteValue {
  gte: Date | number | null;
  lte: Date | number | null;
}

interface BaseFilter {
  field: string;
  type: null;
  value: null;
  constraint?: string | Record<string, string>;
}

interface CheckListFilter extends Omit<BaseFilter, 'type' | 'value'> {
  type: CoreFieldFilterTypeEnum.CheckList;
  value: string[];
}

interface SearchFilter extends Omit<BaseFilter, 'type' | 'value'> {
  type: CoreFieldFilterTypeEnum.Search;
  value: string[];
}

interface DateRangeFilter extends Omit<BaseFilter, 'type' | 'value'> {
  type: CoreFieldFilterTypeEnum.DateRange;
  value: GteLteValue;
}

interface TextFilter extends Omit<BaseFilter, 'type' | 'value'> {
  type: CoreFieldFilterTypeEnum.Text;
  value: string;
}

export interface ValueFilter extends Omit<BaseFilter, 'type' | 'value'> {
  type: CoreFieldFilterTypeEnum.ValueRange;
  value: GteLteValue;
}

export interface ValueOrRangeFilter extends Omit<BaseFilter, 'type' | 'value'> {
  type: CoreFieldFilterTypeEnum.ValueOrRange;
  value: number | GteLteValue | null; // "value" | "range" | "all"
}

export type Filter =
  | CheckListFilter
  | SearchFilter
  | DateRangeFilter
  | TextFilter
  | ValueFilter
  | ValueOrRangeFilter
  | BaseFilter;

export type FilterType = CoreFieldFilterTypeEnum | null;
