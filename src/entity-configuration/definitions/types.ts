import { ReactNode } from 'react';

import {
  CoreFieldFilterTypeEnum,
  EntityCoreFields,
  EntityCoreFieldsValue,
} from '@/entity-configuration/definitions/fields-defs/enums';

import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';

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

export interface CheckListFilter extends Omit<BaseFilter, 'type' | 'value'> {
  type: CoreFieldFilterTypeEnum.CheckList;
  value: string[];
}

export interface SearchFilter extends Omit<BaseFilter, 'type' | 'value'> {
  type: CoreFieldFilterTypeEnum.Search;
  value: string[];
}

export interface DateRangeFilter extends Omit<BaseFilter, 'type' | 'value'> {
  type: CoreFieldFilterTypeEnum.DateRange;
  value: GteLteValue;
}

export interface TextFilter extends Omit<BaseFilter, 'type' | 'value'> {
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

export type CoreFilter =
  | CheckListFilter
  | SearchFilter
  | DateRangeFilter
  | TextFilter
  | ValueFilter
  | ValueOrRangeFilter
  | BaseFilter;

export type CoreFilterType = CoreFieldFilterTypeEnum | null;

export enum CoreFieldType {
  CellType,
}

export enum MorphoMetricCompartment {
  Axon = 'Axon',
  Soma = 'Soma',
  ApicalDendrite = 'ApicalDendrite',
  BasalDendrite = 'BasalDendrite',
  NeuronMorphology = 'NeuronMorphology',
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
  constraint?: string | Record<string, string>;
  isSortable?: boolean;
  isFilterable?: boolean;
  isDisplayable?: boolean;
  order?: {
    property: string;
    value: string;
  };
  unit?: ReactNode;
  group?: MorphoMetricCompartment;
  render?: (resource: T) => ReactNode;
  vocabulary: {
    plural: string;
    singular: string;
  };
  style?: Partial<Style>;
};

export type FieldsDefinitionRegistry<T extends EntityCoreIdentifiable> = Record<
  Partial<EntityCoreFieldsValue>,
  FieldDefinition<T>
>;

export type FieldsDefinitionItem<T extends EntityCoreIdentifiable> =
  FieldsDefinitionRegistry<T>[keyof FieldsDefinitionRegistry<T>];
