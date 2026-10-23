'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { resolveOptimisationTargetEFeaturesId } from '@/entity-configuration/domain/validation/optimisation-targets';
import { isFromIdRef } from '@/features/scan-config/helpers';
import { type Config, SchemaNameDict } from '@/features/scan-config/types';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { Dispatch, SetStateAction } from 'react';
import type { SchemaName } from '@/features/scan-config/types';

const TARGET_BLOCK = 'target_efeatures';
const TARGET_FIELD = 'task_result';
const TASK_RESULT_FROM_ID = 'TaskResultFromID';

function readRef(config: Config, block: string, field: string) {
  const value = (config[block] as Record<string, unknown> | undefined)?.[field];
  return isFromIdRef(value) ? value : null;
}

/**
 * E-model validation: once an e-model is picked, default the target e-features to the extraction
 * the e-model was optimised on (the notebook's `extraction_task_result_id`). Applied once per
 * picked e-model and only while the field is empty, so a user's own choice is never overwritten.
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
  const hasTarget = Boolean(readRef(config, TARGET_BLOCK, TARGET_FIELD));

  const { data: targetId } = useQuery({
    queryKey: ['emodel-optimisation-targets', virtualLabId, projectId, emodelId],
    queryFn: () =>
      resolveOptimisationTargetEFeaturesId(emodelId as string, { virtualLabId, projectId }),
    enabled: Boolean(emodelId) && !hasTarget,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const appliedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!emodelId || !targetId || hasTarget || appliedFor.current === emodelId) return;
    appliedFor.current = emodelId;
    setConfig(
      (previous) =>
        ({
          ...previous,
          [TARGET_BLOCK]: {
            ...(previous[TARGET_BLOCK] as object),
            [TARGET_FIELD]: { type: TASK_RESULT_FROM_ID, id_str: targetId },
          },
        }) as Config
    );
  }, [emodelId, targetId, hasTarget, setConfig]);
}
