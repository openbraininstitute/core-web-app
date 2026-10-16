'use client';

import { useQuery } from '@tanstack/react-query';

import { checkSingleNeuronCompatibility } from '@/api/small-scale-simulator';
import { useFieldError } from '@/features/scan-config/components/hooks/field-errors';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { isFromIdRef } from '@/features/scan-config/helpers';
import { messages } from '@/i18n/en/me-model';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';

import { CompatibilityNotice } from './compatibility-notice';
import { type CompatibilityState, deriveCompatibilityState } from './compatibility-state';

import type { Config } from '@/features/scan-config/types';

const INPUTS_BLOCK = 'initialize';

const BLOCKING_MESSAGE: Partial<Record<CompatibilityState['kind'], string>> = {
  checking: messages.CheckingCompatibility,
  incompatible: messages.IncompatibleModels,
  check_failed: messages.CompatibilityBlockedTooltip,
};

function selectedId(block: unknown, key: string): string | undefined {
  if (!isPlainObject(block)) return undefined;
  const ref = block[key];
  return isFromIdRef(ref) ? ref.id_str : undefined;
}

/**
 * Checks the picked morphology and e-model with the small-scale simulator, and blocks Generate
 * until they are compatible. Mounted for the whole editor, not under the pickers, so the block
 * holds on every tab.
 */
export function MEModelCompatibilityCheck({ config }: { config: Config }) {
  const { virtualLabId, projectId } = useWorkspace();
  const morphologyId = selectedId(config[INPUTS_BLOCK], 'morphology');
  const emodelId = selectedId(config[INPUTS_BLOCK], 'emodel');
  const selectionComplete = !!morphologyId && !!emodelId;

  const compatibilityCheck = useQuery({
    queryKey: keyBuilder.meModelCompatibility({
      virtualLabId,
      projectId,
      morphologyId: morphologyId ?? '',
      emodelId: emodelId ?? '',
    }),
    queryFn: ({ signal }) =>
      checkSingleNeuronCompatibility({
        ctx: { virtualLabId, projectId },
        // biome-ignore lint/style/noNonNullAssertion: Guaranteed by selectionComplete
        morphologyId: morphologyId!,
        // biome-ignore lint/style/noNonNullAssertion: Guaranteed by selectionComplete
        emodelId: emodelId!,
        signal,
      }),
    enabled: selectionComplete,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const compatibility = deriveCompatibilityState(selectionComplete, compatibilityCheck);
  // `idle` can briefly occur with a complete selection, so only `compatible` lets it through
  const blockingMessage =
    selectionComplete && compatibility.kind !== 'compatible'
      ? (BLOCKING_MESSAGE[compatibility.kind] ?? messages.CheckingCompatibility)
      : undefined;

  useFieldError(`${INPUTS_BLOCK}.compatibility`, blockingMessage);

  return <CompatibilityNotice state={compatibility} onRetry={() => compatibilityCheck.refetch()} />;
}
