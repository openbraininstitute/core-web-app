import superjson from 'superjson';
import { z } from 'zod';

import { createWorkflowSessionId } from '@/features/scan-config/workflow/session';
import { findInitializeModelProperty } from '@/features/scan-config/workflow/workflow-schema-selection';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { Config, ConfigSchema, ConfigValue } from '@/features/scan-config/types';

export const WorkflowSessionSelectionMode = {
  Single: 'single',
  List: 'list',
  Grouped: 'grouped',
} as const;

export type TWorkflowSessionSelectionRef = {
  type: TExtendedEntitiesTypeDict;
  id: string;
};

const workflowSessionSelectionRefSchema = z.object({
  type: z.string(),
  id: z.string(),
});

/**
 * a browse prerequisite (e.g. EM dense reconstruction dataset) that scoped the selection.
 * kept minimal — only what a loader needs (`id`/`type`) plus `name` for display.
 */
const workflowSessionPrerequisiteSchema = z.object({
  type: z.string(),
  id: z.string(),
  name: z.string().optional(),
});

export type TWorkflowSessionPrerequisite = z.infer<typeof workflowSessionPrerequisiteSchema>;

/**
 * prerequisites keyed by entity type — the configure page looks one up directly for the type
 * being browsed and rebuilds the same dataset-filtered loader used on /new. without it the
 * browse falls back to the unfiltered base query. a record (not a single value) so each
 * configuration input can carry its own prerequisite (shared inputs just repeat the value).
 */
export type TWorkflowSessionPrerequisites = Record<string, TWorkflowSessionPrerequisite>;

const workflowSessionSelectionPayloadSchema = z
  .discriminatedUnion('mode', [
    z.object({
      mode: z.literal(WorkflowSessionSelectionMode.Single),
      item: workflowSessionSelectionRefSchema,
    }),
    z.object({
      mode: z.literal(WorkflowSessionSelectionMode.List),
      items: z.array(workflowSessionSelectionRefSchema).min(1),
    }),
    z.object({
      mode: z.literal(WorkflowSessionSelectionMode.Grouped),
      groups: z
        .array(
          z.object({
            name: z.string().optional(),
            items: z.array(workflowSessionSelectionRefSchema).min(1),
          })
        )
        .min(1),
    }),
  ])
  .and(
    z.object({ prerequisites: z.record(z.string(), workflowSessionPrerequisiteSchema).optional() })
  );

export type TWorkflowSessionSelectionPayload = z.infer<
  typeof workflowSessionSelectionPayloadSchema
>;

function parseWorkflowSessionSelectionPayload(
  value: unknown
): TWorkflowSessionSelectionPayload | null {
  const parsed = workflowSessionSelectionPayloadSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

export function readWorkflowSessionSelection(
  sessionId: string
): TWorkflowSessionSelectionPayload | null {
  const storage = getSessionStorage();
  if (!storage) return null;

  const raw = storage.getItem(sessionId);
  if (!raw) return null;

  try {
    const value = superjson.parse<unknown>(raw);
    return parseWorkflowSessionSelectionPayload(value);
  } catch {
    return null;
  }
}

function writeWorkflowSessionSelection(
  sessionId: string,
  payload: TWorkflowSessionSelectionPayload
): void {
  const storage = getSessionStorage();
  if (!storage) return;
  storage.setItem(sessionId, superjson.stringify(payload));
}

/** Persists a selection payload and returns the session id used as the storage key. */
export function saveWorkflowSessionSelection(
  payload: TWorkflowSessionSelectionPayload,
  sessionId: string = createWorkflowSessionId()
): string {
  writeWorkflowSessionSelection(sessionId, payload);
  return sessionId;
}

function selectionRefToFromIdValue(
  ref: TWorkflowSessionSelectionRef,
  resolveFromIdType: (browseType: TExtendedEntitiesTypeDict) => string | undefined
): ConfigValue {
  const fromIdType = resolveFromIdType(ref.type);
  if (!fromIdType) {
    throw new Error(`No scan-config FromID type for entity type "${ref.type}"`);
  }

  return {
    type: fromIdType,
    id_str: ref.id,
  };
}

function collectSessionSelectionRefs(
  sessionSelection: TWorkflowSessionSelectionPayload
): TWorkflowSessionSelectionRef[] {
  switch (sessionSelection.mode) {
    case WorkflowSessionSelectionMode.Single:
      return [sessionSelection.item as TWorkflowSessionSelectionRef];
    case WorkflowSessionSelectionMode.List:
      return sessionSelection.items as TWorkflowSessionSelectionRef[];
    case WorkflowSessionSelectionMode.Grouped:
      return sessionSelection.groups.flatMap(
        (group) => group.items as TWorkflowSessionSelectionRef[]
      );
    default:
      return [];
  }
}

export function resolvePrimarySessionEntityId(
  sessionSelection: TWorkflowSessionSelectionPayload,
  browseType: TExtendedEntitiesTypeDict
): string | undefined {
  const refs = collectSessionSelectionRefs(sessionSelection);
  const matchedRef = refs.find((ref) => ref.type === browseType) ?? refs[0];
  return matchedRef?.id;
}

function buildModelValueFromSessionSelection(opts: {
  sessionSelection: TWorkflowSessionSelectionPayload;
  resolveFromIdType: (browseType: TExtendedEntitiesTypeDict) => string | undefined;
}): ConfigValue | null {
  switch (opts.sessionSelection.mode) {
    case WorkflowSessionSelectionMode.Single:
      return selectionRefToFromIdValue(
        opts.sessionSelection.item as TWorkflowSessionSelectionRef,
        opts.resolveFromIdType
      );
    case WorkflowSessionSelectionMode.List:
      return opts.sessionSelection.items.map((item) =>
        selectionRefToFromIdValue(item as TWorkflowSessionSelectionRef, opts.resolveFromIdType)
      ) as ConfigValue;
    case WorkflowSessionSelectionMode.Grouped:
      return opts.sessionSelection.groups.map((group) => ({
        name: group.name ?? 'Default name',
        elements: group.items.map((item) =>
          selectionRefToFromIdValue(item as TWorkflowSessionSelectionRef, opts.resolveFromIdType)
        ),
      })) as unknown as ConfigValue;
    default:
      return null;
  }
}

/** Overwrites only the schema's initialize model field with browse session selection. */
export function applyWorkflowSessionSelectionPatch(opts: {
  config: Config;
  schema: ConfigSchema;
  sessionSelection: TWorkflowSessionSelectionPayload;
  resolveFromIdType: (browseType: TExtendedEntitiesTypeDict) => string | undefined;
}): Config {
  const modelProperty = findInitializeModelProperty(opts.schema);
  if (!modelProperty) {
    return opts.config;
  }

  const modelValue = buildModelValueFromSessionSelection({
    sessionSelection: opts.sessionSelection,
    resolveFromIdType: opts.resolveFromIdType,
  });
  if (modelValue === null) {
    return opts.config;
  }

  const initialize = opts.config.initialize;
  if (!initialize || typeof initialize !== 'object' || Array.isArray(initialize)) {
    return opts.config;
  }

  return {
    ...opts.config,
    initialize: {
      ...initialize,
      [modelProperty.key]: modelValue,
    } as Config['initialize'],
  };
}
