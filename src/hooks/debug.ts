import React from 'react';

import { logDebug } from '@/utils/logger';

/**
 * Sometime a component is rendering more than it should.
 * This hook will log a message as soon as a property changes.
 * This help track the culprit.
 */
export function useDebugPropHasChanged(label: string, prop: unknown) {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    logDebug('[Changed!] ', label, ':', prop);
  }, [label, prop]);
}
