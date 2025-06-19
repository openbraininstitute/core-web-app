import { ReactNode } from 'react';
import { FilterType } from '@/features/listing-filter-panel/types';
import { StructuralDomain } from '@/types/explore-section/es-experiment';
import { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';

type TableCellAlign = 'left' | 'right' | 'center';

export enum FieldType {
  CellType,
}

type ExploreFieldConfigStyle = {
  align?: TableCellAlign;
  width?: number;
};

export type ExploreFieldConfig<T = EntityCoreIdentifiable> = {
  fieldType?: FieldType;
  className?: string;
  esTerms?: EsTermsConfig;
  title: string;
  description?: string;
  filter: FilterType;
  constraint?: string | Record<string, string>;
  isSortable?: boolean;
  order?: {
    property: string;
    value: string;
  };
  unit?: ReactNode;
  group?: StructuralDomain;
  render?: (resource: T) => ReactNode;
  vocabulary: {
    plural: string;
    singular: string;
  };
  style?: Partial<ExploreFieldConfigStyle>;
};

export type ExploreFieldsConfigProps<T> = {
  [key: string]: ExploreFieldConfig<T>;
};

type EsTermsConfig = {
  flat?: {
    filter?: string;
    aggregation?: string;
    sort?: string;
  };
  nested?: NestedFieldConfig;
};

type NestedFieldConfig = {
  nestedPath: string;
  filterTerm: string;
  filterValue: string;
  aggregationName: string;
  aggregationField: string;
};

// export type DetailType = DeltaResource;
export type EntityCoreElement<T> = T extends EntityCoreIdentifiable ? T : never;
