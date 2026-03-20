import findIndex from 'es-toolkit/compat/findIndex';

import { useAppNotification } from '@/components/notification';
import { messages } from '@/i18n/en/synaptome';

import type { SessionValue } from '../types';

export function useErrorHandler(configId: string | undefined, sessionValue: SessionValue) {
  const notification = useAppNotification();

  return async (response?: Error) => {
    const index =
      findIndex(
        Array.from(sessionValue?.synapseSets?.entries() ?? []),
        ([key]) => key === configId
      ) + 1;
    if (!response) {
      notification.error({
        message: messages.GenerationSynapsesFailed.replace('$$', index.toString()),
        placement: 'topRight',
      });
      return;
    }

    try {
      notification.error({
        message: 'Failed to generate synapses, The error occurred in the server',
        placement: 'topRight',
      });
    } catch {
      notification.error({
        message: messages.GenerationSynapsesFailed.replace('$$', index.toString()),
        placement: 'topRight',
      });
    }
  };
}
