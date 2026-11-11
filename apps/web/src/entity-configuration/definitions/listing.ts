import { fieldsDefinitionRegistry, getFieldDefinition } from '@/entity-configuration/definitions';
import {
  type FieldDefinition,
  type FieldsDefinitionRegistry,
  FilterOptionsSourceKind,
  type IFilterOptionItem,
  type TContextualRule,
  type TContextualValue,
  type TFieldApiContext,
  type TFieldApiWhen,
  type TFilterOptionsSource,
} from '@/entity-configuration/definitions/types';
import {
  SpeciesSelectionMode,
  type TSpeciesSelectionMode,
} from '@/features/brain-region-hierarchy/types';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { TWorkspaceScope, TWorkspaceSection } from '@/constants';
import type { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';
import type { IWorkspaceSpecies } from '@/features/brain-region-hierarchy/types';
import type { WorkspaceContext } from '@/types/common';

export function buildFieldListingContext({
  dataType,
  section,
  scope,
  speciesSelectionMode,
  workspaceSpecies,
}: {
  dataType: TFieldApiContext['dataType'];
  section?: TWorkspaceSection;
  scope?: TWorkspaceScope;
  speciesSelectionMode?: TSpeciesSelectionMode;
  workspaceSpecies?: IWorkspaceSpecies | null;
}): TFieldApiContext {
  return {
    dataType,
    section,
    scope,
    selectedSpecies:
      speciesSelectionMode === SpeciesSelectionMode.All ? undefined : workspaceSpecies?.taxonomyId,
    speciesSelectionMode,
  };
}

/**
 * resolved field presentation state for one runtime context.
 */
export interface IResolvedFieldPresentation {
  columnAvailable: boolean;
  filterAvailable: boolean;
  hideInFilterPanel: boolean;
  constraint?: string | Record<string, string>;
  optionsSource?: TFilterOptionsSource;
}

/**
 * determines whether a field is listed in the filter panel
 *
 * a field is listed in the filter panel if:
 * - it is not hidden in the filter panel
 * - it is available as a filter control
 * - it is available as a column eye toggle
 */
export function isFieldListedInFilterPanel(presentation: IResolvedFieldPresentation): boolean {
  if (presentation.hideInFilterPanel) return false;
  return presentation.filterAvailable || presentation.columnAvailable;
}

/**
 * determines whether a field is listed as a column eye toggle in the filter panel
 *
 * a field is listed as a column eye toggle in the filter panel if:
 * - it is available as a column eye toggle
 * - it is not hidden in the filter panel
 */
export function isColumnToggleInFilterPanel(presentation: IResolvedFieldPresentation): boolean {
  return presentation.columnAvailable && !presentation.hideInFilterPanel;
}

/**
 * matches a single contextual property value.
 *
 * rules:
 * - `undefined` means "no constraint", so the match succeeds.
 * - arrays use OR semantics
 * - scalar values use strict equality
 */
function matchesContextValue<T>(
  value: T | readonly T[] | undefined,
  actual: T | undefined
): boolean {
  if (value === undefined) return true;
  if (Array.isArray(value)) return actual !== undefined && value.includes(actual);
  return value === actual;
}

/**
 * evaluates the declarative `when` predicate for a field API context
 *
 * semantics:
 * - keys are combined with AND
 * - array values inside a key are combined with OR
 * - omitted keys do not constrain the match
 *
 * @example
 * ```ts
 * matchesFieldApiWhen(
 *   {
 *     dataType: 'universal_cell_morphology',
 *     section: ['data', 'build'],
 *   },
 *   {
 *     dataType: 'universal_cell_morphology',
 *     section: 'build',
 *   }
 * ) // true
 * ```
 */
export function matchesFieldApiWhen(
  when: TFieldApiWhen | undefined,
  ctx: TFieldApiContext
): boolean {
  if (!when) return true;

  return (
    matchesContextValue(when.dataType, ctx.dataType) &&
    matchesContextValue(when.section, ctx.section) &&
    matchesContextValue(when.scope, ctx.scope) &&
    matchesContextValue(when.selectedSpecies, ctx.selectedSpecies) &&
    matchesContextValue(when.speciesSelectionMode, ctx.speciesSelectionMode)
  );
}

/**
 *  evaluates a full contextual rule
 *
 * a rule matches only when:
 * - the declarative `when` predicate matches
 * - the optional imperative `matches` predicate, when present, returns `true`
 *
 * @example
 * ```ts
 * matchesContextualRule(
 *   {
 *     when: { section: 'build' },
 *     matches: (ctx) => ctx.scope === 'project',
 *     value: true,
 *   },
 *   { dataType: 'universal_cell_morphology', section: 'build', scope: 'project' }
 * ) // true
 * ```
 */
export function matchesContextualRule<T>(rule: TContextualRule<T>, ctx: TFieldApiContext): boolean {
  if (!matchesFieldApiWhen(rule.when, ctx)) return false;
  if (rule.matches && !rule.matches(ctx)) return false;
  return true;
}

/**
 * resolves a contextual value for the current field API context
 *
 * resolution order:
 * - start from `default`
 * - apply each matching rule in order
 * - the last matching rule wins
 *
 * @example
 * ```ts
 * resolveContextualValue(
 *   {
 *     default: false,
 *     rules: [
 *       { when: { section: 'data' }, value: true },
 *       { when: { section: 'data', scope: 'project' }, value: false },
 *     ],
 *   },
 *   {
 *     dataType: 'universal_cell_morphology',
 *     section: 'data',
 *     scope: 'project',
 *   }
 * ) // false
 * ```
 */
export function resolveContextualValue<T>(
  contextual: TContextualValue<T> | undefined,
  ctx: TFieldApiContext
): T | undefined {
  if (!contextual) return undefined;

  let resolved = contextual.default;

  contextual.rules?.forEach((rule) => {
    if (matchesContextualRule(rule, ctx)) {
      resolved = rule.value;
    }
  });

  return resolved;
}

/**
 * converts legacy `filterData` into the new typed options source shape
 *
 * this keeps existing fields working while the listing API is migrated
 *
 * @example
 * ```ts
 * // legacy field
 * {
 *   filterData: [
 *     { label: 'Mouse', value: 'mouse' },
 *     { label: 'Rat', value: 'rat' },
 *   ]
 * }
 *
 * // resolved as
 * { kind: 'static', items: [...] }
 * ```
 */
function resolveLegacyOptions(
  field: FieldDefinition<EntityCoreObjectTypes>
): TFilterOptionsSource | undefined {
  if (!Array.isArray(field.filterData)) return undefined;

  return {
    kind: FilterOptionsSourceKind.Static,
    items: field.filterData as IFilterOptionItem[],
  };
}

/**
 * resolves the effective field presentation for a field in a given context
 *
 * precedence:
 * - new contextual `presentation.*` configuration wins
 * - then legacy `perTypeConstraint`
 * - then legacy booleans and `defaultConstraint`
 *
 * @example
 * ```ts
 * const presentation = resolveFieldListing(field, {
 *   dataType: 'universal_cell_morphology',
 *   section: 'build',
 * })
 *
 * presentation.columnAvailable
 * presentation.filterAvailable
 * presentation.constraint
 * presentation.optionsSource
 * ```
 */
export function resolveFieldListing(
  field: FieldDefinition<EntityCoreObjectTypes> | null | undefined,
  ctx: TFieldApiContext
): IResolvedFieldPresentation {
  if (!field) {
    return {
      columnAvailable: false,
      filterAvailable: false,
      hideInFilterPanel: false,
    };
  }

  return {
    columnAvailable:
      resolveContextualValue(field.presentation?.column?.available, ctx) ??
      field.isDisplayable ??
      false,
    filterAvailable:
      resolveContextualValue(field.presentation?.filter?.available, ctx) ??
      field.isFilterable ??
      false,
    hideInFilterPanel:
      resolveContextualValue(field.presentation?.column?.hideInFilterPanel, ctx) ?? false,
    constraint:
      resolveContextualValue(field.presentation?.filter?.constraint, ctx) ??
      field.perTypeConstraint?.[ctx.dataType] ??
      field.defaultConstraint,
    optionsSource: field.presentation?.filter?.options ?? resolveLegacyOptions(field),
  };
}

/**
 * resolves concrete filter option items from an options source
 *
 * - static sources return their items directly
 * - resolver sources are executed with the current field API context
 *
 * @example
 * ```ts
 * await resolveFilterOptions(
 *   {
 *     kind: 'resolver',
 *     resolve: ({ context }) => [
 *       { label: context.section ?? 'Unknown', value: context.section ?? 'unknown' },
 *     ],
 *   },
 *   {
 *     dataType: 'universal_cell_morphology',
 *     section: 'build',
 *   }
 * )
 * ```
 */
export async function resolveFilterOptions(
  optionsSource: TFilterOptionsSource | undefined,
  context: TFieldApiContext,
  workspace?: WorkspaceContext
): Promise<IFilterOptionItem[]> {
  if (!optionsSource) return [];

  if (optionsSource.kind === FilterOptionsSourceKind.Static) {
    return optionsSource.items;
  }

  return (await optionsSource.resolve({ context, workspace })) ?? [];
}

/**
 * collects all field keys that should participate in listing behavior for a context
 *
 * The result is the union of:
 * - `view.columns`
 * - legacy `view.filterableFields`
 * - legacy `view.displayableFields`
 * - fields enabled by the contextual `presentation` API
 *
 * the returned set is unique and preserves insertion order
 *
 * @example
 * ```ts
 * const keys = collectListingFieldKeys(view, {
 *   dataType: 'universal_cell_morphology',
 *   section: 'build',
 * })
 * ```
 */
export function collectListingFieldKeys(
  view: ViewDefinitionConfig | null | undefined,
  ctx: TFieldApiContext,
  registry: Partial<FieldsDefinitionRegistry<EntityCoreObjectTypes>> = fieldsDefinitionRegistry
): EntityCoreFields[] {
  const keys = new Set<EntityCoreFields>();

  const addField = (field: EntityCoreFields | undefined) => {
    if (field) keys.add(field);
  };

  view?.columns.forEach(addField);
  view?.filterableFields?.forEach(addField);
  view?.displayableFields?.forEach(addField);

  Object.keys(registry).forEach((fieldKey) => {
    const definition = registry[fieldKey as EntityCoreFields];
    if (!definition?.presentation) return;

    const presentation = resolveFieldListing(definition, ctx);
    if (presentation.columnAvailable || presentation.filterAvailable) {
      addField(fieldKey as EntityCoreFields);
    }
  });

  return Array.from(keys);
}

/**
 * computes the default active table columns for a context
 *
 * this intentionally only considers `view.columns`, then filters them through
 * contextual column availability. Fields enabled only through `presentation`
 * remain
 * available to the panel, but are not visible by default unless they are also
 * in `view.columns`
 *
 * @example
 * ```ts
 * const activeColumns = collectDefaultActiveColumns(view, {
 *   dataType: 'universal_cell_morphology',
 *   section: 'build',
 * })
 * ```
 */
export function collectDefaultActiveColumns(
  view: ViewDefinitionConfig | null | undefined,
  ctx: TFieldApiContext
): EntityCoreFields[] {
  return (
    view?.columns.filter((field) => {
      return resolveFieldListing(getFieldDefinition(field), ctx).columnAvailable;
    }) ?? []
  );
}
