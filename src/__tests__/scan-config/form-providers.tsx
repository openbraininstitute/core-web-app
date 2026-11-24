import { render } from '@testing-library/react';
import { useState } from 'react';

import { createScanConfigStore } from '@/features/scan-config/store';
import {
  ScanConfigErrorsProvider,
  ScanConfigStoreProvider,
} from '@/features/scan-config/use-config-store';

import type { ReactElement, ReactNode } from 'react';
import type { ConfigSchema } from '@/features/scan-config/types';

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
