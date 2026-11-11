import { act, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { describe, expect, it, vi } from 'vitest';

import { ScanConfigContainer } from '@/features/scan-config/container';
import {
  DownloadPanel,
  downloadPanelCircuitAtom,
} from '@/ui/segments/explore/circuit/elements/download-panel';

import { makeCircuit } from '../mini-detail-view/fixtures';

import type { ScanConfigContainerProps } from '@/features/scan-config/container';

vi.mock('@/features/scan-config/components/hooks/use-scan-configuration', () => ({
  useScanConfiguration: () => ({
    isLoading: false,
    error: null,
    unresolvedMessage: null,
    ready: {},
  }),
}));

vi.mock('@/features/scan-config/template', () => ({
  ScanConfigTemplate: () => null,
}));

vi.mock('@/ui/segments/explore/circuit/elements/download-panel/entire-circuit-export', () => ({
  default: () => null,
}));
vi.mock('@/ui/segments/explore/circuit/elements/download-panel/connectivity-matrices', () => ({
  default: () => null,
}));
vi.mock('@/ui/segments/explore/circuit/elements/download-panel/network-morphology-config', () => ({
  default: () => null,
}));
vi.mock('@/ui/segments/explore/circuit/elements/download-panel/components-config', () => ({
  default: () => null,
}));

describe('ScanConfigContainer circuit download', () => {
  it('mounts the circuit download panel', () => {
    const store = createStore();
    store.set(downloadPanelCircuitAtom, makeCircuit());

    render(
      <Provider store={store}>
        <ScanConfigContainer {...({} as ScanConfigContainerProps)} />
      </Provider>
    );

    expect(screen.getByTestId('circuit-download-panel')).toBeInTheDocument();
  });

  it('does not reopen a panel left open on the previous page', () => {
    const store = createStore();
    const previousPage = render(
      <Provider store={store}>
        <DownloadPanel />
      </Provider>
    );
    act(() => store.set(downloadPanelCircuitAtom, makeCircuit()));
    previousPage.unmount();

    render(
      <Provider store={store}>
        <ScanConfigContainer {...({} as ScanConfigContainerProps)} />
      </Provider>
    );

    expect(screen.queryByTestId('circuit-download-panel')).not.toBeInTheDocument();
  });
});
