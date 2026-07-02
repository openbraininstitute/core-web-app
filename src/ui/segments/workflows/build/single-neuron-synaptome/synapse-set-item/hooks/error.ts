import findIndex from 'es-toolkit/compat/findIndex';

import { notify } from '@/components/notification';
import { messages } from '@/i18n/en/synaptome';

import type { SessionValue } from '../types';

export function useErrorHandler(configId: string | undefined, sessionValue: SessionValue) {
  return async (response?: Error) => {
    const index =
      findIndex(
        Array.from(sessionValue?.synapseSets?.entries() ?? []),
        ([key]) => key === configId
      ) + 1;
    if (!response) {
      notify.error({
        title: 'Synapse generation failed',
        description: messages.GenerationSynapsesFailed.replace('$$', index.toString()),
      });
      return;
    }

    try {
      notify.error({
        title: 'Synapse generation failed',
        description: 'Failed to generate synapses. The error occurred on the server.',
      });
    } catch {
      notify.error({
        title: 'Synapse generation failed',
        description: messages.GenerationSynapsesFailed.replace('$$', index.toString()),
      });
    }
  };
}
