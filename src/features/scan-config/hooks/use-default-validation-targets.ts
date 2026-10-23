'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { resolveOptimisationTargetEFeaturesId } from '@/entity-configuration/domain/validation/optimisation-targets';
import { usePublishDefaultLookup } from '@/features/scan-config/bridge/default-lookup-context';
import { isFromIdRef } from '@/features/scan-config/helpers';
import { type Config, SchemaNameDict } from '@/features/scan-config/types';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { Dispatch, SetStateAction } from 'react';
import type { SchemaName } from '@/features/scan-config/types';

const TARGET_BLOCK = 'target_efeatures';
const TARGET_FIELD = 'task_result';
const TASK_RESULT_FROM_ID = 'TaskResultFromID';

/** Path of the target field in the editor, as the field renderer knows it. */
export const VALIDATION_TARGET_FIELD_PATH = `${TARGET_BLOCK}/${TARGET_FIELD}`;

// module constant: keeps the publisher's effect from re-running on every render
const TARGET_LOOKUP_COPY = {
  title: 'Finding target e-features',
  detail: "from this e-model's optimisation",
};

function readRef(config: Config, block: string, field: string) {
  const value = (config[block] as Record<string, unknown> | undefined)?.[field];
  return isFromIdRef(value) ? value : null;
}

/** The default this hook wrote into the field, and the e-model it was looked up for. */
type TApplied = { emodelId: string; targetId: string };

/**
 * What to do with the target field. `defaultTargetId` is `string` when found, `null` when the
 * e-model has none, `undefined` while pending or after a failed lookup.
 *
 * Only a value the hook itself wrote (`applied`) is ever replaced or cleared, and only when the
 * e-model it was written for changed; a user's own pick or a saved value is never touched.
 */
export function decideTarget({
  emodelId,
  currentTargetId,
  applied,
  defaultTargetId,
}: {
  emodelId: string | null;
  currentTargetId: string | null;
  applied: TApplied | null;
  defaultTargetId: string | null | undefined;
}): { type: 'none' } | { type: 'set'; id: string } | { type: 'clear' } {
  const ownsTarget = applied !== null && currentTargetId === applied.targetId;
  if (ownsTarget && applied.emodelId !== emodelId) {
    // never leave the previous e-model's e-features behind
    return emodelId && defaultTargetId ? { type: 'set', id: defaultTargetId } : { type: 'clear' };
  }
  // an empty field is filled once per e-model, so a user who clears it is not fought
  if (!currentTargetId && emodelId && defaultTargetId && applied?.emodelId !== emodelId) {
    return { type: 'set', id: defaultTargetId };
  }
  return { type: 'none' };
}

/**
 * E-model validation: defaults the target e-features to the extraction the picked e-model was
 * optimised on (the notebook's `extraction_task_result_id`).
 *
 * The default is applied while the field is empty, and replaced (or cleared when the new e-model
 * has none) when the e-model changes, but only if the field still holds the value this hook wrote.
 * A value the user picked is never overwritten, and a saved value is not looked up at all.
 * Known limit: the hook cannot tell a saved value from a user's pick, so switching the e-model in
 * a duplicate of a saved workflow keeps its saved target; a user re-picking exactly the applied id
 * is treated as hook-owned.
 *
 * A failed lookup means "no default": the loading pill goes away and the picker is usable, and the
 * field's own validation reports the missing target.
 */
export function useDefaultValidationTargets({
  schemaName,
  config,
  setConfig,
}: {
  schemaName: SchemaName;
  config: Config;
  setConfig: Dispatch<SetStateAction<Config>>;
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const isValidation = schemaName === SchemaNameDict.EModelValidationScanConfig;
  const emodelId = isValidation ? (readRef(config, 'emodel', 'emodel')?.id_str ?? null) : null;
  const currentTargetId = readRef(config, TARGET_BLOCK, TARGET_FIELD)?.id_str ?? null;
  const [applied, setApplied] = useState<TApplied | null>(null);
  const ownsTarget = applied !== null && currentTargetId === applied.targetId;

  // keyed by e-model, so a lookup still in flight for the previous one lands in its own entry
  const { data: defaultTargetId, isLoading } = useQuery({
    queryKey: ['emodel-optimisation-targets', virtualLabId, projectId, emodelId],
    queryFn: () =>
      resolveOptimisationTargetEFeaturesId(emodelId as string, {
        virtualLabId,
        projectId,
      }),
    enabled: Boolean(emodelId) && (!currentTargetId || ownsTarget),
    staleTime: Number.POSITIVE_INFINITY,
    // stated here although the app's client already defaults to it: a failed lookup is "no
    // default" at once, not a pill that outlives three retries
    retry: false,
  });

  usePublishDefaultLookup(VALIDATION_TARGET_FIELD_PATH, isLoading ? TARGET_LOOKUP_COPY : null);

  useEffect(() => {
    const decision = decideTarget({
      emodelId,
      currentTargetId,
      applied,
      defaultTargetId,
    });
    if (decision.type === 'none') return;
    const nextId = decision.type === 'set' ? decision.id : null;
    setConfig((previous) => {
      // a write since this render (the user's own pick) wins
      if ((readRef(previous, TARGET_BLOCK, TARGET_FIELD)?.id_str ?? null) !== currentTargetId) {
        return previous;
      }
      return {
        ...previous,
        [TARGET_BLOCK]: {
          ...(previous[TARGET_BLOCK] as object),
          [TARGET_FIELD]: nextId ? { type: TASK_RESULT_FROM_ID, id_str: nextId } : null,
        },
      } as Config;
    });
    setApplied(nextId && emodelId ? { emodelId, targetId: nextId } : null);
  }, [emodelId, currentTargetId, applied, defaultTargetId, setConfig]);
}
