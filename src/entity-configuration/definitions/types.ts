import { ReactNode } from 'react';

import { StructuralDomain } from '@/api/entitycore/types/entities/measurement-annotation';
import { DataType } from '@/constants/explore-section/list-views';

import {
  CoreFieldFilterTypeEnum,
  EntityCoreFields,
  EntityCoreFieldsValue,
} from '@/entity-configuration/definitions/fields-defs/enums';

import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';

export type CoreFilterValues = {
  [field: string]: string | number | string[] | GteLteValue | null;
};
export interface GteLteValue {
  gte: Date | number | null;
  lte: Date | number | null;
}

interface BaseFilter {
  field: EntityCoreFields;
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

export interface DateRangeFilter extends Omit<BaseFilter, 'type' | 'value'> {
  type: CoreFieldFilterTypeEnum.DateRange;
  value: GteLteValue;
}

interface TextFilter extends Omit<BaseFilter, 'type' | 'value'> {
  type: CoreFieldFilterTypeEnum.Text;
  value: string;
}

interface ValueFilter extends Omit<BaseFilter, 'type' | 'value'> {
  type: CoreFieldFilterTypeEnum.ValueRange;
  value: GteLteValue;
}

export interface ValueOrRangeFilter extends Omit<BaseFilter, 'type' | 'value'> {
  type: CoreFieldFilterTypeEnum.ValueOrRange;
  value: number | GteLteValue | null; // "value" | "range" | "all"
}
interface WithinListFilter extends Omit<BaseFilter, 'type' | 'value'> {
  type: CoreFieldFilterTypeEnum.WithinList;
  value: Array<string>;
}

export type CoreFilter =
  | CheckListFilter
  | SearchFilter
  | DateRangeFilter
  | TextFilter
  | ValueFilter
  | ValueOrRangeFilter
  | BaseFilter
  | WithinListFilter;

type CoreFilterType = CoreFieldFilterTypeEnum | null;

export enum CoreFieldType {
  CellType,
}

type TableCellAlign = 'left' | 'right' | 'center';
type Style = {
  align?: TableCellAlign;
  width?: number;
};

export type FieldDefinition<T extends EntityCoreIdentifiable> = {
  fieldType?: CoreFieldType;
  className?: string;
  title: string;
  description?: string;
  filter: CoreFilterType;
  defaultConstraint?: string | Record<string, string>;
  perTypeConstraint?: Partial<Record<DataType, string>>;
  isSortable?: boolean;
  isFilterable?: boolean;
  isDisplayable?: boolean;
  order?: {
    property: string;
    value: string;
  };
  unit?: ReactNode;
  group?: StructuralDomain;
  render?: (entity: T) => ReactNode;
  renderForDetailView?: (entity: T) => ReactNode;
  vocabulary?: {
    plural: string;
    singular: string;
  };
  style?: Partial<Style>;
};

export type FieldsDefinitionRegistry<T extends EntityCoreIdentifiable> = Record<
  Partial<EntityCoreFieldsValue>,
  FieldDefinition<T>
>;

type FieldsDefinitionItem<T extends EntityCoreIdentifiable> =
  FieldsDefinitionRegistry<T>[keyof FieldsDefinitionRegistry<T>];
