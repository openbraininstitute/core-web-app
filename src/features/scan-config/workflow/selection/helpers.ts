/**
 * session id generation and persistence helpers for workflow configure navigation
 *
 * callers persist a `TWorkflowSelectionPayload` under a session id, then
 * use that id as the final segment of the configure URL. The configure page reads
 * the same payload back from sessionStorage
 */

import { customAlphabet } from 'nanoid';
import React from 'react';

import { SCAN_CONFIG_ORIGIN_ID_SEARCH_PARAM } from '@/features/scan-config/workflow/constants';
import { writeWorkflowSelection } from '@/features/scan-config/workflow/selection/storage';
import {
  makeGroupedWorkflowSelection,
  makeListWorkflowSelection,
  makeSingleWorkflowSelection,
} from '@/features/scan-config/workflow/selection/types';

import {
  WORKFLOW_SELECTION_STORAGE_PREFIX,
  WORKFLOW_SESSION_ID_ALPHABET,
  WORKFLOW_SESSION_ID_LENGTH,
} from '../constants';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type {
  TWorkflowSelectionPayload,
  TWorkflowSelectionRef,
} from '@/features/scan-config/workflow/selection/types';

/** sessionStorage key for a workflow selection session. */
export function workflowSelectionStorageKey(sessionId: string): string {
  return `${WORKFLOW_SELECTION_STORAGE_PREFIX}${sessionId}`;
}

const createSessionId = customAlphabet(WORKFLOW_SESSION_ID_ALPHABET, WORKFLOW_SESSION_ID_LENGTH);
const WORKFLOW_SESSION_ID_PREFIX = 'wf_' as const;

/** create a session id for a new configure navigation */
export function createWorkflowSessionId(): string {
  return `${WORKFLOW_SESSION_ID_PREFIX}${createSessionId()}`;
}

/**
 * If there is no sessionId in the parameters,
 * we create a random one that stay stable between re-renders.
 */
export function useWorkflowSessionId(sessionId: string | undefined) {
  const refSessionId = React.useRef<string | null>(null);
  if (!refSessionId.current) refSessionId.current = createWorkflowSessionId();
  return sessionId ?? refSessionId.current;
}

/**
 * persist a single-entity selection and return the configure path segment id
 *
 * @returns new session id to append as the final configure URL segment
 */
export function persistSingleSelectionForConfigure(ref: TWorkflowSelectionRef): string {
  const sessionId = createWorkflowSessionId();
  writeWorkflowSelection(sessionId, makeSingleWorkflowSelection(ref));
  return sessionId;
}

/**
 * persist an arbitrary selection payload and return the configure path segment id
 *
 * @returns new session id to append as the final configure URL segment
 */
export function persistWorkflowSelectionForConfigure(payload: TWorkflowSelectionPayload): string {
  const sessionId = createWorkflowSessionId();
  writeWorkflowSelection(sessionId, payload);
  return sessionId;
}

/** persist a flat list selection and return the configure path segment id */
export function persistListSelectionForConfigure(items: TWorkflowSelectionRef[]): string {
  return persistWorkflowSelectionForConfigure(makeListWorkflowSelection(items));
}

/** persist a grouped selection and return the configure path segment id */
export function persistGroupedSelectionForConfigure(
  groups: Array<{ name?: string; items: TWorkflowSelectionRef[] }>
): string {
  return persistWorkflowSelectionForConfigure(makeGroupedWorkflowSelection(groups));
}

/**
 * replace the final pathname segment with a new session id
 *
 * @example
 * replaceConfigurePathId('/workflows/simulate/configure/abc', 'xyz') // '/workflows/simulate/configure/xyz'
 */
export function replaceConfigurePathId(pathname: string, sessionId: string): string {
  const segments = pathname.split('/');
  if (segments.length === 0) {
    return sessionId;
  }
  segments[segments.length - 1] = sessionId;
  return segments.join('/');
}

/**
 * build a "configure" href for one entity, persisting selection in sessionStorage
 *
 * writes `{ type, id }` under a new session id, then returns
 * `{configurePathPrefix}/{sessionId}` with optional query parameters
 *
 * @param configurePathPrefix - Path through `/configure/.../` without the final id segment.
 * @param entityType - Extended entity type for the configure target.
 * @param entityId - Entity id to load on the configure page.
 * @param query - Optional search params (e.g. `dataType` for simulate workflows).
 * @returns Path including generated session id and non-empty query string.
 *
 * @example
 * ```ts
 * import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
 * import { buildScanConfigConfigureHref } from '@/features/scan-config/workflow/selection';
 *
 * const href = buildScanConfigConfigureHref({
 *   configurePathPrefix: `${workflowBase}/process/configure/em-cell-mesh`,
 *   entityType: ExtendedEntitiesTypeDict.EMCellMesh,
 *   entityId: emCellMeshId,
 * });
 * // `${workflowBase}/process/configure/em-cell-mesh/k3m9_x2a1`
 * router.push(href);
 * ```
 *
 * @example Link with extra query parameters
 * ```ts
 * const href = buildScanConfigConfigureHref({
 *   configurePathPrefix: `${workflowBase}/simulate/configure/circuit`,
 *   entityType: ExtendedEntitiesTypeDict.MemodelCircuit,
 *   entityId: circuitId,
 *   query: { dataType: ExtendedEntitiesTypeDict.MemodelCircuit },
 * });
 * // `.../configure/circuit/k3m9_x2a1?dataType=me_model_circuit`
 * ```
 */
export function buildScanConfigConfigureHref({
  configurePathPrefix,
  entityType,
  entityId,
  query = {},
}: {
  configurePathPrefix: string;
  entityType: TExtendedEntitiesTypeDict;
  entityId: string;
  query?: Record<string, string | undefined>;
}): string {
  const sessionId = persistSingleSelectionForConfigure({ type: entityType, id: entityId });
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params.set(key, value);
    }
  }

  const queryString = params.toString();
  return `${configurePathPrefix}/${sessionId}${queryString ? `?${queryString}` : ''}`;
}

/**
 * Like {@link buildScanConfigConfigureHref}, but always sets `originId` in the query string
 */
export function buildScanConfigConfigureHrefWithOrigin({
  configurePathPrefix,
  entityType,
  entityId,
  originId,
  query = {},
}: {
  configurePathPrefix: string;
  entityType: TExtendedEntitiesTypeDict;
  entityId: string;
  /** campaign or parent entity id stored as `originId` for configure back-navigation */
  originId: string;
  query?: Record<string, string | undefined>;
}): string {
  return buildScanConfigConfigureHref({
    configurePathPrefix,
    entityType,
    entityId,
    query: {
      ...query,
      [SCAN_CONFIG_ORIGIN_ID_SEARCH_PARAM]: originId,
    },
  });
}
