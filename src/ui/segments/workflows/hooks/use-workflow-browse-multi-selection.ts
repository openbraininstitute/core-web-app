/**
 * pure helpers for multi-entity workflow browse selection
 *
 * state is owned by the browse page (e.g. `selectionsByType` in
 * {@link WorkflowNewBrowsePage}) and passed to tables via controlled
 * `selectedRows` / `onRowsSelected`. these utilities classify browse mode,
 * derive ui counts, and build configure page selection payloads
 */

import {
  TableSelectionType,
  WorkflowInitializeSelectionMode,
} from '@/features/scan-config/schema/types';
import {
  makeGroupedWorkflowSelection,
  makeListWorkflowSelection,
  makeSingleWorkflowSelection,
} from '@/features/scan-config/workflow/selection/types';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { TWorkflowSelectionConfig } from '@/features/scan-config/schema/types';
import type {
  TWorkflowSelectionPayload,
  TWorkflowSelectionRef,
} from '@/features/scan-config/workflow/selection/types';
import type { IWorkflowConfigurationInput } from '@/ui/segments/workflows/config/types';

/**
 * parent-owned row selections keyed by extended entity type
 *
 * each accepted entity type from the schema maps to the rows the user checked
 * in that entity's browse table
 */
export type TWorkflowBrowseSelectionsByType = Partial<
  Record<TExtendedEntitiesTypeDict, EntityCoreIdentifiableNamed[]>
>;

/** arguments for {@link isWorkflowMultiEntityBrowse} */
export type IsWorkflowMultiEntityBrowseParams = {
  selectionConfig: TWorkflowSelectionConfig | null | undefined;
};

/**
 * whether the workflow browse page should use multi-entity selection ux
 *
 * derived only from the scan-config schema rules in {@link selectionConfig}.
 * returns `true` when schema implies checkbox, `multiple`, or `grouped` selection.
 *
 * when `true`, browse hides per-row "Use model", shows type badges, and uses a
 * footer "Configure N selected entities" action instead
 *
 * @param opts - resolved selection config from the fetched scan-config schema
 * @returns `true` for multi-table / multi-select browse behavior
 */
export function isWorkflowMultiEntityBrowse(opts: IsWorkflowMultiEntityBrowseParams): boolean {
  const { selectionConfig } = opts;

  if (!selectionConfig) {
    return false;
  }

  return (
    selectionConfig.tableSelectionType === TableSelectionType.Checkbox ||
    selectionConfig.selectionMode === WorkflowInitializeSelectionMode.Multiple ||
    selectionConfig.selectionMode === WorkflowInitializeSelectionMode.Grouped
  );
}

/** arguments for {@link buildWorkflowBrowseSelectionPayload} */
export type BuildWorkflowBrowseSelectionPayloadParams = {
  selectionConfig: TWorkflowSelectionConfig | null | undefined;
  configurationInputs: readonly IWorkflowConfigurationInput[];
  selectionsByType: TWorkflowBrowseSelectionsByType;
};

/**
 * builds the sessionStorage payload written before navigating to configure
 *
 * serialization follows {@link TWorkflowSelectionConfig.selectionMode}:
 * - `grouped` → {@link makeGroupedWorkflowSelection} (one group per configuration input)
 * - `single` / table `radio` → first selected ref only
 * - otherwise → flat {@link makeListWorkflowSelection}
 *
 * empty groups are omitted. returns `null` when nothing is selected
 *
 * @param opts: selection rules, workflow inputs, and current parent state
 * @returns payload for {@link persistWorkflowSelectionForConfigure}, or `null`
 *
 * @example
 * ```ts
 * const payload = buildWorkflowBrowseSelectionPayload({
 *   selectionConfig,
 *   configurationInputs,
 *   selectionsByType,
 * });
 *
 * if (payload) {
 *   const sessionId = persistWorkflowSelectionForConfigure(payload);
 * }
 * ```
 */
export function buildWorkflowBrowseSelectionPayload(
  opts: BuildWorkflowBrowseSelectionPayloadParams
): TWorkflowSelectionPayload | null {
  const { selectionConfig, configurationInputs, selectionsByType } = opts;

  const groups = configurationInputs
    .map((input) => ({
      name: input.label,
      items: (selectionsByType[input.type] ?? []).map(
        (row): TWorkflowSelectionRef => ({
          type: input.type,
          id: row.id,
        })
      ),
    }))
    .filter((group) => group.items.length > 0);

  if (groups.length === 0) {
    return null;
  }

  if (selectionConfig?.selectionMode === WorkflowInitializeSelectionMode.Grouped) {
    return makeGroupedWorkflowSelection(groups);
  }

  const items = groups.flatMap((group) => group.items);

  if (items.length === 0) {
    return null;
  }

  if (
    selectionConfig?.selectionMode === WorkflowInitializeSelectionMode.Single ||
    selectionConfig?.tableSelectionType === TableSelectionType.Radio
  ) {
    return makeSingleWorkflowSelection(items[0]);
  }

  return makeListWorkflowSelection(items);
}

/**
 *  per-entity-type selected row counts for the browse entity-type dropdown badges
 *
 * @param configurationInputs: workflow inputs (defines which types appear in the UI)
 * @param selectionsByType: current parent selection state
 * @returns map of entity type → count (missing types resolve to `0` when read)
 */
export function getWorkflowBrowseSelectionCounts(
  configurationInputs: readonly IWorkflowConfigurationInput[],
  selectionsByType: TWorkflowBrowseSelectionsByType
): Partial<Record<TExtendedEntitiesTypeDict, number>> {
  return configurationInputs.reduce<Partial<Record<TExtendedEntitiesTypeDict, number>>>(
    (counts, input) => {
      counts[input.type] = selectionsByType[input.type]?.length ?? 0;
      return counts;
    },
    {}
  );
}

/**
 * sum of all per-type selection counts (footer "Configure N selected entities")
 *
 * @param selectionCountsByType: output of {@link getWorkflowBrowseSelectionCounts}
 * @returns total number of selected rows across every entity type
 */
export function getWorkflowBrowseTotalSelectedCount(
  selectionCountsByType: Partial<Record<TExtendedEntitiesTypeDict, number>>
): number {
  return Object.values(selectionCountsByType).reduce((sum, count) => sum + (count ?? 0), 0);
}
