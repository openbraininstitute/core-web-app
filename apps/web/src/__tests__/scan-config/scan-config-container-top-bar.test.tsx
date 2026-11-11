import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ScanConfigTopBarProvider } from '@/features/scan-config/components/top-bar/context';
import { ScanConfigContainer } from '@/features/scan-config/container';

import type { ScanConfigContainerProps } from '@/features/scan-config/container';

const state = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
}));

vi.mock('@/features/scan-config/components/hooks/use-scan-configuration', () => ({
  useScanConfiguration: () => state.value,
}));
vi.mock('@/features/scan-config/template', () => ({ ScanConfigTemplate: () => null }));
vi.mock('@/ui/segments/explore/circuit/elements/download-panel', () => ({
  DownloadPanel: () => null,
}));

const base = { isLoading: false, error: null, unresolvedMessage: null, ready: null };

function renderContainer() {
  return render(
    <ScanConfigTopBarProvider start={<span>crumbs</span>}>
      <ScanConfigContainer {...({ activity: 'simulate' } as ScanConfigContainerProps)} />
    </ScanConfigTopBarProvider>
  );
}

describe('ScanConfigContainer top bar in non-ready states', () => {
  it.each([
    ['loading', { ...base, isLoading: true }],
    ['error', { ...base, error: new Error('boom') }],
    ['unresolved', { ...base, unresolvedMessage: 'nothing here' }],
    ['not ready', base],
  ])('keeps the host breadcrumb while %s', (_name, value) => {
    state.value = value;
    renderContainer();
    expect(screen.getByText('crumbs')).toBeInTheDocument();
  });

  it('still shows the message next to the breadcrumb on error', () => {
    state.value = { ...base, error: new Error('boom') };
    renderContainer();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });
});
