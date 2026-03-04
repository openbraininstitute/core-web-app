import $RefParser, { type JSONSchema } from '@apidevtools/json-schema-ref-parser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { get } from 'es-toolkit/compat';
import { atomFamily, atomWithStorage } from 'jotai/utils';

import { config } from '@/config';
import { makeSessionAtomWithDefault } from '@/ui/hooks/use-session-atom';
import { createSuperJsonStorage, safeStorage } from '@/ui/hooks/use-storage-atom-with-validation';
import {
  GenerationWorkflowFormPanelKeys,
  type TGenerationWorkflowFormPanelKeys,
} from '@/ui/segments/workflows/build/ion-channel-build/elements/panel-tabs';
import { normalizePrefixItems } from '@/ui/segments/workflows/build/ion-channel-build/rjsf/helpers';
import { keyBuilder } from '@/ui/use-query-keys/third-parties';

import type { RJSFSchema } from '@rjsf/utils';
import type { IIonChannelRecording } from '@/api/entitycore/types/entities/ion-channel-recording';

export const ORIGINAL_CAMPAIGN_ID_QUERY = 'original-campaign-id';

export async function dereferenceOpenApiSchema({ json, form }: { form?: string; json: any }) {
  const dereferenceObj = (await $RefParser.dereference(json)) as OpenApiSchema;
  const schema = get(dereferenceObj.components.schemas, `${form}`, null) as JSONSchema;
  return normalizePrefixItems(schema);
}

type OpenApiSchema = {
  components: {
    schemas: JSONSchema;
    securitySchemes: any;
  };
};

export function useGenerativeFormSchemaApi({
  form,
  patchSchema,
}: {
  form: string;
  patchSchema?: (schema: RJSFSchema) => RJSFSchema;
}) {
  const queryClient = useQueryClient();
  // this way we ensure the openapi schema is stored in the cache separately
  // and also cache the schema of interest dereferenced based on the form property
  return useQuery<RJSFSchema>({
    queryKey: keyBuilder.obioneOpenapiSchema({ form }),
    queryFn: async () => {
      const json = await queryClient.ensureQueryData<RJSFSchema>({
        queryKey: keyBuilder.obioneOpenapi(),
        queryFn: async () => {
          const response = await fetch(`${config.OBI_ONE_URL}/openapi.json`);
          const result = await response.json();
          return result;
        },
      });
      const schema = (await dereferenceOpenApiSchema({ json, form })) as RJSFSchema;
      return patchSchema?.(schema) ?? schema;
    },
  });
}

export const IonChannelModelingSharedStateFamily = makeSessionAtomWithDefault<{
  schema: RJSFSchema | undefined;
  panel: TGenerationWorkflowFormPanelKeys;
  currentConfigId?: string | null;
  buildRequested?: boolean;
  campaignId?: string | null;
}>({
  schema: undefined,
  currentConfigId: null,
  panel: GenerationWorkflowFormPanelKeys.configuration,
  buildRequested: false,
  campaignId: null,
});

export const CONFIGURATION_FORM_STATE_KEY = 'form';
export const CONFIGURATION_RECORDING_STATE_KEY = 'recording';

export const IonChannelRecordingAtomFamily = atomFamily((key: string) =>
  atomWithStorage<IIonChannelRecording | null>(
    key,
    null,
    createSuperJsonStorage<IIonChannelRecording | null>(safeStorage),
    {
      getOnInit: true,
    }
  )
);

export const GenerativeFromAtomFamily = atomFamily((key: string) =>
  atomWithStorage<Record<string, any>>(
    key,
    {},
    createSuperJsonStorage<Record<string, any>>(safeStorage),
    {
      getOnInit: true,
    }
  )
);
