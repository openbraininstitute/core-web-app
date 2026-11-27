import { render } from '@testing-library/react';
import { useState } from 'react';

import { createScanConfigStore } from '@/features/scan-config/store';
import {
  BlockScopeProvider,
  ScanConfigErrorsProvider,
  ScanConfigStoreProvider,
} from '@/features/scan-config/use-config-store';

import type { ReactElement, ReactNode } from 'react';
import type { ConfigSchema, TBlockState } from '@/features/scan-config/types';

const ANY_OBJECT = { type: 'object' } as unknown as ConfigSchema;

function FormProviders({ children }: { children: ReactNode }) {
  const [store] = useState(() => createScanConfigStore({}));
  return (
    <ScanConfigStoreProvider store={store}>
      <ScanConfigErrorsProvider schema={ANY_OBJECT}>{children}</ScanConfigErrorsProvider>
    </ScanConfigStoreProvider>
  );
}

/** Renders a field inside an empty form, for fields that read or report through the form's store. */
export const renderInForm = (ui: ReactElement) => render(ui, { wrapper: FormProviders });

/** Renders a `Block` (or a field) over one root block of a store, and gives the store back. */
export function renderInBlock(ui: ReactElement, rootElement: string, state: TBlockState) {
  const store = createScanConfigStore({ [rootElement]: state });
  const view = render(
    <ScanConfigStoreProvider store={store}>
      <ScanConfigErrorsProvider schema={ANY_OBJECT}>
        <BlockScopeProvider rootElement={rootElement}>{ui}</BlockScopeProvider>
      </ScanConfigErrorsProvider>
    </ScanConfigStoreProvider>
  );

  return { ...view, store };
}
