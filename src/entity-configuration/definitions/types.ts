import type { ReactNode } from 'react';
import type { StructuralDomain } from '@/api/entitycore/types/entities/measurement-annotation';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { TViewVariant, TWorkspaceScope, TWorkspaceSection } from '@/constants';
import type {
  CoreFieldFilterTypeEnum,
  EntityCoreFields,
  EntityCoreFieldsValue,
} from '@/entity-configuration/definitions/fields-defs/enums';
import type { TSpeciesSelectionMode } from '@/features/brain-region-hierarchy/types';
import type { WorkspaceContext } from '@/types/common';

export type CoreFilterValues = {
  [field: string]: string | number | string[] | GteLteValue | null | boolean;
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

interface DropdownListFilter extends Omit<BaseFilter, 'type' | 'value'> {
  type: CoreFieldFilterTypeEnum.DropdownList;
  value: string | Array<string> | null;
}

interface BooleanFilter extends Omit<BaseFilter, 'type' | 'value'> {
  type: CoreFieldFilterTypeEnum.Boolean;
  value: boolean | null;
}

export type TCoreFilter =
  | CheckListFilter
  | SearchFilter
  | DateRangeFilter
  | TextFilter
  | ValueFilter
  | ValueOrRangeFilter
  | BaseFilter
  | WithinListFilter
  | DropdownListFilter
  | BooleanFilter;

type CoreFilterType = CoreFieldFilterTypeEnum | null;

export enum CoreFieldType {
  CellType,
}

type TableCellAlign = 'left' | 'right' | 'center';
type Style = {
  align?: TableCellAlign;
  width?: number;
  fixed?: 'left' | 'right' | false | undefined;
};

export type OrderShape =
  | { property: string; value: string | Array<string> }
  | Array<{
      types: Array<Partial<TExtendedEntitiesTypeDict>>;
      property: string;
      value: string | string[];
    }>;

/**
 * runtime context used to resolve field presentation rules
 *
 * this context is purely configuration input
 */
export type TFieldApiContext = {
  dataType: TExtendedEntitiesTypeDict;
  section?: TWorkspaceSection;
  scope?: TWorkspaceScope;
  /** taxonomy id of the species selected in the hierarchy view, when focused on a single species */
  selectedSpecies?: string;
  /** hierarchy species selector mode for the current data browse context */
  speciesSelectionMode?: TSpeciesSelectionMode;
};

export type TMatchable<T> = T | readonly T[];

/**
 * declarative predicate for matching a field presentation rule
 *
 * semantics:
 * - keys are combined with AND
 * - array values inside a key are combined with OR
 * - omitted keys do not constrain the match
 */
export type TFieldApiWhen = {
  dataType?: TMatchable<TExtendedEntitiesTypeDict>;
  section?: TMatchable<TWorkspaceSection>;
  scope?: TMatchable<TWorkspaceScope>;
  selectedSpecies?: TMatchable<string>;
  speciesSelectionMode?: TMatchable<TSpeciesSelectionMode>;
};

/**
 * one ordered contextual rule
 *
 * rules are evaluated in declaration order, and the last matching rule wins
 */
export type TContextualRule<T> = {
  when?: TFieldApiWhen;
  matches?: (ctx: TFieldApiContext) => boolean;
  value: T;
};

/**
 * context-aware value with an optional default and ordered overrides
 */
export type TContextualValue<T> = {
  default?: T;
  rules?: TContextualRule<T>[];
};

/**
 * a single selectable option shown by a field filter control.
 */
export interface IFilterOptionItem {
  label: string;
  value: string;
  description?: ReactNode;
}

export const FilterOptionsSourceKind = {
  Static: 'static',
  Resolver: 'resolver',
} as const;

/**
 * source of options for a field filter.
 *
 * static sources embed the options directly in the field definition.
 * resolver sources compute options dynamically from the current field API context.
 */
export type TFilterOptionsSource =
  | { kind: typeof FilterOptionsSourceKind.Static; items: IFilterOptionItem[] }
  | {
      kind: typeof FilterOptionsSourceKind.Resolver;
      resolve: (args: {
        context: TFieldApiContext;
        workspace?: WorkspaceContext;
      }) => IFilterOptionItem[] | Promise<IFilterOptionItem[]>;
    };

/**
 * presentation rules for the field as a selectable column.
 */
export interface IFieldColumnPresentation {
  available?: TContextualValue<boolean>;
  /** When true, the column can appear in the table but is omitted from the filter panel (no filter UI, no eye toggle). */
  hideInFilterPanel?: TContextualValue<boolean>;
}

/**
 * presentation rules for the field as a filter control.
 */
export interface IFieldFilterPresentation {
  available?: TContextualValue<boolean>;
  constraint?: TContextualValue<string | Record<string, string>>;
  options?: TFilterOptionsSource;
}

/**
 * context-aware presentation rules for a field.
 */
export interface IFieldPresentation {
  column?: IFieldColumnPresentation;
  filter?: IFieldFilterPresentation;
}

export type FieldDefinition<T extends EntityCoreIdentifiable> = {
  fieldType?: CoreFieldType;
  className?: string;
  title: ReactNode;
  description?: string;
  filter: CoreFilterType;
  presentation?: IFieldPresentation;
  /**
   * @deprecated use `presentation.filter.options` instead.
   * legacy static filter options source kept for backward compatibility.
   */
  filterData?: unknown;
  /**
   * @deprecated use `presentation.filter.constraint.default` instead.
   * legacy default query constraint kept for backward compatibility.
   */
  defaultConstraint?: string | Record<string, string>;
  /**
   * @deprecated use `presentation.filter.constraint.rules` instead.
   * legacy per-data-type query constraint kept for backward compatibility.
   */
  perTypeConstraint?: Partial<Record<TExtendedEntitiesTypeDict, string>>;
  isSortable?: boolean;
  /**
   * @deprecated use `presentation.filter.available` instead.
   * legacy filter visibility flag kept for backward compatibility.
   */
  isFilterable?: boolean;
  /**
   * @deprecated use `presentation.column.available` instead.
   * legacy column visibility flag kept for backward compatibility.
   */
  isDisplayable?: boolean;
  order?: OrderShape;
  unit?: ReactNode;
  group?: StructuralDomain;
  render?: (entity: T, i?: number, variant?: TViewVariant) => ReactNode;
  renderForDetailView?: (entity: T, variant?: TViewVariant) => ReactNode;
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

export const DetailViewSectionsDict = {
  Overview: 'overview',
  Results: 'results',
  Analysis: 'analysis',
  RelatedPublications: 'related-publications',
  RelatedArtifacts: 'related-artifacts',
  Configuration: 'configuration',
} as const;

export type TDetailViewSectionDict =
  (typeof DetailViewSectionsDict)[keyof typeof DetailViewSectionsDict];

export const SortOrder = {
  ASC: 'asc',
  DESC: 'desc',
} as const;
export type TSortOrder = (typeof SortOrder)[keyof typeof SortOrder];
export interface TSortState {
  field: EntityCoreFields;
  backendField: string | Array<string>;
  order: TSortOrder | null;
}
export type TSortStateList = Array<TSortState>;

export function normalizeOrderBy(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }
  if (typeof value === 'string' && value.length > 0) {
    return [value];
  }
  return [];
}

export function getOrderByField(value: string): string {
  return value.replace(/^[+-]/, '');
}

/**
 * merge base/default ordering with user-selected ordering.
 *
 * rules:
 * - base ordering is kept first (acts as primary ordering).
 * - if user ordering targets the same field (ignoring +/- direction),
 *   the user entry replaces the base one.
 * - user ordering for new fields is appended.
 * - conflicts like `field` and `-field` are collapsed to one entry.
 */
export function mergeOrderByWithOverride(baseOrderBy: unknown, userOrderBy: unknown): string[] {
  const base = normalizeOrderBy(baseOrderBy);
  const user = normalizeOrderBy(userOrderBy);
  const baseFields = new Set(base.map(getOrderByField));
  const userByField = new Map(user.map((item) => [getOrderByField(item), item] as const));
  const consumedUserFields = new Set<string>();

  const mergedBase = base.map((item) => {
    const field = getOrderByField(item);
    const replacement = userByField.get(field);
    if (replacement) {
      consumedUserFields.add(field);
      return replacement;
    }
    return item;
  });

  const appendedUser = user.filter((item) => {
    const field = getOrderByField(item);
    if (consumedUserFields.has(field)) return false;
    return !baseFields.has(field);
  });

  return [...mergedBase, ...appendedUser];
}
