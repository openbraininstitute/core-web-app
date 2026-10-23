'use client';

import { useQuery } from '@tanstack/react-query';
import { get } from 'es-toolkit/compat';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { checkSingleNeuronCompatibility } from '@/api/small-scale-simulator';
import { retrieveEntity } from '@/entity-configuration/domain/requests';
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

  const { data: emodelName } = useQuery({
    queryKey: keyBuilder.entity({
      context: { virtualLabId, projectId },
      id: emodelId ?? '',
      type: ExtendedEntitiesTypeDict.Emodel,
    }),
    queryFn: () =>
      retrieveEntity({
        type: ExtendedEntitiesTypeDict.Emodel,
        // biome-ignore lint/style/noNonNullAssertion: Guaranteed by enabled
        id: emodelId!,
        ctx: { virtualLabId, projectId },
      }),
    select: (emodel) => get(emodel, 'name') as string | undefined,
    enabled: !!emodelId,
    staleTime: Infinity,
  });

  const compatibility = deriveCompatibilityState(selectionComplete, compatibilityCheck, emodelName);
  const blockingMessage = selectionComplete ? BLOCKING_MESSAGE[compatibility.kind] : undefined;

  useFieldError(`${INPUTS_BLOCK}.compatibility`, blockingMessage);

  return <CompatibilityNotice state={compatibility} onRetry={() => compatibilityCheck.refetch()} />;
}
