'use client';

import { useQuery } from '@tanstack/react-query';
import { get } from 'es-toolkit/compat';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { checkSingleNeuronCompatibility } from '@/api/small-scale-simulator';
import { retrieveEntity } from '@/entity-configuration/domain/requests';
import { useFieldError } from '@/features/scan-config/components/hooks/field-errors';
import { extractConfigValueId } from '@/features/scan-config/helpers';
import { type Config, type SchemaName, SchemaNameDict } from '@/features/scan-config/types';
import { messages } from '@/i18n/en/me-model';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';

import { CompatibilityNotice } from './compatibility-notice';
import { type CompatibilityState, deriveCompatibilityState } from './compatibility-state';

export const MEMODEL_INPUTS_BLOCK = 'initialize';

export function checksMEModelCompatibility(editor: { readOnly?: boolean; schemaName: SchemaName }) {
  return !editor.readOnly && editor.schemaName === SchemaNameDict.MEModelBuildScanConfig;
}

const BLOCKING_MESSAGE: Record<CompatibilityState['kind'], string | undefined> = {
  idle: messages.CheckingCompatibility,
  checking: messages.CheckingCompatibility,
  compatible: undefined,
  incompatible: messages.IncompatibleModels,
  check_failed: messages.CompatibilityBlockedTooltip,
};

// both callers share the queries, so the pair is checked once
function useMEModelCompatibility(config: Config) {
  const { virtualLabId, projectId } = useWorkspace();
  const morphologyId = extractConfigValueId(get(config, `${MEMODEL_INPUTS_BLOCK}.morphology`));
  const emodelId = extractConfigValueId(get(config, `${MEMODEL_INPUTS_BLOCK}.emodel`));
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

  const emodelName = useQuery({
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

  // the name decides the unbuildable block, so wait for it, but a failed lookup falls back to the
  // simulator's answer
  const compatibility = deriveCompatibilityState(
    selectionComplete,
    {
      isFetching: compatibilityCheck.isFetching || emodelName.isLoading,
      isError: compatibilityCheck.isError,
      data: compatibilityCheck.data,
    },
    emodelName.data
  );

  return {
    selectionComplete,
    compatibility,
    retry: () => compatibilityCheck.refetch(),
  };
}

/**
 * Blocks Generate until the picked morphology and e-model are compatible. Mounted for the whole
 * editor so the block holds on every tab; the result shows under the pickers.
 */
export function MEModelCompatibilityCheck({ config }: { config: Config }) {
  const { selectionComplete, compatibility } = useMEModelCompatibility(config);
  const blockingMessage = selectionComplete ? BLOCKING_MESSAGE[compatibility.kind] : undefined;

  useFieldError(`${MEMODEL_INPUTS_BLOCK}.compatibility`, blockingMessage);

  return null;
}

export function MEModelCompatibilityResult({ config }: { config: Config }) {
  const { compatibility, retry } = useMEModelCompatibility(config);
  return <CompatibilityNotice state={compatibility} onRetry={retry} className="pt-6 pb-4" />;
}
