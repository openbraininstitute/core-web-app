'use client';

import { useQuery } from '@tanstack/react-query';
import { get } from 'es-toolkit/compat';

import { checkSingleNeuronCompatibility } from '@/api/small-scale-simulator';
import { useFieldError } from '@/features/scan-config/components/hooks/field-errors';
import { extractConfigValueId } from '@/features/scan-config/helpers';
import { messages } from '@/i18n/en/me-model';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';

import { CompatibilityNotice } from './compatibility-notice';
import { type CompatibilityState, deriveCompatibilityState } from './compatibility-state';

import type { Config } from '@/features/scan-config/types';

const INPUTS_BLOCK = 'initialize';

const BLOCKING_MESSAGE: Record<CompatibilityState['kind'], string | undefined> = {
  idle: messages.CheckingCompatibility,
  checking: messages.CheckingCompatibility,
  compatible: undefined,
  incompatible: messages.IncompatibleModels,
  check_failed: messages.CompatibilityBlockedTooltip,
};

/**
 * Checks the picked morphology and e-model with the small-scale simulator, and blocks Generate
 * until they are compatible. Mounted for the whole editor, not under the pickers, so the block
 * holds on every tab.
 */
export function MEModelCompatibilityCheck({ config }: { config: Config }) {
  const { virtualLabId, projectId } = useWorkspace();
  const morphologyId = extractConfigValueId(get(config, `${INPUTS_BLOCK}.morphology`));
  const emodelId = extractConfigValueId(get(config, `${INPUTS_BLOCK}.emodel`));
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
  const blockingMessage = selectionComplete ? BLOCKING_MESSAGE[compatibility.kind] : undefined;

  useFieldError(`${INPUTS_BLOCK}.compatibility`, blockingMessage);

  return <CompatibilityNotice state={compatibility} onRetry={() => compatibilityCheck.refetch()} />;
}
