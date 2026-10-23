'use client';

import { atom } from 'jotai';

import { resolveEntityFetchTarget } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/helpers';
import { WorkflowSessionSelectionMode } from '@/features/scan-config/workflow/workflow-session-selection';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TFromIdRef } from '@/features/scan-config/helpers';
import type { TWorkflowSessionSelectionPayload } from '@/features/scan-config/workflow/workflow-session-selection';

export type TWorkflowBreadcrumbEntity = {
  /** stable across renders — `${type}:${id}` where a ref exists */
  key: string;
  id: string;
  type: TExtendedEntitiesTypeDict;
  /** null when the source knew the id but not the name; resolved by id downstream */
  name: string | null;
};

/**
 * Entity refs of the mounted scan-config editor's live config, for the configure breadcrumb.
 *
 * Single writer: the template, which owns the config (see `resolveWorkflowEntityRefs`), and
 * resets it to `null` on unmount. `null` = no editor mounted (the breadcrumb falls back to the
 * session / campaign); `[]` = the editor holds no entity, which clears the crumb.
 */
export const workflowBreadcrumbRefsAtom = atom<TFromIdRef[] | null>(null);

/** Config refs as breadcrumb entities; refs of unknown kinds are dropped. Names come later. */
export function workflowBreadcrumbEntitiesFromRefs(
  refs: readonly TFromIdRef[]
): TWorkflowBreadcrumbEntity[] {
  return refs.flatMap((ref) => {
    const target = resolveEntityFetchTarget(ref);
    return target
      ? [
          {
            key: `${target.entityType}:${target.id}`,
            id: target.id,
            type: target.entityType,
            name: null,
          },
        ]
      : [];
  });
}

/**
 * Named entities a selection payload points at, in pick order. A ref stored before names were
 * recorded keeps its id with a null name rather than being dropped.
 */
export function workflowBreadcrumbEntitiesFromSelection(
  selection: TWorkflowSessionSelectionPayload | null | undefined
): TWorkflowBreadcrumbEntity[] {
  if (!selection) return [];

  const refs =
    selection.mode === WorkflowSessionSelectionMode.Single
      ? [selection.item]
      : selection.mode === WorkflowSessionSelectionMode.List
        ? selection.items
        : selection.groups.flatMap((group) => group.items);

  return refs.map((ref) => ({
    key: `${ref.type}:${ref.id}`,
    id: ref.id,
    type: ref.type as TExtendedEntitiesTypeDict,
    name: ref.name?.trim() || null,
  }));
}
