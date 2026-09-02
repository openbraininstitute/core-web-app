'use client';

import { atom } from 'jotai';

import { WorkflowSessionSelectionMode } from '@/features/scan-config/workflow/workflow-session-selection';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
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
 * Entities the current workflow points at, for the configure breadcrumb.
 *
 * Written by whoever owns a selection — the browse page on its way to `/configure`, and the
 * in-editor model selectors, which can change it without a navigation. Read by the breadcrumb.
 * Module-scoped (jotai's default store), so it survives the client push from `/new`.
 */
export const workflowBreadcrumbEntitiesAtom = atom<TWorkflowBreadcrumbEntity[]>([]);

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
