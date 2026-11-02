import { render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ScanConfigTabsPanel from '@/features/scan-config/components/tabs';
import {
  ScanConfigTopBar,
  ScanConfigTopBarProvider,
  useScanConfigTopBarSlots,
} from '@/features/scan-config/components/top-bar/context';

describe('scan config top bar slots', () => {
  it('is empty outside a provider', () => {
    const { result } = renderHook(() => useScanConfigTopBarSlots());
    expect(result.current).toEqual({});
  });

  it('puts the host slots on the tab rail and keeps every tab addressable', () => {
    function Panel() {
      return (
        <ScanConfigTabsPanel
          activity="simulate"
          tab={{ __activity: 'simulate', id: 'configuration' }}
          setTab={vi.fn()}
          disableResultsTab={false}
          disableConfigurationTab={false}
          configuration={null}
          results={null}
        />
      );
    }

    render(
      <ScanConfigTopBarProvider
        start={<span>crumbs</span>}
        end={<button type="button">close</button>}
      >
        <Panel />
      </ScanConfigTopBarProvider>
    );

    expect(screen.getByText('crumbs')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'close' })).toBeInTheDocument();
    expect(screen.getByTestId('scan-config-tab-configuration')).toHaveAttribute('role', 'tab');
    expect(screen.getByTestId('scan-config-tab-simulations')).toHaveAttribute('role', 'tab');
  });

  it('draws the host slots as a plain bar where there is no tabs rail', () => {
    render(
      <ScanConfigTopBarProvider
        start={<span>crumbs</span>}
        end={<button type="button">close</button>}
      >
        <ScanConfigTopBar />
      </ScanConfigTopBarProvider>
    );

    expect(screen.getByText('crumbs')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'close' })).toBeInTheDocument();
  });
});
